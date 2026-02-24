import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  apiAssignReviewer,
  apiAssignHandlingEditor,
  apiCreateMedSubmission,
  apiGetMedPublisherDashboard,
  apiGetMedSubmission,
  apiGrantEditorRole,
  apiPublishMedSubmission,
  apiSetMedDecision,
  apiSubmitMedSubmission,
  apiSubmitReview,
  type MedPublisherDashboardResponse,
  type MedPublisherReview,
  type MedPublisherSubmission,
  type MedPublisherTimelineEvent,
} from "../../lib/medPublisherApi";
import { getErrorMessage } from "../../types";
import { getScienceMainHref } from "../../lib/scienceDomains";
import { ScienceDisciplinePlaceholderContent } from "../science/ScienceDisciplinePlaceholderPage";
import { useAuth } from "../../lib/AuthContext";

type PublisherTab = "overview" | "submissions" | "tracking" | "reviewer";

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  submitted: "Отправлена",
  under_review: "На рецензировании",
  revision_requested: "Доработка",
  accepted: "Принята",
  rejected: "Отклонена",
  published: "Опубликована",
};

const PREVIEW_TIMELINE: MedPublisherTimelineEvent[] = [
  {
    id: "preview-1",
    submission_id: "preview",
    event_type: "draft_created",
    event_label: "Черновик рукописи создан",
    actor_user_id: null,
    actor_role: "author",
    payload_json: {},
    created_at: new Date().toISOString(),
    actor_email: "author@preview.local",
  },
  {
    id: "preview-2",
    submission_id: "preview",
    event_type: "submitted",
    event_label: "Рукопись отправлена в редакцию",
    actor_user_id: null,
    actor_role: "author",
    payload_json: {},
    created_at: new Date(Date.now() + 1000).toISOString(),
    actor_email: "author@preview.local",
  },
  {
    id: "preview-3",
    submission_id: "preview",
    event_type: "reviewer_assigned",
    event_label: "Назначен рецензент",
    actor_user_id: null,
    actor_role: "system",
    payload_json: {},
    created_at: new Date(Date.now() + 2000).toISOString(),
    actor_email: "editor@preview.local",
  },
  {
    id: "preview-4",
    submission_id: "preview",
    event_type: "review_submitted",
    event_label: "Рецензия отправлена",
    actor_user_id: null,
    actor_role: "reviewer",
    payload_json: {},
    created_at: new Date(Date.now() + 3000).toISOString(),
    actor_email: "reviewer@preview.local",
  },
  {
    id: "preview-5",
    submission_id: "preview",
    event_type: "decision_made",
    event_label: "Решение редакции: статья принята",
    actor_user_id: null,
    actor_role: "author",
    payload_json: {},
    created_at: new Date(Date.now() + 4000).toISOString(),
    actor_email: "editor@preview.local",
  },
  {
    id: "preview-6",
    submission_id: "preview",
    event_type: "published",
    event_label: "Статья опубликована",
    actor_user_id: null,
    actor_role: "author",
    payload_json: {},
    created_at: new Date(Date.now() + 5000).toISOString(),
    actor_email: "publisher@preview.local",
  },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function canPublish(submission: MedPublisherSubmission | null): boolean {
  return Boolean(submission && submission.status === "accepted");
}

function Timeline({
  events,
  title,
}: {
  events: MedPublisherTimelineEvent[];
  title: string;
}) {
  return (
    <section className="public-section">
      <div className="public-section-header">
        <h2>{title}</h2>
        <p>История процесса рецензирования и публикации.</p>
      </div>

      <div className="med-timeline">
        {events.length === 0 ? (
          <article className="public-card">
            <p>Событий пока нет.</p>
          </article>
        ) : (
          events.map((event) => (
            <article
              key={String(event.id)}
              className="public-card med-timeline-item"
            >
              <div className="med-timeline-dot" />
              <div>
                <p className="med-timeline-label">{event.event_label}</p>
                <p>
                  {formatDate(event.created_at)} ·{" "}
                  {event.actor_email
                    ? event.actor_email
                    : event.actor_role || "system"}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function StageOverview({
  timeline,
}: {
  timeline: MedPublisherTimelineEvent[];
}) {
  const stageOrder = [
    { key: "draft_created", label: "Черновик создан" },
    { key: "submitted", label: "Подача в редакцию" },
    { key: "reviewer_assigned", label: "Назначение рецензента" },
    { key: "review_submitted", label: "Рецензия получена" },
    { key: "decision_made", label: "Редакторское решение" },
    { key: "published", label: "Публикация" },
  ];

  const doneSet = new Set(timeline.map((item) => item.event_type));

  return (
    <section className="public-section">
      <div className="public-section-header">
        <h2>Этапы публикации</h2>
        <p>Визуальный статус прогресса по ключевым шагам workflow.</p>
      </div>
      <div className="med-stage-grid">
        {stageOrder.map((stage, index) => {
          const done = doneSet.has(stage.key);
          return (
            <article
              key={stage.key}
              className={`public-card med-stage-card ${done ? "med-stage-card-done" : ""}`}
            >
              <p className="med-stage-index">{index + 1}</p>
              <h3>{stage.label}</h3>
              <p>{done ? "Этап завершен" : "Ожидает выполнения"}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SubmissionCreateForm({
  onCreated,
}: {
  onCreated: (submission: MedPublisherSubmission) => void;
}) {
  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [manuscript, setManuscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await apiCreateMedSubmission({
        title,
        abstract: abstractText,
        keywords: keywords
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        manuscript: manuscript || null,
      });
      onCreated(response.submission);
      setTitle("");
      setAbstractText("");
      setKeywords("");
      setManuscript("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="public-card">
      <h3>Создать рукопись</h3>
      <p>Форма автора до входа в рабочий контур проекта.</p>

      {error ? <p className="med-error">{error}</p> : null}

      <form className="med-form" onSubmit={onSubmit}>
        <label className="form-label">
          <span className="form-label-text">Название</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="form-input"
            required
            minLength={5}
            maxLength={500}
          />
        </label>

        <label className="form-label">
          <span className="form-label-text">Аннотация</span>
          <textarea
            value={abstractText}
            onChange={(event) => setAbstractText(event.target.value)}
            className="form-input form-textarea"
            rows={6}
            required
            minLength={20}
          />
        </label>

        <label className="form-label">
          <span className="form-label-text">
            Ключевые слова (через запятую)
          </span>
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            className="form-input"
            placeholder="мета-анализ, клиническое исследование"
          />
        </label>

        <label className="form-label">
          <span className="form-label-text">Рукопись (черновой текст)</span>
          <textarea
            value={manuscript}
            onChange={(event) => setManuscript(event.target.value)}
            className="form-input form-textarea"
            rows={8}
          />
        </label>

        <div className="public-hero-actions">
          <button className="public-btn" type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить черновик"}
          </button>
        </div>
      </form>
    </article>
  );
}

function SubmissionList({
  submissions,
  authoredSubmissionIds,
  editorSubmissionIds,
  selectedId,
  onSelect,
  onReload,
  canSubmit,
  canManageEditorActions,
}: {
  submissions: MedPublisherSubmission[];
  authoredSubmissionIds: string[];
  editorSubmissionIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReload: () => Promise<void>;
  canSubmit: boolean;
  canManageEditorActions: boolean;
}) {
  const [actionState, setActionState] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const selected = submissions.find((item) => item.id === selectedId) ?? null;
  const authoredIdSet = useMemo(
    () => new Set(authoredSubmissionIds),
    [authoredSubmissionIds],
  );
  const editorIdSet = useMemo(
    () => new Set(editorSubmissionIds),
    [editorSubmissionIds],
  );

  const withReload = async (task: () => Promise<void>) => {
    setActionState({ loading: true, error: null });
    try {
      await task();
      await onReload();
    } catch (error) {
      setActionState({ loading: false, error: getErrorMessage(error) });
      return;
    }
    setActionState({ loading: false, error: null });
  };

  const assignReviewer = async () => {
    if (!canManageEditorActions) return;
    if (!selected || !reviewerEmail.trim()) return;
    await withReload(async () => {
      await apiAssignReviewer(selected.id, reviewerEmail.trim());
      setReviewerEmail("");
    });
  };

  const submitCurrent = async () => {
    if (!selected) return;
    await withReload(async () => {
      await apiSubmitMedSubmission(selected.id);
    });
  };

  const decide = async (
    decision: "revision_requested" | "accepted" | "rejected",
  ) => {
    if (!canManageEditorActions) return;
    if (!selected) return;
    await withReload(async () => {
      await apiSetMedDecision(selected.id, {
        decision,
        note: decisionNote || null,
      });
    });
  };

  const publish = async () => {
    if (!canManageEditorActions) return;
    if (!selected) return;
    await withReload(async () => {
      await apiPublishMedSubmission(selected.id);
    });
  };

  return (
    <section className="public-section">
      <div className="public-section-header">
        <h2>Рукописи в работе</h2>
        <p>Авторские подачи и назначенные вам редакторские рукописи.</p>
      </div>

      <div className="public-grid public-grid-2 med-columns">
        <article className="public-card">
          <h3>Мои рукописи</h3>
          <div className="med-list">
            {submissions.length === 0 ? (
              <p>Список пока пуст.</p>
            ) : (
              submissions.map((submission) => (
                <button
                  type="button"
                  key={submission.id}
                  onClick={() => onSelect(submission.id)}
                  className={`med-list-item ${selected?.id === submission.id ? "med-list-item-active" : ""}`}
                >
                  <strong>{submission.title}</strong>
                  <span>
                    {statusLabels[submission.status] || submission.status} ·
                    обновлена {formatDate(submission.updated_at)}
                  </span>
                  <span>
                    {authoredIdSet.has(submission.id) ? "роль: автор" : null}
                    {authoredIdSet.has(submission.id) &&
                    editorIdSet.has(submission.id)
                      ? " / "
                      : null}
                    {editorIdSet.has(submission.id) ? "роль: редактор" : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="public-card">
          {selected ? (
            <>
              <h3>{selected.title}</h3>
              <p>{selected.abstract || "Аннотация не заполнена."}</p>
              <p>
                <strong>Статус:</strong>{" "}
                {statusLabels[selected.status] || selected.status}
              </p>
              <p>
                <strong>Рецензии:</strong> {selected.reviewers_completed ?? 0}/
                {selected.reviewers_total ?? 0}
              </p>
              {selected.handling_editor_email ? (
                <p>
                  <strong>Ответственный редактор:</strong>{" "}
                  {selected.handling_editor_email}
                </p>
              ) : (
                <p>
                  <strong>Ответственный редактор:</strong> не назначен
                </p>
              )}

              {actionState.error ? (
                <p className="med-error">{actionState.error}</p>
              ) : null}

              <div className="med-actions">
                <button
                  type="button"
                  className="public-btn"
                  onClick={submitCurrent}
                  disabled={actionState.loading || !canSubmit}
                >
                  Отправить в редакцию
                </button>

                <div className="med-inline-control">
                  <input
                    value={reviewerEmail}
                    onChange={(event) => setReviewerEmail(event.target.value)}
                    placeholder="email рецензента"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="public-theme-toggle"
                    onClick={assignReviewer}
                    disabled={
                      actionState.loading ||
                      !reviewerEmail.trim() ||
                      !canManageEditorActions
                    }
                  >
                    Назначить рецензента
                  </button>
                </div>

                <textarea
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  className="form-input form-textarea"
                  rows={3}
                  placeholder="Комментарий к решению редакции"
                />

                <div className="public-hero-actions">
                  <button
                    type="button"
                    className="public-theme-toggle"
                    disabled={actionState.loading || !canManageEditorActions}
                    onClick={() => decide("revision_requested")}
                  >
                    Запросить доработку
                  </button>
                  <button
                    type="button"
                    className="public-theme-toggle"
                    disabled={actionState.loading || !canManageEditorActions}
                    onClick={() => decide("accepted")}
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    className="public-theme-toggle"
                    disabled={actionState.loading || !canManageEditorActions}
                    onClick={() => decide("rejected")}
                  >
                    Отклонить
                  </button>
                  <button
                    type="button"
                    className="public-btn"
                    disabled={
                      actionState.loading ||
                      !canPublish(selected) ||
                      !canManageEditorActions
                    }
                    onClick={publish}
                  >
                    Опубликовать
                  </button>
                </div>

                {!canManageEditorActions ? (
                  <p>
                    Действия редактора (назначение рецензентов, решение,
                    публикация) доступны только пользователю с ролью редактора,
                    назначенному на эту рукопись.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h3>Выберите рукопись</h3>
              <p>
                Откройте элемент слева, чтобы назначить рецензентов и принять
                решение.
              </p>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function ChiefEditorPanel({
  unassignedSubmissions,
  editors,
  onReload,
}: {
  unassignedSubmissions: MedPublisherSubmission[];
  editors: MedPublisherDashboardResponse["editors"];
  onReload: () => Promise<void>;
}) {
  const [grantEmail, setGrantEmail] = useState("");
  const [assignEditorEmail, setAssignEditorEmail] = useState("");
  const [assignSubmissionId, setAssignSubmissionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withState = async (task: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await task();
      await onReload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const grantEditor = async () => {
    if (!grantEmail.trim()) return;
    await withState(async () => {
      await apiGrantEditorRole(grantEmail.trim());
      setGrantEmail("");
    });
  };

  const assignHandlingEditor = async () => {
    if (!assignSubmissionId || !assignEditorEmail.trim()) return;
    await withState(async () => {
      await apiAssignHandlingEditor(
        assignSubmissionId,
        assignEditorEmail.trim(),
      );
      setAssignEditorEmail("");
    });
  };

  return (
    <section className="public-section">
      <div className="public-section-header">
        <h2>Панель chief editor</h2>
        <p>
          Выдача роли редактора и назначение ответственных редакторов по
          подачам.
        </p>
      </div>
      <div className="public-grid public-grid-2 med-columns">
        <article className="public-card">
          <h3>Редакторы издательства</h3>
          {error ? <p className="med-error">{error}</p> : null}
          <div className="med-list">
            {editors.length === 0 ? (
              <p>Редакторы пока не назначены.</p>
            ) : (
              editors.map((editor) => (
                <div key={editor.user_id} className="med-list-item">
                  <strong>{editor.email}</strong>
                  <span>
                    Роль: {editor.role} · публикация:{" "}
                    {editor.can_publish ? "да" : "нет"}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="med-actions">
            <label className="form-label">
              <span className="form-label-text">
                Выдать роль editor по email
              </span>
              <input
                value={grantEmail}
                onChange={(event) => setGrantEmail(event.target.value)}
                className="form-input"
                placeholder="editor@example.com"
              />
            </label>
            <button
              type="button"
              className="public-btn"
              onClick={grantEditor}
              disabled={loading || !grantEmail.trim()}
            >
              Выдать роль editor
            </button>
          </div>
        </article>

        <article className="public-card">
          <h3>Назначить ответственного редактора</h3>
          <div className="med-list">
            {unassignedSubmissions.length === 0 ? (
              <p>Все активные подачи уже распределены.</p>
            ) : (
              unassignedSubmissions.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setAssignSubmissionId(submission.id)}
                  className={`med-list-item ${assignSubmissionId === submission.id ? "med-list-item-active" : ""}`}
                >
                  <strong>{submission.title}</strong>
                  <span>
                    Автор: {submission.author_email || "—"} · статус:{" "}
                    {statusLabels[submission.status] || submission.status}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="med-actions">
            <label className="form-label">
              <span className="form-label-text">Email редактора</span>
              <input
                value={assignEditorEmail}
                onChange={(event) => setAssignEditorEmail(event.target.value)}
                className="form-input"
                placeholder="editor@example.com"
              />
            </label>
            <button
              type="button"
              className="public-btn"
              onClick={assignHandlingEditor}
              disabled={
                loading || !assignSubmissionId || !assignEditorEmail.trim()
              }
            >
              Назначить редактора
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function ReviewerPanel({
  assignments,
  onReload,
}: {
  assignments: MedPublisherDashboardResponse["reviewAssignments"];
  onReload: () => Promise<void>;
}) {
  const [activeReview, setActiveReview] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<
    "accept" | "minor_revision" | "major_revision" | "reject"
  >("accept");
  const [publicComment, setPublicComment] = useState("");
  const [confidentialComment, setConfidentialComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReview = async () => {
    if (!activeReview) return;
    setSaving(true);
    setError(null);
    try {
      await apiSubmitReview(activeReview, {
        recommendation,
        publicComment: publicComment || null,
        confidentialComment: confidentialComment || null,
      });
      setPublicComment("");
      setConfidentialComment("");
      await onReload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="public-section">
      <div className="public-section-header">
        <h2>Кабинет рецензента</h2>
        <p>Рецензент видит назначения, отправляет заключение и комментарии.</p>
      </div>

      <div className="public-grid public-grid-2 med-columns">
        <article className="public-card">
          <h3>Назначенные рукописи</h3>
          <div className="med-list">
            {assignments.length === 0 ? (
              <p>Назначений пока нет.</p>
            ) : (
              assignments.map((item) => (
                <button
                  key={item.submission_id}
                  type="button"
                  className={`med-list-item ${activeReview === item.submission_id ? "med-list-item-active" : ""}`}
                  onClick={() => setActiveReview(item.submission_id)}
                >
                  <strong>{item.title}</strong>
                  <span>
                    Статус статьи: {statusLabels[item.status] || item.status} ·
                    рецензия:{" "}
                    {item.review_status === "submitted"
                      ? "отправлена"
                      : "назначена"}
                  </span>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="public-card">
          <h3>Отправить рецензию</h3>
          {error ? <p className="med-error">{error}</p> : null}
          <label className="form-label">
            <span className="form-label-text">Рекомендация</span>
            <select
              value={recommendation}
              onChange={(event) =>
                setRecommendation(
                  event.target.value as
                    | "accept"
                    | "minor_revision"
                    | "major_revision"
                    | "reject",
                )
              }
              className="form-input"
            >
              <option value="accept">Принять</option>
              <option value="minor_revision">Незначительная доработка</option>
              <option value="major_revision">Существенная доработка</option>
              <option value="reject">Отклонить</option>
            </select>
          </label>
          <label className="form-label">
            <span className="form-label-text">Комментарий автору</span>
            <textarea
              className="form-input form-textarea"
              rows={4}
              value={publicComment}
              onChange={(event) => setPublicComment(event.target.value)}
            />
          </label>
          <label className="form-label">
            <span className="form-label-text">Конфиденциально редакции</span>
            <textarea
              className="form-input form-textarea"
              rows={3}
              value={confidentialComment}
              onChange={(event) => setConfidentialComment(event.target.value)}
            />
          </label>
          <div className="public-hero-actions">
            <button
              type="button"
              className="public-btn"
              disabled={saving || !activeReview}
              onClick={submitReview}
            >
              {saving ? "Отправка..." : "Отправить рецензию"}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function inferTabFromParams(searchParams: URLSearchParams): PublisherTab {
  const raw = searchParams.get("tab");
  if (
    raw === "overview" ||
    raw === "submissions" ||
    raw === "tracking" ||
    raw === "reviewer"
  ) {
    return raw;
  }
  return "overview";
}

export default function MedScienceLandingPage() {
  const medEnabled = true;
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<PublisherTab>(() =>
    inferTabFromParams(searchParams),
  );
  const [dashboard, setDashboard] = useState<MedPublisherDashboardResponse>({
    authoredSubmissions: [],
    reviewAssignments: [],
    editorAssignments: [],
    unassignedForChiefEditor: [],
    editors: [],
    editorRole: null,
  });
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<MedPublisherSubmission | null>(null);
  const [reviews, setReviews] = useState<MedPublisherReview[]>([]);
  const [timeline, setTimeline] = useState<MedPublisherTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedSubmissionIdRef = useRef<string | null>(null);

  const mainScienceHref = useMemo(() => getScienceMainHref("/science"), []);

  useEffect(() => {
    const nextTab = inferTabFromParams(searchParams);
    setTab(nextTab);
  }, [searchParams]);

  const reloadDashboard = useCallback(async () => {
    if (!medEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const nextDashboard = await apiGetMedPublisherDashboard();
      setDashboard(nextDashboard);

      const nextSelectedId =
        selectedSubmissionIdRef.current ??
        nextDashboard.authoredSubmissions[0]?.id ??
        nextDashboard.editorAssignments[0]?.id ??
        nextDashboard.reviewAssignments[0]?.submission_id ??
        null;
      setSelectedSubmissionId(nextSelectedId);

      if (nextSelectedId) {
        const detail = await apiGetMedSubmission(nextSelectedId);
        setSelectedSubmission(detail.submission);
        setReviews(detail.reviews);
        setTimeline(detail.timeline);
      } else {
        setSelectedSubmission(null);
        setReviews([]);
        setTimeline([]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [medEnabled]);

  useEffect(() => {
    selectedSubmissionIdRef.current = selectedSubmissionId;
  }, [selectedSubmissionId]);

  useEffect(() => {
    if (!medEnabled || !token) return;
    void reloadDashboard();
  }, [medEnabled, token, reloadDashboard]);

  useEffect(() => {
    if (!medEnabled || !token) return;
    if (!selectedSubmissionId) return;
    void (async () => {
      try {
        const detail = await apiGetMedSubmission(selectedSubmissionId);
        setSelectedSubmission(detail.submission);
        setReviews(detail.reviews);
        setTimeline(detail.timeline);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, [medEnabled, selectedSubmissionId, token]);

  const selectTab = (nextTab: PublisherTab) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", nextTab);
      return params;
    });
  };

  const isEditor = Boolean(dashboard.editorRole);
  const isChiefEditor = dashboard.editorRole === "chief_editor";
  const editorSubmissionIds = useMemo(
    () => dashboard.editorAssignments.map((item) => item.id),
    [dashboard.editorAssignments],
  );
  const authoredSubmissionIds = useMemo(
    () => dashboard.authoredSubmissions.map((item) => item.id),
    [dashboard.authoredSubmissions],
  );
  const isSelectedInEditorAssignments = Boolean(
    selectedSubmission && editorSubmissionIds.includes(selectedSubmission.id),
  );
  const isSelectedInAuthored = Boolean(
    selectedSubmission && authoredSubmissionIds.includes(selectedSubmission.id),
  );
  const canManageSelectedSubmission = Boolean(
    token &&
    isEditor &&
    selectedSubmission &&
    selectedSubmission.handling_editor_id &&
    isSelectedInEditorAssignments,
  );
  const canSubmitSelectedSubmission = Boolean(
    token &&
    selectedSubmission &&
    (isSelectedInAuthored || isSelectedInEditorAssignments),
  );
  const submissionItems = useMemo(() => {
    const merged = new Map<string, MedPublisherSubmission>();
    for (const item of dashboard.authoredSubmissions) merged.set(item.id, item);
    for (const item of dashboard.editorAssignments) merged.set(item.id, item);
    return Array.from(merged.values());
  }, [dashboard.authoredSubmissions, dashboard.editorAssignments]);

  if (!medEnabled) {
    return (
      <ScienceDisciplinePlaceholderContent
        slug="med"
        code="MED"
        label="Медицина"
        fallbackPath="/med"
      />
    );
  }

  return (
    <div className="public-page science-page">
      <header className="public-header">
        <div className="public-header-inner">
          <a href={mainScienceHref} className="public-brand">
            <img
              src="/logo.svg"
              alt="MDsystem Med"
              className="public-brand-logo"
            />
            <span>MDsystem Med</span>
          </a>
          <div className="public-header-actions">
            <button
              type="button"
              className={`public-theme-toggle ${tab === "overview" ? "med-tab-active" : ""}`}
              onClick={() => selectTab("overview")}
            >
              Обзор
            </button>
            <button
              type="button"
              className={`public-theme-toggle ${tab === "submissions" ? "med-tab-active" : ""}`}
              onClick={() => selectTab("submissions")}
            >
              Издательство
            </button>
            <button
              type="button"
              className={`public-theme-toggle ${tab === "tracking" ? "med-tab-active" : ""}`}
              onClick={() => selectTab("tracking")}
            >
              Трекинг
            </button>
            <button
              type="button"
              className={`public-theme-toggle ${tab === "reviewer" ? "med-tab-active" : ""}`}
              onClick={() => selectTab("reviewer")}
            >
              Рецензент
            </button>
            <Link to="/login" className="public-theme-toggle">
              Войти в проект
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <article className="public-hero-content">
            <span className="public-badge">med.*.ru</span>
            <h1>Медицинский контур с издательским workflow</h1>
            <p>
              Реализован стартовый лендинг направления, подача рукописи,
              назначение рецензентов, принятие решения редакцией и публикация с
              таймлайном этапов.
            </p>
            <div className="public-hero-actions">
              <button
                className="public-btn"
                type="button"
                onClick={() => selectTab("submissions")}
              >
                Открыть издательство
              </button>
              <button
                className="public-btn public-btn-secondary"
                type="button"
                onClick={() => selectTab("tracking")}
              >
                Смотреть таймлайн
              </button>
            </div>
          </article>
          <aside className="public-hero-panel">
            <h3>Что реализовано</h3>
            <ul className="public-list">
              <li>Сторона автора: подача и управление рукописью.</li>
              <li>Сторона редактора: распределение, решения и публикация.</li>
              <li>Сторона рецензента: кабинет с отправкой заключения.</li>
              <li>Таймлайн статусов рецензирования и публикации.</li>
              <li>Бэкенд + БД workflow, совместимый с текущей архитектурой.</li>
            </ul>
          </aside>
        </section>

        {error ? (
          <section className="public-section">
            <article className="public-card">
              <p className="med-error">{error}</p>
            </article>
          </section>
        ) : null}

        {!token ? (
          <section className="public-section">
            <article className="public-card">
              <h3>Режим предпросмотра</h3>
              <p>
                Вы просматриваете публичную часть издательства. Для создания
                подачи, назначения рецензентов и публикации войдите в аккаунт.
              </p>
              <div className="public-hero-actions">
                <Link to="/login" className="public-btn">
                  Войти
                </Link>
                <Link
                  to="/register"
                  className="public-btn public-btn-secondary"
                >
                  Регистрация
                </Link>
              </div>
            </article>
          </section>
        ) : null}

        {loading ? (
          <section className="public-section">
            <article className="public-card">
              <p>Загрузка данных издательства...</p>
            </article>
          </section>
        ) : null}

        {tab === "overview" ? (
          <section className="public-section">
            <div className="public-section-header">
              <h2>Стартовая страница издательства</h2>
              <p>
                Вкладка объединяет вход в авторский и рецензентский контур,
                сохраняя общий стиль проекта.
              </p>
            </div>
            <div className="public-grid public-grid-3">
              <article className="public-card">
                <h3>Подачи автора</h3>
                <p>
                  Всего рукописей:{" "}
                  {token ? dashboard.authoredSubmissions.length : "после входа"}
                </p>
              </article>
              <article className="public-card">
                <h3>Назначения рецензента</h3>
                <p>
                  Активных назначений:{" "}
                  {token ? dashboard.reviewAssignments.length : "после входа"}
                </p>
              </article>
              <article className="public-card">
                <h3>Назначения редактора</h3>
                <p>
                  Активных рукописей:{" "}
                  {token ? dashboard.editorAssignments.length : "после входа"}
                </p>
              </article>
              <article className="public-card">
                <h3>Текущая рукопись</h3>
                <p>
                  {selectedSubmission
                    ? `${selectedSubmission.title} · ${statusLabels[selectedSubmission.status] || selectedSubmission.status}`
                    : "Рукопись не выбрана"}
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {tab === "submissions" ? (
          token ? (
            <>
              {isChiefEditor ? (
                <ChiefEditorPanel
                  unassignedSubmissions={dashboard.unassignedForChiefEditor}
                  editors={dashboard.editors}
                  onReload={reloadDashboard}
                />
              ) : null}

              <SubmissionCreateForm
                onCreated={async (submission) => {
                  setSelectedSubmissionId(submission.id);
                  await reloadDashboard();
                }}
              />
              <SubmissionList
                submissions={submissionItems}
                authoredSubmissionIds={authoredSubmissionIds}
                editorSubmissionIds={editorSubmissionIds}
                selectedId={selectedSubmissionId}
                onSelect={setSelectedSubmissionId}
                onReload={reloadDashboard}
                canSubmit={canSubmitSelectedSubmission}
                canManageEditorActions={canManageSelectedSubmission}
              />
            </>
          ) : (
            <section className="public-section">
              <article className="public-card">
                <h3>Издательство (авторский контур)</h3>
                <p>
                  В этой вкладке после входа доступны: создание рукописи
                  автором, работа редактора (назначения/решения) и
                  рецензирование.
                </p>
              </article>
            </section>
          )
        ) : null}

        {tab === "tracking" ? (
          <>
            <StageOverview timeline={token ? timeline : PREVIEW_TIMELINE} />
            <Timeline
              events={token ? timeline : PREVIEW_TIMELINE}
              title="Отслеживание рецензирования и публикации"
            />
          </>
        ) : null}

        {tab === "reviewer" ? (
          token ? (
            <ReviewerPanel
              assignments={dashboard.reviewAssignments}
              onReload={reloadDashboard}
            />
          ) : (
            <section className="public-section">
              <article className="public-card">
                <h3>Кабинет рецензента</h3>
                <p>
                  После авторизации рецензент получает назначения, оставляет
                  заключение и комментарии в рамках редакционного workflow.
                </p>
              </article>
            </section>
          )
        ) : null}

        {tab === "tracking" && token && reviews.length > 0 ? (
          <section className="public-section">
            <div className="public-section-header">
              <h2>Текущие рецензии</h2>
              <p>Сводка полученных заключений по выбранной рукописи.</p>
            </div>
            <div className="public-grid public-grid-2">
              {reviews.map((review) => (
                <article className="public-card" key={review.id}>
                  <h3>{review.reviewer_email || "Рецензент"}</h3>
                  <p>
                    Статус:{" "}
                    {review.status === "submitted" ? "отправлена" : "назначена"}
                  </p>
                  <p>Рекомендация: {review.recommendation || "ожидается"}</p>
                  <p>Отправлена: {formatDate(review.submitted_at)}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
