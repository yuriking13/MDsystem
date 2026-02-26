import React, { useCallback, useEffect, useState } from "react";
import {
  apiGetMedPublisherDashboard,
  apiAssignHandlingEditor,
  apiAssignReviewer,
  apiSetMedDecision,
  apiPublishMedSubmission,
  apiGrantEditorRole,
  apiGetMedSubmission,
  apiGetPendingInvitations,
  apiResolveReviewerInvitation,
  type MedPublisherDashboardResponse,
  type MedPublisherSubmission,
  type MedPublisherReview,
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

type PendingInvitation = {
  id: string;
  submission_id: string;
  invited_email: string;
  invited_by_email: string;
  submission_title: string;
  status: string;
  created_at: string;
};

export default function ChiefEditorDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] =
    useState<MedPublisherDashboardResponse | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    submission: MedPublisherSubmission | null;
    reviews: MedPublisherReview[];
    timeline: MedPublisherTimelineEvent[];
  }>({ submission: null, reviews: [], timeline: [] });

  const [editorEmail, setEditorEmail] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [grantEmail, setGrantEmail] = useState("");

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 8000);
    return () => clearTimeout(t);
  }, [ok]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, invRes] = await Promise.all([
        apiGetMedPublisherDashboard(),
        apiGetPendingInvitations().catch(() => ({ invitations: [] })),
      ]);
      setDashboard(dashRes);
      setPendingInvitations(invRes.invitations as PendingInvitation[]);
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
    if (!selectedId) {
      setDetail({ submission: null, reviews: [], timeline: [] });
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

  const allSubmissions = [
    ...(dashboard?.editorAssignments ?? []),
    ...(dashboard?.unassignedForChiefEditor ?? []),
    ...(dashboard?.authoredSubmissions ?? []),
  ];
  const uniqueSubmissions = Array.from(
    new Map(allSubmissions.map((s) => [s.id, s])).values(),
  );

  const sel = detail.submission;

  if (loading && !dashboard) {
    return (
      <div className="page-content">
        <div className="muted">Загрузка панели главного редактора...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h2>Панель главного редактора</h2>
      <p className="muted mb-4">
        Управление рукописями, назначение редакторов и рецензентов, одобрение
        приглашений.
        {user?.email && (
          <>
            {" "}
            Вы: <strong>{user.email}</strong>
          </>
        )}
      </p>

      {error && <div className="alert">{error}</div>}
      {ok && <div className="ok">{ok}</div>}

      {pendingInvitations.length > 0 && (
        <div className="search-form-card mb-4">
          <h5>Ожидающие одобрения приглашения рецензентов</h5>
          <div className="stack">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="row gap publisher-submissions-row">
                <span>
                  <strong>{inv.submission_title}</strong> — приглашён{" "}
                  <strong>{inv.invited_email}</strong> (от{" "}
                  {inv.invited_by_email || "—"})
                </span>
                <span className="muted">{fmtDate(inv.created_at)}</span>
                <button
                  className="btn"
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    withAction(async () => {
                      await apiResolveReviewerInvitation(inv.id, "approved");
                      setOk(`Приглашение ${inv.invited_email} одобрено`);
                    })
                  }
                >
                  Одобрить
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    withAction(async () => {
                      await apiResolveReviewerInvitation(inv.id, "rejected");
                      setOk(`Приглашение ${inv.invited_email} отклонено`);
                    })
                  }
                >
                  Отклонить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="search-form-card mb-4">
        <h5>Выдать роль редактора</h5>
        <div className="row gap">
          <input
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="email пользователя"
            className="publisher-action-input"
          />
          <button
            className="btn secondary"
            type="button"
            disabled={actionLoading || !grantEmail.trim()}
            onClick={() =>
              withAction(async () => {
                await apiGrantEditorRole(grantEmail.trim());
                setGrantEmail("");
                setOk("Роль editor выдана");
              })
            }
          >
            Выдать
          </button>
        </div>
      </div>

      {dashboard?.editors && dashboard.editors.length > 0 && (
        <div className="search-form-card mb-4">
          <h5>Редакторы издательства</h5>
          <div className="stack">
            {dashboard.editors.map((ed) => (
              <div key={ed.user_id} className="row gap">
                <strong>{ed.email}</strong>
                <span className="muted">Роль: {ed.role}</span>
                <span className="muted">
                  Публикация: {ed.can_publish ? "да" : "нет"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="search-form-card mb-4">
        <h5>Рукописи ({uniqueSubmissions.length})</h5>
        {uniqueSubmissions.length === 0 ? (
          <p className="muted">Нет рукописей в системе.</p>
        ) : (
          <div className="row gap mb-4 publisher-submissions-row">
            {uniqueSubmissions.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`btn ${selectedId === sub.id ? "" : "secondary"}`}
                onClick={() => setSelectedId(sub.id)}
              >
                {sub.title?.slice(0, 35)}
                {(sub.title?.length ?? 0) > 35 ? "..." : ""} ·{" "}
                {STATUS_LABELS[sub.status] || sub.status}
              </button>
            ))}
          </div>
        )}
      </div>

      {sel && (
        <>
          <div className="search-form-card mb-4">
            <h5>{sel.title}</h5>
            <p>{sel.abstract || "Аннотация не заполнена."}</p>
            <div className="row gap publisher-submissions-row">
              <span>
                <strong>Статус:</strong>{" "}
                {STATUS_LABELS[sel.status] || sel.status}
              </span>
              <span>
                <strong>Автор:</strong> {sel.author_email || "—"}
              </span>
              <span>
                <strong>Редактор:</strong>{" "}
                {sel.handling_editor_email || "не назначен"}
              </span>
              <span>
                <strong>Рецензии:</strong> {sel.reviewers_completed ?? 0}/
                {sel.reviewers_total ?? 0}
              </span>
            </div>
          </div>

          <div className="search-form-card mb-4">
            <h5>Действия</h5>
            <div className="stack">
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
                  disabled={actionLoading || !editorEmail.trim()}
                  onClick={() =>
                    withAction(async () => {
                      await apiAssignHandlingEditor(sel.id, editorEmail.trim());
                      setEditorEmail("");
                      setOk("Ответственный редактор назначен");
                    })
                  }
                >
                  Назначить редактора
                </button>
              </div>

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
                  disabled={actionLoading || !reviewerEmail.trim()}
                  onClick={() =>
                    withAction(async () => {
                      await apiAssignReviewer(sel.id, reviewerEmail.trim());
                      setReviewerEmail("");
                      setOk("Рецензент назначен");
                    })
                  }
                >
                  Назначить рецензента
                </button>
              </div>

              {sel.status === "under_review" && (
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
                          if (!window.confirm("Отклонить рукопись?")) return;
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
                </>
              )}

              {sel.status === "accepted" && (
                <button
                  className="btn"
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    withAction(async () => {
                      if (!window.confirm("Опубликовать статью сейчас?"))
                        return;
                      await apiPublishMedSubmission(sel.id);
                      setOk("Статья опубликована!");
                    })
                  }
                >
                  Опубликовать
                </button>
              )}
            </div>
          </div>

          {detail.reviews.length > 0 && (
            <div className="search-form-card mb-4">
              <h5>Рецензии</h5>
              <div className="stack">
                {detail.reviews.map((rev) => (
                  <div key={rev.id} className="search-form-card">
                    <div className="row gap space">
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
                    {rev.confidential_comment && (
                      <p className="muted">
                        Конфиденциально: {rev.confidential_comment}
                      </p>
                    )}
                    <div className="muted">{fmtDate(rev.submitted_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
