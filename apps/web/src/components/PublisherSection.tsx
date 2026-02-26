import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  apiAssignReviewer,
  apiAssignHandlingEditor,
  apiCreateMedSubmission,
  apiGetMedSubmission,
  apiGetProjectPublisher,
  apiPublishMedSubmission,
  apiSetMedDecision,
  apiSubmitMedSubmission,
  apiSubmitReview,
  type MedProjectPublisherResponse,
  type MedPublisherReview,
  type MedPublisherSubmission,
  type MedPublisherTimelineEvent,
} from "../lib/medPublisherApi";
import { getErrorMessage } from "../lib/errorUtils";
import type { Document } from "../lib/api";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  submitted: "Отправлена",
  under_review: "На рецензировании",
  revision_requested: "Доработка",
  accepted: "Принята",
  rejected: "Отклонена",
  published: "Опубликована",
};

const STAGE_ORDER = [
  { key: "draft_created", label: "Черновик создан" },
  { key: "submitted", label: "Подача в редакцию" },
  { key: "reviewer_assigned", label: "Назначение рецензента" },
  { key: "review_submitted", label: "Рецензия получена" },
  { key: "decision_made", label: "Редакторское решение" },
  { key: "published", label: "Публикация" },
];

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type Props = {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  documents: Document[];
};

