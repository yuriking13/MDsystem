import React, { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  apiAdminGetErrors,
  apiAdminResolveError,
  type ErrorLogItem,
} from "../../lib/adminApi";
import {
  IconExclamation,
  IconRefresh,
  IconCheckCircle,
  IconFilter,
  IconEye,
  IconClose,
} from "../../components/FlowbiteIcons";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ErrorDetailModalProps = {
  error: ErrorLogItem;
  onClose: () => void;
  onResolve: () => void;
};

function ErrorDetailModal({
  error,
  onClose,
  onResolve,
}: ErrorDetailModalProps) {
  const [notes, setNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  async function handleResolve() {
    setResolving(true);
    try {
      await apiAdminResolveError(error.id, notes || undefined);
      onResolve();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal admin-error-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2>
            <IconExclamation className="text-danger" />
            Детали ошибки
          </h2>
          <button className="admin-modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <div className="admin-modal-body">
          <div className="admin-error-detail-grid">
            <div className="admin-error-detail-item">
              <span className="admin-error-detail-label">Тип ошибки</span>
              <span className="admin-badge admin-badge-error">
                {error.error_type}
              </span>
            </div>

            <div className="admin-error-detail-item">
              <span className="admin-error-detail-label">Время</span>
              <span>{formatDate(error.created_at)}</span>
            </div>

            <div className="admin-error-detail-item">
              <span className="admin-error-detail-label">Пользователь</span>
              <span>{error.user_email || "—"}</span>
            </div>

            <div className="admin-error-detail-item">
              <span className="admin-error-detail-label">IP адрес</span>
              <span className="mono">{error.ip_address || "—"}</span>
            </div>

            <div className="admin-error-detail-item full-width">
              <span className="admin-error-detail-label">Запрос</span>
              <span className="mono">
                {error.request_method} {error.request_path || "—"}
              </span>
            </div>

            <div className="admin-error-detail-item full-width">
              <span className="admin-error-detail-label">
                Сообщение об ошибке
              </span>
              <div className="admin-error-message">{error.error_message}</div>
            </div>

            {error.error_stack && (
              <div className="admin-error-detail-item full-width">
                <span className="admin-error-detail-label">Stack trace</span>
                <pre className="admin-error-stack">{error.error_stack}</pre>
              </div>
            )}

            {error.request_body && (
              <div className="admin-error-detail-item full-width">
                <span className="admin-error-detail-label">Request body</span>
                <pre className="admin-error-body">
                  {JSON.stringify(error.request_body, null, 2)}
                </pre>
              </div>
            )}

            {error.resolved && (
              <>
                <div className="admin-error-detail-item">
                  <span className="admin-error-detail-label">Решено</span>
                  <span>{formatDate(error.resolved_at!)}</span>
                </div>
                <div className="admin-error-detail-item">
                  <span className="admin-error-detail-label">Кем решено</span>
                  <span>{error.resolved_by_email}</span>
                </div>
                {error.notes && (
                  <div className="admin-error-detail-item full-width">
                    <span className="admin-error-detail-label">Заметки</span>
                    <div className="admin-error-notes">{error.notes}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!error.resolved && (
          <div className="admin-modal-footer">
            <div className="admin-resolve-form">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Заметки о решении (опционально)..."
                rows={2}
              />
              <button
                className="btn"
                onClick={handleResolve}
                disabled={resolving}
              >
                <IconCheckCircle />
                {resolving ? "Сохранение..." : "Отметить как решённое"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorTypes, setErrorTypes] = useState<string[]>([]);

  const [resolvedFilter, setResolvedFilter] = useState<
    "true" | "false" | "all"
  >("false");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<ErrorLogItem | null>(null);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAdminGetErrors({
        resolved: resolvedFilter,
        errorType: typeFilter || undefined,
        page,
        limit: 30,
      });
      setErrors(data.errors);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setErrorTypes(data.errorTypes);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, resolvedFilter, typeFilter]);

  useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  function handleErrorResolved() {
    setSelectedError(null);
    loadErrors();
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconExclamation size="lg" className="text-danger" />
            Ошибки системы
          </h1>
          <p className="admin-page-subtitle">
            {resolvedFilter === "false"
              ? `Нерешённых ошибок: ${total}`
              : `Всего ошибок: ${total}`}
          </p>
        </div>
        <button
          className="btn secondary"
          onClick={loadErrors}
          disabled={loading}
        >
          <IconRefresh className={loading ? "spin" : ""} />
          Обновить
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label>
            <IconFilter size="sm" />
            Статус
          </label>
          <select
            value={resolvedFilter}
            onChange={(e) => {
              setResolvedFilter(e.target.value as "true" | "false" | "all");
              setPage(1);
            }}
          >
            <option value="false">Нерешённые</option>
            <option value="true">Решённые</option>
            <option value="all">Все</option>
          </select>
        </div>

        <div className="admin-filter-group">
          <label>Тип ошибки</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Все типы</option>
            {errorTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert admin-alert">
          <span>{error}</span>
        </div>
      )}

      {/* Errors Table */}
      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table admin-errors-table">
            <thead>
              <tr>
                <th>Статус</th>
                <th>Тип</th>
                <th>Сообщение</th>
                <th>Пользователь</th>
                <th>Запрос</th>
                <th>Время</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && !errors.length ? (
                <tr>
                  <td colSpan={7} className="admin-table-loading">
                    <div className="admin-loading-spinner"></div>
                    Загрузка...
                  </td>
                </tr>
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    <IconCheckCircle size="lg" className="text-success" />
                    <p>Ошибок не найдено</p>
                  </td>
                </tr>
              ) : (
                errors.map((err) => (
                  <tr key={err.id} className={err.resolved ? "resolved" : ""}>
                    <td>
                      {err.resolved ? (
                        <span className="admin-status-badge resolved">
                          <IconCheckCircle size="sm" />
                          Решено
                        </span>
                      ) : (
                        <span className="admin-status-badge error">
                          <IconExclamation size="sm" />
                          Открыто
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-error-type">
                        {err.error_type}
                      </span>
                    </td>
                    <td className="admin-table-message">
                      {err.error_message.slice(0, 100)}
                      {err.error_message.length > 100 && "..."}
                    </td>
                    <td className="admin-table-email">
                      {err.user_email || "—"}
                    </td>
                    <td className="admin-table-request mono">
                      {err.request_method}{" "}
                      {err.request_path?.slice(0, 30) || "—"}
                    </td>
                    <td className="admin-table-date">
                      {formatDate(err.created_at)}
                    </td>
                    <td className="admin-table-actions">
                      <button
                        className="admin-action-btn"
                        onClick={() => setSelectedError(err)}
                        title="Подробнее"
                      >
                        <IconEye size="sm" />
                      </button>
                      {!err.resolved && (
                        <button
                          className="admin-action-btn text-success"
                          onClick={async () => {
                            await apiAdminResolveError(err.id);
                            loadErrors();
                          }}
                          title="Решить"
                        >
                          <IconCheckCircle size="sm" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="btn secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </button>
            <span className="admin-pagination-info">
              Страница {page} из {totalPages}
            </span>
            <button
              className="btn secondary"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Вперёд
            </button>
          </div>
        )}
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <ErrorDetailModal
          error={selectedError}
          onClose={() => setSelectedError(null)}
          onResolve={handleErrorResolved}
        />
      )}
    </div>
  );
}
