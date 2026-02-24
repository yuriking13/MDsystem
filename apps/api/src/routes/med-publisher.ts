import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";

const SubmissionIdSchema = z.object({
  submissionId: z.string().uuid(),
});

const SubmissionStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "revision_requested",
  "accepted",
  "rejected",
  "published",
]);

const DecisionSchema = z.object({
  decision: z.enum(["revision_requested", "accepted", "rejected"]),
  note: z.string().max(5000).optional().nullable(),
});

const CreateSubmissionSchema = z.object({
  title: z.string().min(5).max(500),
  abstract: z.string().min(20).max(20000),
  keywords: z.array(z.string().min(2).max(64)).max(30).optional().default([]),
  manuscript: z.string().max(200000).optional().nullable(),
});

const AssignReviewerSchema = z.object({
  reviewerEmail: z.string().email().max(320),
});

const AssignEditorSchema = z.object({
  editorEmail: z.string().email().max(320),
});

const SubmitReviewSchema = z.object({
  recommendation: z.enum([
    "accept",
    "minor_revision",
    "major_revision",
    "reject",
  ]),
  publicComment: z.string().max(10000).optional().nullable(),
  confidentialComment: z.string().max(10000).optional().nullable(),
});

type SqlClient = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }>;
};

type EditorRole = "editor" | "chief_editor";

type EditorProfile = {
  userId: string;
  role: EditorRole;
  isActive: boolean;
  canPublish: boolean;
};

function isChiefEditor(profile: EditorProfile | null): boolean {
  return profile?.role === "chief_editor";
}

function normalizeKeywords(rawKeywords: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawKeyword of rawKeywords) {
    const keyword = rawKeyword.trim();
    if (!keyword) continue;
    const dedupeKey = keyword.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(keyword);
  }

  return normalized.slice(0, 30);
}

function decisionLabel(
  decision: z.infer<typeof DecisionSchema>["decision"],
): string {
  if (decision === "accepted") return "Решение редакции: статья принята";
  if (decision === "rejected") return "Решение редакции: статья отклонена";
  return "Решение редакции: требуется доработка";
}

async function appendTimelineEvent(
  client: SqlClient,
  data: {
    submissionId: string;
    eventType: string;
    eventLabel: string;
    actorUserId: string | null;
    actorRole: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO med_publisher_timeline_events
      (submission_id, event_type, event_label, actor_user_id, actor_role, payload_json)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      data.submissionId,
      data.eventType,
      data.eventLabel,
      data.actorUserId,
      data.actorRole,
      JSON.stringify(data.payload ?? {}),
    ],
  );
}

async function getSubmissionAccess(
  submissionId: string,
  userId: string,
): Promise<{
  exists: boolean;
  isAuthor: boolean;
  isReviewer: boolean;
  isHandlingEditor: boolean;
} | null> {
  const accessRes = await pool.query(
    `SELECT s.created_by,
            s.handling_editor_id,
            EXISTS (
              SELECT 1
              FROM med_publisher_reviews r
              WHERE r.submission_id = s.id
                AND r.reviewer_id = $2
            ) AS is_reviewer
     FROM med_publisher_submissions s
     WHERE s.id = $1`,
    [submissionId, userId],
  );

  if (accessRes.rowCount === 0) return null;
  const row = accessRes.rows[0] as {
    created_by: string;
    handling_editor_id: string | null;
    is_reviewer: boolean;
  };
  return {
    exists: true,
    isAuthor: row.created_by === userId,
    isReviewer: Boolean(row.is_reviewer),
    isHandlingEditor: row.handling_editor_id === userId,
  };
}

