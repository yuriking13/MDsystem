import { apiFetch } from "./api";

export type MedSubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revision_requested"
  | "accepted"
  | "rejected"
  | "published";

export type MedPublisherSubmission = {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string[];
  manuscript: string | null;
  status: MedSubmissionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  decision_at: string | null;
  published_at: string | null;
  handling_editor_id?: string | null;
  handling_editor_email?: string | null;
  author_email?: string | null;
  reviewers_total?: number;
  reviewers_completed?: number;
};

export type MedPublisherReview = {
  id: string;
  submission_id: string;
  reviewer_id: string;
  reviewer_email?: string;
  status: "assigned" | "submitted";
  recommendation:
    | "accept"
    | "minor_revision"
    | "major_revision"
    | "reject"
    | null;
  public_comment: string | null;
  confidential_comment: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

export type MedPublisherTimelineEvent = {
  id: number | string;
  submission_id: string;
  event_type: string;
  event_label: string;
  actor_user_id: string | null;
  actor_role: "author" | "editor" | "reviewer" | "system" | null;
  payload_json: Record<string, unknown>;
  created_at: string;
  actor_email?: string | null;
};

export type MedPublisherDashboardResponse = {
  authoredSubmissions: MedPublisherSubmission[];
  reviewAssignments: Array<
    MedPublisherReview & {
      title: string;
      abstract: string | null;
      keywords: string[];
      status: MedSubmissionStatus;
      submitted_at: string | null;
      review_id: string;
      review_status: "assigned" | "submitted";
    }
  >;
  editorAssignments: MedPublisherSubmission[];
  unassignedForChiefEditor: MedPublisherSubmission[];
  editors: Array<{
    user_id: string;
    email: string;
    role: "editor" | "chief_editor";
    is_active: boolean;
    can_publish: boolean;
    created_at: string;
    updated_at: string;
  }>;
  editorRole: "editor" | "chief_editor" | null;
};

export async function apiGetMedPublisherDashboard(): Promise<MedPublisherDashboardResponse> {
  return apiFetch<MedPublisherDashboardResponse>(
    "/api/med/publisher/dashboard",
  );
}

export async function apiCreateMedSubmission(payload: {
  title: string;
  abstract: string;
  keywords: string[];
  manuscript?: string | null;
}): Promise<{ submission: MedPublisherSubmission }> {
  return apiFetch<{ submission: MedPublisherSubmission }>(
    "/api/med/publisher/submissions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function apiGrantEditorRole(editorEmail: string): Promise<{
  editor: {
    user_id: string;
    role: "editor" | "chief_editor";
    is_active: boolean;
    can_publish: boolean;
    created_at: string;
    updated_at: string;
  };
  email: string;
}> {
  return apiFetch<{
    editor: {
      user_id: string;
      role: "editor" | "chief_editor";
      is_active: boolean;
      can_publish: boolean;
      created_at: string;
      updated_at: string;
    };
    email: string;
  }>("/api/med/publisher/editors", {
    method: "POST",
    body: JSON.stringify({ editorEmail }),
  });
}

export async function apiAssignHandlingEditor(
  submissionId: string,
  editorEmail: string,
): Promise<{ submission: MedPublisherSubmission }> {
  return apiFetch<{ submission: MedPublisherSubmission }>(
    `/api/med/publisher/submissions/${submissionId}/assign-editor`,
    {
      method: "POST",
      body: JSON.stringify({ editorEmail }),
    },
  );
}

export async function apiSubmitMedSubmission(
  submissionId: string,
): Promise<{ submission: MedPublisherSubmission; reviewersTotal: number }> {
  return apiFetch<{
    submission: MedPublisherSubmission;
    reviewersTotal: number;
  }>(`/api/med/publisher/submissions/${submissionId}/submit`, {
    method: "POST",
  });
}

export async function apiAssignReviewer(
  submissionId: string,
  reviewerEmail: string,
): Promise<{ review: MedPublisherReview; submission: MedPublisherSubmission }> {
  return apiFetch<{
    review: MedPublisherReview;
    submission: MedPublisherSubmission;
  }>(`/api/med/publisher/submissions/${submissionId}/reviewers`, {
    method: "POST",
    body: JSON.stringify({ reviewerEmail }),
  });
}

export async function apiSubmitReview(
  submissionId: string,
  payload: {
    recommendation: "accept" | "minor_revision" | "major_revision" | "reject";
    publicComment?: string | null;
    confidentialComment?: string | null;
  },
): Promise<{ review: MedPublisherReview }> {
  return apiFetch<{ review: MedPublisherReview }>(
    `/api/med/publisher/submissions/${submissionId}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function apiSetMedDecision(
  submissionId: string,
  payload: {
    decision: "revision_requested" | "accepted" | "rejected";
    note?: string | null;
  },
): Promise<{ submission: MedPublisherSubmission }> {
  return apiFetch<{ submission: MedPublisherSubmission }>(
    `/api/med/publisher/submissions/${submissionId}/decision`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function apiPublishMedSubmission(
  submissionId: string,
): Promise<{ submission: MedPublisherSubmission }> {
  return apiFetch<{ submission: MedPublisherSubmission }>(
    `/api/med/publisher/submissions/${submissionId}/publish`,
    {
      method: "POST",
    },
  );
}

export async function apiGetMedSubmission(submissionId: string): Promise<{
  submission: MedPublisherSubmission | null;
  reviews: MedPublisherReview[];
  timeline: MedPublisherTimelineEvent[];
  access: {
    isAuthor: boolean;
    isReviewer: boolean;
    isEditor: boolean;
  };
}> {
  return apiFetch<{
    submission: MedPublisherSubmission | null;
    reviews: MedPublisherReview[];
    timeline: MedPublisherTimelineEvent[];
    access: {
      isAuthor: boolean;
      isReviewer: boolean;
      isEditor: boolean;
    };
  }>(`/api/med/publisher/submissions/${submissionId}`);
}