export default function PublisherSection({
  projectId,
  projectName,
  projectDescription,
  documents,
}: Props) {
  const [data, setData] = useState<MedProjectPublisherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    submission: MedPublisherSubmission | null;
    reviews: MedPublisherReview[];
    timeline: MedPublisherTimelineEvent[];
    access: { isAuthor: boolean; isReviewer: boolean; isEditor: boolean };
  }>({
    submission: null,
    reviews: [],
    timeline: [],
    access: { isAuthor: false, isReviewer: false, isEditor: false },
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [editorEmail, setEditorEmail] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createAbstract, setCreateAbstract] = useState("");
  const [createKeywords, setCreateKeywords] = useState("");
  const [createManuscript, setCreateManuscript] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(
    null,
  );
  const [recommendation, setRecommendation] = useState<
    "accept" | "minor_revision" | "major_revision" | "reject"
  >("accept");
  const [publicComment, setPublicComment] = useState("");
  const [confidentialComment, setConfidentialComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const autofilledRef = useRef(false);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 8000);
    return () => clearTimeout(t);
  }, [ok]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetProjectPublisher(projectId);
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!selectedId) {
      setDetail({
        submission: null,
        reviews: [],
        timeline: [],
        access: { isAuthor: false, isReviewer: false, isEditor: false },
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGetMedSubmission(selectedId);
        if (!cancelled) setDetail(res);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const autofillFromProject = useCallback(() => {
    const sorted = [...documents].sort((a, b) => a.order_index - b.order_index);
    const sections = sorted
      .map(
        (doc, i) =>
          `## ${i + 1}. ${doc.title}\n\n${htmlToPlain(doc.content || "")}`,
      )
      .filter((s) => s.trim().length > 10);

    setCreateTitle(projectName);
    const desc = (projectDescription || "").trim();
    setCreateAbstract(
      desc.length >= 20 ? desc : `Научная работа «${projectName}».`,
    );
    setCreateManuscript(
      sections.join("\n\n---\n\n").slice(0, 200000) ||
        `Материал из проекта «${projectName}».`,
    );
    setShowCreate(true);
  }, [documents, projectName, projectDescription]);

  useEffect(() => {
    if (autofilledRef.current) return;
    if (!data) return;
    if (data.submissions.length === 0) {
      autofilledRef.current = true;
      autofillFromProject();
    }
  }, [data, autofillFromProject]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setError(null);
    try {
      const res = await apiCreateMedSubmission({
        title: createTitle,
        abstract: createAbstract,
        keywords: createKeywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        manuscript: createManuscript || null,
        projectId,
      });
      setOk(`Рукопись "${res.submission.title}" создана`);
      setSelectedId(res.submission.id);
      setShowCreate(false);
      setCreateTitle("");
      setCreateAbstract("");
      setCreateKeywords("");
      setCreateManuscript("");
      await reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreateSaving(false);
    }
  };

  const withAction = async (task: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try {
      await task();
      await reload();
      if (selectedId) {
        const res = await apiGetMedSubmission(selectedId);
        setDetail(res);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const submissions = data?.submissions ?? [];
  const reviewAssignments = data?.reviewAssignments ?? [];
  const editorRole = data?.editorRole;
  const canAssignEditor = isValidEmail(editorEmail);
  const canAssignReviewer = isValidEmail(reviewerEmail);
  const sel = detail.submission;
  const isTerminal = sel?.status === "published" || sel?.status === "rejected";
  const isHandlingEditor =
    detail.access.isEditor && Boolean(sel?.handling_editor_id);

  const doneSet = useMemo(
    () => new Set(detail.timeline.map((ev) => ev.event_type)),
    [detail.timeline],
  );

  if (loading && !data) {
    return <div className="muted">Загрузка данных издательства...</div>;
  }

  return (
    <div className="publisher-section">
      {error && <div className="alert">{error}</div>}
      {ok && <div className="ok">{ok}</div>}

      <div className="row space mb-4">
        <h5>Издательство — полный цикл публикации</h5>
        <button
          className="btn"
          type="button"
          onClick={() => {
            autofillFromProject();
          }}
        >
          + Создать рукопись из проекта
        </button>
      </div>

      <p className="muted mb-4">
        Здесь вы можете подать текст из проекта на рассмотрение в издательство,
        отслеживать рецензирование и публикацию — все этапы от черновика до
        выхода статьи.
      </p>

      {showCreate && (
        <div className="search-form-card mb-4">
          <h5>Новая рукопись</h5>
          <form className="stack" onSubmit={handleCreate}>
            <label className="stack">
              <span>Название</span>
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="stack">
              <span>Аннотация</span>
              <textarea
                value={createAbstract}
                onChange={(e) => setCreateAbstract(e.target.value)}
                rows={4}
                required
                minLength={20}
              />
            </label>
            <label className="stack">
              <span>Ключевые слова (через запятую)</span>
              <input
                value={createKeywords}
                onChange={(e) => setCreateKeywords(e.target.value)}
                placeholder="мета-анализ, клиническое исследование"
              />
            </label>
            <label className="stack">
              <span>Текст рукописи</span>
              <textarea
                value={createManuscript}
                onChange={(e) => setCreateManuscript(e.target.value)}
                rows={10}
              />
            </label>
            <div className="row gap">
              <button className="btn" type="submit" disabled={createSaving}>
                {createSaving ? "Сохранение..." : "Сохранить черновик"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {submissions.length === 0 && !showCreate ? (
        <div className="muted">
          Пока нет подач в издательство. Нажмите «Создать рукопись из проекта»,
          чтобы собрать черновик из документов этого проекта.
        </div>
      ) : null}

      {submissions.length > 0 && (
        <>
          <div className="row gap mb-4 publisher-submissions-row">
            {submissions.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`btn ${selectedId === sub.id ? "" : "secondary"}`}
                onClick={() => setSelectedId(sub.id)}
              >
                {sub.title.slice(0, 40)}
                {sub.title.length > 40 ? "..." : ""} ·{" "}
                {STATUS_LABELS[sub.status] || sub.status}
              </button>
            ))}
          </div>

          {sel && (
            <div className="publisher-detail">
              <div className="search-form-card mb-4">
                <h5>{sel.title}</h5>
                <p>{sel.abstract || "Аннотация не заполнена."}</p>
                <div className="row gap publisher-submissions-row">
                  <span>
                    <strong>Статус:</strong>{" "}
                    {STATUS_LABELS[sel.status] || sel.status}
                  </span>
                  <span>
                    <strong>Рецензии:</strong> {sel.reviewers_completed ?? 0}/
                    {sel.reviewers_total ?? 0}
                  </span>
                  <span>
                    <strong>Редактор:</strong>{" "}
                    {sel.handling_editor_email || "не назначен"}
                  </span>
                  <span>
                    <strong>Автор:</strong> {sel.author_email || "—"}
                  </span>
                </div>
              </div>

              <div className="publisher-stages mb-4">
                <h5 className="mb-3">Этапы публикации</h5>
                <div className="row gap publisher-submissions-row">
                  {STAGE_ORDER.map((stage, i) => {
                    const done = doneSet.has(stage.key);
                    return (
                      <div
                        key={stage.key}
                        className={`publisher-stage-card ${done ? "publisher-stage-done" : ""}`}
                      >
                        <div className="publisher-stage-number">{i + 1}</div>
                        <div className="publisher-stage-label">
                          {stage.label}
                        </div>
                        <div className="publisher-stage-status">
                          {done ? "✓ Завершено" : "Ожидает"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {detail.timeline.length > 0 && (
                <div className="search-form-card mb-4">
                  <h5>Таймлайн</h5>
                  <div className="stack">
                    {detail.timeline.map((ev) => (
                      <div
                        key={String(ev.id)}
                        className="row gap publisher-timeline-row"
                      >
                        <span className="publisher-timeline-dot" />
                        <div>
                          <strong>{ev.event_label}</strong>
                          <div className="muted publisher-timeline-meta">
                            {fmtDate(ev.created_at)} ·{" "}
                            {ev.actor_email || ev.actor_role || "system"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isTerminal && (
                <div className="search-form-card mb-4">
                  <h5>Действия</h5>
                  <div className="stack">
                    {(sel.status === "draft" ||
                      sel.status === "revision_requested") && (
                      <button
                        className="btn"
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          withAction(async () => {
                            await apiSubmitMedSubmission(sel.id);
                            setOk("Рукопись отправлена в редакцию");
                          })
                        }
                      >
                        Отправить в редакцию
                      </button>
                    )}

                    {editorRole === "chief_editor" && (
                      <div className="row gap">
                        <input
                          value={editorEmail}
                          onChange={(e) => setEditorEmail(e.target.value)}
                          placeholder="email редактора для назначения"
                          className="publisher-action-input"
                        />
                        <button
                          className="btn secondary"
                          type="button"
                          disabled={actionLoading || !canAssignEditor}
                          onClick={() =>
                            withAction(async () => {
                              await apiAssignHandlingEditor(
                                sel.id,
                                editorEmail.trim(),
                              );
                              setEditorEmail("");
                              setOk("Ответственный редактор назначен");
                            })
                          }
                        >
                          Назначить редактора
                        </button>
                      </div>
                    )}

                    {isHandlingEditor && !isTerminal && (
                      <div className="row gap">
                        <input
                          value={reviewerEmail}
                          onChange={(e) => setReviewerEmail(e.target.value)}
                          placeholder="email рецензента"
                          className="publisher-action-input"
                        />
                        <button
                          className="btn secondary"
                          type="button"
                          disabled={actionLoading || !canAssignReviewer}
                          onClick={() =>
                            withAction(async () => {
                              await apiAssignReviewer(
                                sel.id,
                                reviewerEmail.trim(),
                              );
                              setReviewerEmail("");
                              setOk("Рецензент назначен");
                            })
                          }
                        >
                          Назначить рецензента
                        </button>
                      </div>
                    )}

                    {isHandlingEditor && (
                      <>
                        <textarea
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          placeholder="Комментарий к решению редакции"
                          rows={2}
                        />
                        <div className="row gap">
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={actionLoading}
                            onClick={() =>
                              withAction(async () => {
                                await apiSetMedDecision(sel.id, {
                                  decision: "revision_requested",
                                  note: decisionNote || null,
                                });
                                setDecisionNote("");
                                setOk("Запрошена доработка");
                              })
                            }
                          >
                            Доработка
                          </button>
                          <button
                            className="btn"
                            type="button"
                            disabled={actionLoading}
                            onClick={() =>
                              withAction(async () => {
                                await apiSetMedDecision(sel.id, {
                                  decision: "accepted",
                                  note: decisionNote || null,
                                });
                                setDecisionNote("");
                                setOk("Статья принята");
                              })
                            }
                          >
                            Принять
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={actionLoading}
                            onClick={() =>
                              withAction(async () => {
                                if (
                                  !window.confirm(
                                    "Отклонить рукопись? Это действие повлияет на дальнейший workflow.",
                                  )
                                )
                                  return;
                                await apiSetMedDecision(sel.id, {
                                  decision: "rejected",
                                  note: decisionNote || null,
                                });
                                setDecisionNote("");
                                setOk("Статья отклонена");
                              })
                            }
                          >
                            Отклонить
                          </button>
                        </div>
                        {sel.status === "accepted" && (
                          <button
                            className="btn"
                            type="button"
                            disabled={actionLoading}
                            onClick={() =>
                              withAction(async () => {
                                if (
                                  !window.confirm(
                                    "Опубликовать статью сейчас? После публикации статус станет финальным.",
                                  )
                                )
                                  return;
                                await apiPublishMedSubmission(sel.id);
                                setOk("Статья опубликована!");
                              })
                            }
                          >
                            Опубликовать
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {detail.reviews.length > 0 &&
                (detail.access.isAuthor || isHandlingEditor) && (
                  <div className="search-form-card mb-4">
                    <h5>Рецензии</h5>
                    <div className="stack">
                      {detail.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="search-form-card publisher-review-card"
                        >
                          <div className="row space">
                            <strong>{rev.reviewer_email || "Рецензент"}</strong>
                            <span>
                              {rev.status === "submitted"
                                ? "Отправлена"
                                : "Назначена"}
                            </span>
                          </div>
                          {rev.recommendation && (
                            <p>Рекомендация: {rev.recommendation}</p>
                          )}
                          {rev.public_comment && <p>{rev.public_comment}</p>}
                          <div className="muted publisher-review-meta">
                            {fmtDate(rev.submitted_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </>
      )}

      {/* Removed "Выдать роль редактора" section as per user request */}

      {reviewAssignments.length > 0 && (
        <div className="search-form-card mb-4">
          <h5>Кабинет рецензента</h5>
          <div className="row gap mb-4 publisher-submissions-row">
            {reviewAssignments.map((ra) => (
              <button
                key={ra.submission_id}
                type="button"
                className={`btn ${reviewSubmissionId === ra.submission_id ? "" : "secondary"}`}
                onClick={() => setReviewSubmissionId(ra.submission_id)}
              >
                {ra.title.slice(0, 30)}... ·{" "}
                {ra.review_status === "submitted" ? "отправлена" : "назначена"}
              </button>
            ))}
          </div>
          {reviewSubmissionId && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setReviewSaving(true);
                setError(null);
                try {
                  await apiSubmitReview(reviewSubmissionId, {
                    recommendation,
                    publicComment: publicComment || null,
                    confidentialComment: confidentialComment || null,
                  });
                  setOk("Рецензия отправлена");
                  setPublicComment("");
                  setConfidentialComment("");
                  await reload();
                } catch (err) {
                  setError(getErrorMessage(err));
                } finally {
                  setReviewSaving(false);
                }
              }}
            >
              <label className="stack">
                <span>Рекомендация</span>
                <select
                  value={recommendation}
                  onChange={(e) =>
                    setRecommendation(e.target.value as typeof recommendation)
                  }
                >
                  <option value="accept">Принять</option>
                  <option value="minor_revision">
                    Незначительная доработка
                  </option>
                  <option value="major_revision">Существенная доработка</option>
                  <option value="reject">Отклонить</option>
                </select>
              </label>
              <label className="stack">
                <span>Комментарий автору</span>
                <textarea
                  value={publicComment}
                  onChange={(e) => setPublicComment(e.target.value)}
                  rows={3}
                />
              </label>
              <label className="stack">
                <span>Конфиденциально редакции</span>
                <textarea
                  value={confidentialComment}
                  onChange={(e) => setConfidentialComment(e.target.value)}
                  rows={2}
                />
              </label>
              <button className="btn" type="submit" disabled={reviewSaving}>
                {reviewSaving ? "Отправка..." : "Отправить рецензию"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