async function getEditorProfile(userId: string): Promise<EditorProfile | null> {
  const result = await pool.query(
    `SELECT user_id, role, is_active, can_publish
     FROM med_publisher_editors
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0] as {
    user_id: string;
    role: EditorRole;
    is_active: boolean;
    can_publish: boolean;
  };

  if (!row.is_active) return null;
  return {
    userId: row.user_id,
    role: row.role,
    isActive: row.is_active,
    canPublish: row.can_publish,
  };
}

async function requireEditorProfile(
  reply: { code: (status: number) => { send: (payload: unknown) => unknown } },
  userId: string,
): Promise<EditorProfile | null> {
  const profile = await getEditorProfile(userId);
  if (!profile) {
    reply.code(403).send({
      error: "Forbidden",
      message: "Publisher editor role is required",
    });
    return null;
  }
  return profile;
}

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/med/publisher/dashboard",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = getUserId(request);

      const [authoredSubmissionsRes, reviewAssignmentsRes] = await Promise.all([
        pool.query(
          `SELECT s.*,
                  COUNT(r.id)::int AS reviewers_total,
                  COUNT(*) FILTER (WHERE r.status = 'submitted')::int AS reviewers_completed
           FROM med_publisher_submissions s
           LEFT JOIN med_publisher_reviews r ON r.submission_id = s.id
           WHERE s.created_by = $1
           GROUP BY s.id
           ORDER BY s.updated_at DESC`,
          [userId],
        ),
        pool.query(
          `SELECT r.id AS review_id,
                  r.submission_id,
                  r.status AS review_status,
                  r.recommendation,
                  r.public_comment,
                  r.confidential_comment,
                  r.submitted_at AS review_submitted_at,
                  r.created_at AS review_created_at,
                  s.id,
                  s.title,
                  s.abstract,
                  s.keywords,
                  s.status,
                  s.created_at,
                  s.updated_at,
                  s.submitted_at
           FROM med_publisher_reviews r
           JOIN med_publisher_submissions s ON s.id = r.submission_id
           WHERE r.reviewer_id = $1
           ORDER BY COALESCE(r.submitted_at, r.created_at) DESC`,
          [userId],
        ),
      ]);

      const editorProfile = await getEditorProfile(userId);
      const assignedAsEditorRes = editorProfile
        ? await pool.query(
            `SELECT s.*,
                    author.email AS author_email,
                    COUNT(r.id)::int AS reviewers_total,
                    COUNT(*) FILTER (WHERE r.status = 'submitted')::int AS reviewers_completed
             FROM med_publisher_submissions s
             LEFT JOIN med_publisher_reviews r ON r.submission_id = s.id
             LEFT JOIN users author ON author.id = s.created_by
             WHERE s.handling_editor_id = $1
             GROUP BY s.id, author.email
             ORDER BY s.updated_at DESC`,
            [userId],
          )
        : { rows: [] as Record<string, unknown>[] };

      const unassignedForChiefRes =
        isChiefEditor(editorProfile) &&
        (await pool.query(
          `SELECT s.*,
                  author.email AS author_email
           FROM med_publisher_submissions s
           LEFT JOIN users author ON author.id = s.created_by
           WHERE s.handling_editor_id IS NULL
             AND s.status IN ('submitted', 'under_review', 'revision_requested', 'accepted')
           ORDER BY s.updated_at DESC`,
        ));

      const editorsRes =
        isChiefEditor(editorProfile) &&
        (await pool.query(
          `SELECT e.user_id,
                  e.role,
                  e.is_active,
                  e.can_publish,
                  e.created_at,
                  e.updated_at,
                  u.email
           FROM med_publisher_editors e
           JOIN users u ON u.id = e.user_id
           ORDER BY e.role DESC, e.created_at ASC`,
        ));

      return {
        authoredSubmissions: authoredSubmissionsRes.rows,
        reviewAssignments: reviewAssignmentsRes.rows,
        editorAssignments: assignedAsEditorRes.rows,
        unassignedForChiefEditor: unassignedForChiefRes
          ? unassignedForChiefRes.rows
          : [],
        editors: editorsRes ? editorsRes.rows : [],
        editorRole: editorProfile?.role ?? null,
      };
    },
  );

  fastify.post(
    "/med/publisher/submissions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const bodyParse = CreateSubmissionSchema.safeParse(request.body);
      if (!bodyParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: bodyParse.error.message,
        });
      }

      const keywords = normalizeKeywords(bodyParse.data.keywords);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const createdRes = await client.query(
          `INSERT INTO med_publisher_submissions
            (title, abstract, keywords, manuscript, created_by, status)
           VALUES ($1, $2, $3, $4, $5, 'draft')
           RETURNING *`,
          [
            bodyParse.data.title.trim(),
            bodyParse.data.abstract.trim(),
            keywords,
            bodyParse.data.manuscript?.trim() || null,
            userId,
          ],
        );

        const submission = createdRes.rows[0];
        await appendTimelineEvent(client as unknown as SqlClient, {
          submissionId: String(submission.id),
          eventType: "draft_created",
          eventLabel: "Черновик рукописи создан",
          actorUserId: userId,
          actorRole: "author",
          payload: {
            title: String(submission.title),
          },
        });

        await client.query("COMMIT");
        return { submission };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  fastify.get(
    "/med/publisher/submissions/:submissionId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsParse = SubmissionIdSchema.safeParse(request.params);
      if (!paramsParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid submission ID",
        });
      }

      const access = await getSubmissionAccess(
        paramsParse.data.submissionId,
        userId,
      );
      if (!access?.exists) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Submission not found",
        });
      }

      if (!access.isAuthor && !access.isReviewer) {
        const editorProfile = await getEditorProfile(userId);
        const hasEditorAccess = Boolean(
          editorProfile?.isActive && access.isHandlingEditor,
        );
        if (!hasEditorAccess) {
          return reply.code(403).send({
            error: "Forbidden",
            message: "No access to this submission",
          });
        }
      }

      const editorProfile = await getEditorProfile(userId);
      const isEditorViewer = Boolean(
        editorProfile?.isActive && access.isHandlingEditor,
      );

      const [submissionRes, reviewsRes, timelineRes] = await Promise.all([
        pool.query(
          `SELECT s.*,
                  handling.email AS handling_editor_email,
                  COUNT(r.id)::int AS reviewers_total,
                  COUNT(*) FILTER (WHERE r.status = 'submitted')::int AS reviewers_completed
           FROM med_publisher_submissions s
           LEFT JOIN med_publisher_reviews r ON r.submission_id = s.id
           LEFT JOIN users handling ON handling.id = s.handling_editor_id
           WHERE s.id = $1
           GROUP BY s.id, handling.email`,
          [paramsParse.data.submissionId],
        ),
        pool.query(
          `SELECT r.id,
                  r.submission_id,
                  r.reviewer_id,
                  u.email AS reviewer_email,
                  r.status,
                  r.recommendation,
                  r.public_comment,
                  CASE
                    WHEN (
                      $2 = r.reviewer_id
                      OR ($3 = true AND $2 = s.handling_editor_id)
                    ) THEN r.confidential_comment
                    ELSE NULL
                  END AS confidential_comment,
                  r.created_at,
                  r.updated_at,
                  r.submitted_at
           FROM med_publisher_reviews r
           JOIN users u ON u.id = r.reviewer_id
           JOIN med_publisher_submissions s ON s.id = r.submission_id
           WHERE r.submission_id = $1
           ORDER BY r.created_at ASC`,
          [paramsParse.data.submissionId, userId, isEditorViewer],
        ),
        pool.query(
          `SELECT e.id,
                  e.submission_id,
                  e.event_type,
                  e.event_label,
                  e.actor_user_id,
                  e.actor_role,
                  e.payload_json,
                  e.created_at,
                  u.email AS actor_email
           FROM med_publisher_timeline_events e
           LEFT JOIN users u ON u.id = e.actor_user_id
           WHERE e.submission_id = $1
           ORDER BY e.created_at ASC, e.id ASC`,
          [paramsParse.data.submissionId],
        ),
      ]);

      return {
        submission: submissionRes.rows[0] ?? null,
        reviews: reviewsRes.rows,
        timeline: timelineRes.rows,
        access: {
          isAuthor: access.isAuthor,
          isReviewer: access.isReviewer,
          isEditor: isEditorViewer,
        },
      };
    },
  );

  fastify.post(
    "/med/publisher/submissions/:submissionId/assign-editor",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const profile = await requireEditorProfile(reply, userId);
      if (!profile) return;
      if (profile.role !== "chief_editor") {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only chief editor can assign handling editors",
        });
      }

      const paramsParse = SubmissionIdSchema.safeParse(request.params);
      const bodyParse = AssignEditorSchema.safeParse(request.body);
      if (!paramsParse.success || !bodyParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid request payload",
        });
      }

      const targetEditorUserRes = await pool.query(
        "SELECT id, email FROM users WHERE lower(email) = lower($1) LIMIT 1",
        [bodyParse.data.editorEmail.trim()],
      );
      if (targetEditorUserRes.rowCount === 0) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Editor user not found",
        });
      }

      const targetEditorUserId = String(targetEditorUserRes.rows[0].id);
      const targetEditorEmail = String(targetEditorUserRes.rows[0].email);

      const targetEditorProfileRes = await pool.query(
        `SELECT role, is_active
         FROM med_publisher_editors
         WHERE user_id = $1`,
        [targetEditorUserId],
      );
      if (
        targetEditorProfileRes.rowCount === 0 ||
        !targetEditorProfileRes.rows[0].is_active
      ) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Target user has no active publisher editor role",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const submissionRes = await client.query(
          `UPDATE med_publisher_submissions
           SET handling_editor_id = $2,
               status = CASE
                 WHEN status = 'submitted' THEN 'under_review'
                 ELSE status
               END,
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [paramsParse.data.submissionId, targetEditorUserId],
        );
        if (submissionRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return reply.code(404).send({
            error: "NotFound",
            message: "Submission not found",
          });
        }

        await appendTimelineEvent(client as unknown as SqlClient, {
          submissionId: paramsParse.data.submissionId,
          eventType: "editor_assigned",
          eventLabel: `Назначен ответственный редактор: ${targetEditorEmail}`,
          actorUserId: userId,
          actorRole: "editor",
          payload: {
            editorUserId: targetEditorUserId,
            editorEmail: targetEditorEmail,
          },
        });

        await client.query("COMMIT");
        return {
          submission: submissionRes.rows[0],
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/med/publisher/editors",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const profile = await requireEditorProfile(reply, userId);
      if (!profile) return;
      if (profile.role !== "chief_editor") {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only chief editor can grant editor role",
        });
      }

      const bodyParse = AssignEditorSchema.safeParse(request.body);
      if (!bodyParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid request payload",
        });
      }

      const userRes = await pool.query(
        "SELECT id, email FROM users WHERE lower(email) = lower($1) LIMIT 1",
        [bodyParse.data.editorEmail.trim()],
      );
      if (userRes.rowCount === 0) {
        return reply.code(404).send({
          error: "NotFound",
          message: "User not found",
        });
      }

      const targetUserId = String(userRes.rows[0].id);
      const targetUserEmail = String(userRes.rows[0].email);

      const result = await pool.query(
        `INSERT INTO med_publisher_editors
           (user_id, role, is_active, can_publish, created_by)
         VALUES ($1, 'editor', true, true, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET
           role = EXCLUDED.role,
           is_active = true,
           can_publish = true,
           updated_at = now()
         RETURNING user_id, role, is_active, can_publish, created_at, updated_at`,
        [targetUserId, userId],
      );

      return {
        editor: result.rows[0],
        email: targetUserEmail,
      };
    },
  );

  fastify.post(
    "/med/publisher/submissions/:submissionId/submit",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsParse = SubmissionIdSchema.safeParse(request.params);
      if (!paramsParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid submission ID",
        });
      }

      const access = await getSubmissionAccess(
        paramsParse.data.submissionId,
        userId,
      );
      if (!access?.exists) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Submission not found",
        });
      }
      const editorProfile = await getEditorProfile(userId);
      const canSubmitAsEditor = Boolean(
        editorProfile && access.isHandlingEditor && editorProfile.isActive,
      );
      if (!access.isAuthor && !canSubmitAsEditor) {
        return reply.code(403).send({
          error: "Forbidden",
          message:
            "Only submission author or assigned editor can submit a manuscript",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const statusRes = await client.query(
          `UPDATE med_publisher_submissions
           SET status = 'submitted',
               submitted_at = COALESCE(submitted_at, now()),
               updated_at = now()
           WHERE id = $1
             AND (
               created_by = $2
               OR handling_editor_id = $2
             )
             AND status IN ('draft', 'revision_requested')
           RETURNING *`,
          [paramsParse.data.submissionId, userId],
        );

        if (statusRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return reply.code(400).send({
            error: "BadRequest",
            message: "Submission can only be sent from draft or revision state",
          });
        }

        const reviewersCountRes = await client.query(
          `SELECT COUNT(*)::int AS total
           FROM med_publisher_reviews
           WHERE submission_id = $1`,
          [paramsParse.data.submissionId],
        );
        const reviewersTotal = Number(reviewersCountRes.rows[0]?.total ?? 0);

        let finalSubmission = statusRes.rows[0];
        if (reviewersTotal > 0) {
          const reviewStateRes = await client.query(
            `UPDATE med_publisher_submissions
             SET status = 'under_review',
                 updated_at = now()
             WHERE id = $1
             RETURNING *`,
            [paramsParse.data.submissionId],
          );
          finalSubmission = reviewStateRes.rows[0];
        }

        await appendTimelineEvent(client as unknown as SqlClient, {
          submissionId: paramsParse.data.submissionId,
          eventType: "submitted",
          eventLabel:
            reviewersTotal > 0
              ? "Рукопись отправлена и передана на рецензирование"
              : "Рукопись отправлена в редакцию",
          actorUserId: userId,
          actorRole: access.isAuthor ? "author" : "editor",
          payload: {
            reviewersTotal,
          },
        });

        await client.query("COMMIT");
        return {
          submission: finalSubmission,
          reviewersTotal,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/med/publisher/submissions/:submissionId/reviewers",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsParse = SubmissionIdSchema.safeParse(request.params);
      const bodyParse = AssignReviewerSchema.safeParse(request.body);
      if (!paramsParse.success || !bodyParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid request payload",
        });
      }

      const access = await getSubmissionAccess(
        paramsParse.data.submissionId,
        userId,
      );
      if (!access?.exists) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Submission not found",
        });
      }
      const editorProfile = await getEditorProfile(userId);
      const canManageReviewers = Boolean(
        editorProfile && access.isHandlingEditor && editorProfile.isActive,
      );
      if (!canManageReviewers) {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only assigned editor can assign reviewers",
        });
      }

      const reviewerRes = await pool.query(
        "SELECT id, email FROM users WHERE lower(email) = lower($1) LIMIT 1",
        [bodyParse.data.reviewerEmail.trim()],
      );
      if (reviewerRes.rowCount === 0) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Reviewer user not found",
        });
      }

      const reviewerId = String(reviewerRes.rows[0].id);
      const reviewerEmail = String(reviewerRes.rows[0].email);
      if (reviewerId === userId) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Author cannot assign themselves as reviewer",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const reviewRes = await client.query(
          `INSERT INTO med_publisher_reviews
            (submission_id, reviewer_id, status, recommendation, public_comment, confidential_comment, submitted_at, updated_at)
           VALUES ($1, $2, 'assigned', NULL, NULL, NULL, NULL, now())
           ON CONFLICT (submission_id, reviewer_id)
           DO UPDATE SET
             status = 'assigned',
             recommendation = NULL,
             public_comment = NULL,
             confidential_comment = NULL,
             submitted_at = NULL,
             updated_at = now()
           RETURNING *`,
          [paramsParse.data.submissionId, reviewerId],
        );

        const submissionRes = await client.query(
          `UPDATE med_publisher_submissions
           SET status = 'under_review',
               submitted_at = COALESCE(submitted_at, now()),
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [paramsParse.data.submissionId],
        );

        await appendTimelineEvent(client as unknown as SqlClient, {
          submissionId: paramsParse.data.submissionId,
          eventType: "reviewer_assigned",
          eventLabel: `Назначен рецензент: ${reviewerEmail}`,
          actorUserId: userId,
          actorRole: "editor",
          payload: {
            reviewerId,
            reviewerEmail,
          },
        });

        await client.query("COMMIT");
        return {
          review: reviewRes.rows[0],
          submission: submissionRes.rows[0],
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/med/publisher/submissions/:submissionId/reviews",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsParse = SubmissionIdSchema.safeParse(request.params);
      const bodyParse = SubmitReviewSchema.safeParse(request.body);
      if (!paramsParse.success || !bodyParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid request payload",
        });
      }

      const access = await getSubmissionAccess(
        paramsParse.data.submissionId,
        userId,
      );
      if (!access?.exists) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Submission not found",
        });
      }
      if (!access.isReviewer) {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only assigned reviewer can submit a review",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const reviewRes = await client.query(
          `UPDATE med_publisher_reviews
           SET status = 'submitted',
               recommendation = $3,
               public_comment = $4,
               confidential_comment = $5,
               submitted_at = now(),
               updated_at = now()
           WHERE submission_id = $1
             AND reviewer_id = $2
           RETURNING *`,
          [
            paramsParse.data.submissionId,
            userId,
            bodyParse.data.recommendation,
            bodyParse.data.publicComment?.trim() || null,
            bodyParse.data.confidentialComment?.trim() || null,
          ],
        );

        if (reviewRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return reply.code(404).send({
            error: "NotFound",
            message: "Reviewer assignment not found",
          });
        }

        await client.query(
          `UPDATE med_publisher_submissions
           SET status = 'under_review',
               submitted_at = COALESCE(submitted_at, now()),
               updated_at = now()
           WHERE id = $1`,
          [paramsParse.data.submissionId],
        );

        await appendTimelineEvent(client as unknown as SqlClient, {
          submissionId: paramsParse.data.submissionId,
          eventType: "review_submitted",
          eventLabel: "Рецензия отправлена",
          actorUserId: userId,
          actorRole: "reviewer",
          payload: {
            recommendation: bodyParse.data.recommendation,
          },
        });

        const completionRes = await client.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'submitted')::int AS done
           FROM med_publisher_reviews
           WHERE submission_id = $1`,
          [paramsParse.data.submissionId],
        );

        const total = Number(completionRes.rows[0]?.total ?? 0);
        const done = Number(completionRes.rows[0]?.done ?? 0);
        if (total > 0 && total === done) {
          const alreadyMarkedRes = await client.query(
            `SELECT 1
             FROM med_publisher_timeline_events
             WHERE submission_id = $1
               AND event_type = 'reviews_completed'
             LIMIT 1`,
            [paramsParse.data.submissionId],
          );

          if (alreadyMarkedRes.rowCount === 0) {
            await appendTimelineEvent(client as unknown as SqlClient, {
              submissionId: paramsParse.data.submissionId,
              eventType: "reviews_completed",
              eventLabel: "Все назначенные рецензии получены",
              actorUserId: null,
              actorRole: "system",
              payload: {
                total,
              },
            });
          }
        }

        await client.query("COMMIT");
        return { review: reviewRes.rows[0] };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/med/publisher/submissions/:submissionId/decision",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsParse = SubmissionIdSchema.safeParse(request.params);
      const bodyParse = DecisionSchema.safeParse(request.body);
      if (!paramsParse.success || !bodyParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid request payload",
        });
      }

      const access = await getSubmissionAccess(
        paramsParse.data.submissionId,
        userId,
      );
      if (!access?.exists) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Submission not found",
        });
      }
      const editorProfile = await getEditorProfile(userId);
      const canDecide = Boolean(
        editorProfile && access.isHandlingEditor && editorProfile.isActive,
      );
      if (!canDecide) {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only assigned editor can make editorial decision",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const submissionRes = await client.query(
          `UPDATE med_publisher_submissions
           SET status = $3,
               decision_at = now(),
               published_at = CASE WHEN $3 = 'accepted' THEN published_at ELSE NULL END,
               updated_at = now()
           WHERE id = $1
             AND handling_editor_id = $2
           RETURNING *`,
          [paramsParse.data.submissionId, userId, bodyParse.data.decision],
        );

        if (submissionRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return reply.code(404).send({
            error: "NotFound",
            message: "Submission not found",
          });
        }

        await appendTimelineEvent(client as unknown as SqlClient, {
          submissionId: paramsParse.data.submissionId,
          eventType: "decision_made",
          eventLabel: decisionLabel(bodyParse.data.decision),
          actorUserId: userId,
          actorRole: "editor",
          payload: {
            decision: bodyParse.data.decision,
            note: bodyParse.data.note?.trim() || null,
          },
        });

        await client.query("COMMIT");
        return {
          submission: submissionRes.rows[0],
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  fastify.post(
    "/med/publisher/submissions/:submissionId/publish",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const paramsParse = SubmissionIdSchema.safeParse(request.params);
      if (!paramsParse.success) {
        return reply.code(400).send({
          error: "BadRequest",
          message: "Invalid submission ID",
        });
      }

      const access = await getSubmissionAccess(
        paramsParse.data.submissionId,
        userId,
      );
      if (!access?.exists) {
        return reply.code(404).send({
          error: "NotFound",
          message: "Submission not found",
        });
      }
      const editorProfile = await getEditorProfile(userId);
      const canPublishAsEditor = Boolean(
        editorProfile &&
        access.isHandlingEditor &&
        editorProfile.isActive &&
        editorProfile.canPublish,
      );
      if (!canPublishAsEditor) {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only assigned editor can publish article",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const publishRes = await client.query(
          `UPDATE med_publisher_submissions
           SET status = 'published',
               published_at = now(),
               updated_at = now()
           WHERE id = $1
             AND handling_editor_id = $2
             AND status = 'accepted'
           RETURNING *`,
          [paramsParse.data.submissionId, userId],
        );

        if (publishRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return reply.code(400).send({
            error: "BadRequest",
            message: "Only accepted submissions can be published",
          });
        }

        await appendTimelineEvent(client as unknown as SqlClient, {
          submissionId: paramsParse.data.submissionId,
          eventType: "published",
          eventLabel: "Статья опубликована",
          actorUserId: userId,
          actorRole: "editor",
        });

        await client.query("COMMIT");
        return {
          submission: publishRes.rows[0],
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  fastify.get(
    "/med/publisher/submission-statuses",
    { preHandler: [fastify.authenticate] },
    async () => ({
      statuses: SubmissionStatusSchema.options,
    }),
  );

  fastify.get(
    "/med/publisher/editors",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const profile = await requireEditorProfile(reply, userId);
      if (!profile) return;

      const result = await pool.query(
        `SELECT e.user_id,
                e.role,
                e.is_active,
                e.can_publish,
                e.created_at,
                e.updated_at,
                u.email
         FROM med_publisher_editors e
         JOIN users u ON u.id = e.user_id
         ORDER BY e.role DESC, e.created_at ASC`,
      );

      return {
        editors: result.rows,
      };
    },
  );
};

export default plugin;
