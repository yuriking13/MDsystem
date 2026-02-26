import React, { useCallback, useEffect, useState } from "react";
import {
  apiGetMedPublisherDashboard,
  apiSubmitReview,
  apiInviteReviewer,
  apiGetMedSubmission,
  type MedPublisherDashboardResponse,
  type MedPublisherReview,
  type MedPublisherSubmission,
  type MedPublisherTimelineEvent,
} from "../lib/medPublisherApi";
import { getErrorMessage } from "../lib/errorUtils";
import { useAuth } from "../lib/AuthContext";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  submitted: "Отправлена",
  under_review: "На рецензировании",
  revision_requested: "Доработка",
  accepted: "Принята",
  rejected: "Отклонена",
  published: "Опубликована",
};

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

export default function ReviewerDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] =
    useState<MedPublisherDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [detail, setDetail] = useState<{
    submission: MedPublisherSubmission | null;
    reviews: MedPublisherReview[];
    timeline: MedPublisherTimelineEvent[];
  }>({ submission: null, reviews: [], timeline: [] });

  const [recommendation, setRecommendation] = useState<
    "accept" | "minor_revision" | "major_revision" | "reject"
  >("accept");
  const [publicComment, setPublicComment] = useState("");
  const [confidentialComment, setConfidentialComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 8000);
    return () => clearTimeout(t);
  }, [ok]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetMedPublisherDashboard();
      setDashboard(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!selectedSubmissionId) {
      setDetail({ submission: null, reviews: [], timeline: [] });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGetMedSubmission(selectedSubmissionId);
        if (!cancelled) setDetail(res);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSubmissionId]);

  const assignments = dashboard?.reviewAssignments ?? [];

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionId) return;
    setReviewSaving(true);
    setError(null);
    try {
      await apiSubmitReview(selectedSubmissionId, {
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
  };

  const handleInviteReviewer = async () => {
    if (!selectedSubmissionId || !inviteEmail.trim()) return;
    setInviteSaving(true);
    setError(null);
    try {
      await apiInviteReviewer(selectedSubmissionId, inviteEmail.trim());
      setOk("Приглашение отправлено на одобрение главному редактору");
      setInviteEmail("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInviteSaving(false);
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="page-content">
        <div className="muted">Загрузка данных рецензента...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h2>Кабинет рецензента</h2>
      <p className="muted mb-4">
        Здесь отображаются назначенные вам рукописи для рецензирования.
        {user?.email && (
          <>
            {" "}
            Вы вошли как <strong>{user.email}</strong>.
          </>
        )}
      </p>

      {error && <div className="alert">{error}</div>}
      {ok && <div className="ok">{ok}</div>}

      {assignments.length === 0 ? (
        <div className="search-form-card mb-4">
          <p className="muted">Назначений на рецензирование пока нет.</p>
        </div>
      ) : (
        <div className="row gap mb-4 publisher-submissions-row">
          {assignments.map((ra) => (
            <button
              key={ra.submission_id}
              type="button"
              className={`btn ${selectedSubmissionId === ra.submission_id ? "" : "secondary"}`}
              onClick={() => setSelectedSubmissionId(ra.submission_id)}
            >
              {ra.title?.slice(0, 35)}
              {(ra.title?.length ?? 0) > 35 ? "..." : ""} ·{" "}
              {ra.review_status === "submitted" ? "отправлена" : "назначена"}
            </button>
          ))}
        </div>
      )}

      {selectedSubmissionId && detail.submission && (
        <>
          <div className="search-form-card mb-4">
            <h5>{detail.submission.title}</h5>
            <p>{detail.submission.abstract || "Аннотация не заполнена."}</p>
            <div className="row gap publisher-submissions-row">
              <span>
                <strong>Статус:</strong>{" "}
                {STATUS_LABELS[detail.submission.status] ||
                  detail.submission.status}
              </span>
              <span>
                <strong>Редактор:</strong>{" "}
                {detail.submission.handling_editor_email || "не назначен"}
              </span>
              <span>
                <strong>Рецензии:</strong>{" "}
                {detail.submission.reviewers_completed ?? 0}/
                {detail.submission.reviewers_total ?? 0}
              </span>
            </div>
            {detail.submission.manuscript && (
              <details className="mt-4">
                <summary>Показать текст рукописи</summary>
                <pre>
                  {detail.submission.manuscript.slice(0, 5000)}
                  {detail.submission.manuscript.length > 5000
                    ? "\n... (текст сокращён)"
                    : ""}
                </pre>
              </details>
            )}
          </div>

          <div className="search-form-card mb-4">
            <h5>Отправить рецензию</h5>
            <form className="stack" onSubmit={handleSubmitReview}>
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
                  rows={4}
                />
              </label>
              <label className="stack">
                <span>Конфиденциально редакции</span>
                <textarea
                  value={confidentialComment}
                  onChange={(e) => setConfidentialComment(e.target.value)}
                  rows={3}
                />
              </label>
              <button className="btn" type="submit" disabled={reviewSaving}>
                {reviewSaving ? "Отправка..." : "Отправить рецензию"}
              </button>
            </form>
          </div>

          <div className="search-form-card mb-4">
            <h5>Пригласить дополнительного рецензента</h5>
            <p className="muted">
              Приглашение будет отправлено на одобрение главному редактору.
            </p>
            <div className="row gap">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email рецензента"
                className="publisher-action-input"
              />
              <button
                className="btn secondary"
                type="button"
                disabled={inviteSaving || !inviteEmail.trim()}
                onClick={handleInviteReviewer}
              >
                {inviteSaving ? "Отправка..." : "Пригласить"}
              </button>
            </div>
          </div>

          {detail.timeline.length > 0 && (
            <div className="search-form-card mb-4">
              <h5>Таймлайн</h5>
              <div className="stack">
                {detail.timeline.map((ev) => (
                  <div key={String(ev.id)} className="row gap">
                    <span>{fmtDate(ev.created_at)}</span>
                    <strong>{ev.event_label}</strong>
                    <span className="muted">
                      {ev.actor_email || ev.actor_role || "system"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
