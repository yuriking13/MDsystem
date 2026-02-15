import React, { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  apiAdminGetJobs,
  apiAdminCancelJob,
  apiAdminRetryJob,
  type AdminJob,
} from "../../lib/adminApi";
import {
  IconChartBar,
  IconRefresh,
  IconXCircle,
  IconCheckCircle,
  IconClock,
  IconExclamation,
} from "../../components/FlowbiteIcons";

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { class: string; icon: React.ReactNode }> = {
    pending: { class: "admin-badge-warning", icon: <IconClock size="sm" /> },
    running: {
      class: "admin-badge-info",
      icon: <IconRefresh size="sm" className="spin" />,
    },
    completed: {
      class: "admin-badge-success",
      icon: <IconCheckCircle size="sm" />,
    },
    failed: {
      class: "admin-badge-danger",
      icon: <IconExclamation size="sm" />,
    },
    cancelled: {
      class: "admin-badge-secondary",
      icon: <IconXCircle size="sm" />,
    },
  };
  const s = statusMap[status] || { class: "", icon: null };
  return (
    <span className={`admin-badge ${s.class}`}>
      {s.icon}
      {status}
    </span>
  );
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<{ status: string; count: number }[]>(
    [],
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAdminGetJobs({
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit: 30,
      });
      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSummary(data.summary);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadJobs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  async function handleCancel(jobId: string) {
    if (!confirm("Отменить эту задачу?")) return;
    try {
      await apiAdminCancelJob(jobId);
      loadJobs();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleRetry(jobId: string) {
    if (!confirm("Повторить эту задачу?")) return;
    try {
      await apiAdminRetryJob(jobId);
      loadJobs();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconChartBar size="lg" />
            Фоновые задачи
          </h1>
          <p className="admin-page-subtitle">Всего: {total}</p>
        </div>
        <button className="btn secondary" onClick={loadJobs} disabled={loading}>
          <IconRefresh className={loading ? "spin" : ""} />
          Обновить
        </button>
      </div>

      {/* Summary */}
      {summary.length > 0 && (
        <div className="admin-jobs-summary">
          {summary.map((s) => (
            <div
              key={s.status}
              className={`admin-job-summary-item admin-job-${s.status}`}
              onClick={() => setStatusFilter(s.status)}
              style={{ cursor: "pointer" }}
            >
              <span className="admin-job-summary-count">{s.count}</span>
              <span className="admin-job-summary-status">{s.status}</span>
            </div>
          ))}
          <div
            className="admin-job-summary-item"
            onClick={() => setStatusFilter("all")}
            style={{ cursor: "pointer" }}
          >
            <span className="admin-job-summary-count">
              {summary.reduce((sum, s) => sum + s.count, 0)}
            </span>
            <span className="admin-job-summary-status">всего (7 дней)</span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="admin-filters">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="admin-select"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидание</option>
          <option value="running">Выполняется</option>
          <option value="completed">Завершено</option>
          <option value="failed">Ошибка</option>
          <option value="cancelled">Отменено</option>
        </select>
      </div>

      {error && (
        <div className="alert admin-alert">
          <span>{error}</span>
        </div>
      )}

      {/* Jobs Table */}
      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Проект</th>
                <th>Статус</th>
                <th>Прогресс</th>
                <th>Создана</th>
                <th>Начата</th>
                <th>Завершена</th>
                <th>Ошибка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && !jobs.length ? (
                <tr>
                  <td colSpan={8} className="admin-table-loading">
                    <div className="admin-loading-spinner"></div>
                    Загрузка...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-table-empty">
                    Задачи не найдены
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const progress =
                    job.total_pmids_to_fetch > 0
                      ? Math.round(
                          (job.fetched_pmids / job.total_pmids_to_fetch) * 100,
                        )
                      : 0;
                  return (
                    <tr key={job.id}>
                      <td className="admin-table-name">
                        {job.project_name || "—"}
                        {job.owner_email && (
                          <span className="admin-table-subtitle">
                            {job.owner_email}
                          </span>
                        )}
                      </td>
                      <td>{getStatusBadge(job.status)}</td>
                      <td>
                        <div className="admin-progress-cell">
                          <div className="admin-progress-bar">
                            <div
                              className="admin-progress-fill"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="admin-progress-text">
                            {job.fetched_pmids}/{job.total_pmids_to_fetch}
                          </span>
                        </div>
                      </td>
                      <td className="admin-table-date">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="admin-table-date">
                        {formatDate(job.started_at)}
                      </td>
                      <td className="admin-table-date">
                        {formatDate(job.completed_at)}
                      </td>
                      <td className="admin-table-error">
                        {job.error_message && (
                          <span
                            className="admin-error-preview"
                            title={job.error_message}
                          >
                            {job.error_message.substring(0, 50)}...
                          </span>
                        )}
                        {job.cancel_reason && (
                          <span className="admin-badge admin-badge-secondary">
                            {job.cancel_reason}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          {(job.status === "pending" ||
                            job.status === "running") && (
                            <button
                              className="admin-action-btn danger"
                              onClick={() => handleCancel(job.id)}
                              title="Отменить"
                            >
                              <IconXCircle size="sm" />
                            </button>
                          )}
                          {(job.status === "failed" ||
                            job.status === "cancelled") && (
                            <button
                              className="admin-action-btn"
                              onClick={() => handleRetry(job.id)}
                              title="Повторить"
                            >
                              <IconRefresh size="sm" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="btn secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Назад
            </button>
            <span className="admin-pagination-info">
              Страница {page} из {totalPages}
            </span>
            <button
              className="btn secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
