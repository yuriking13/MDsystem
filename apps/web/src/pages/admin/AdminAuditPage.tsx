import React, { useEffect, useState } from "react";
import {
  apiAdminGetAudit,
  type AuditLogItem,
} from "../../lib/adminApi";
import {
  IconShield,
  IconRefresh,
  IconFilter,
} from "../../components/FlowbiteIcons";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ACTION_LABELS: Record<string, string> = {
  admin_login: "Вход в админку",
  generate_admin_token: "Генерация токена",
  update_admin_status: "Изменение прав админа",
  resolve_error: "Решение ошибки",
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [actionFilter, setActionFilter] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAdminGetAudit({
        action: actionFilter || undefined,
        page,
        limit: 50,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  return (
    <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>
              <IconShield size="lg" />
              Журнал аудита
            </h1>
            <p className="admin-page-subtitle">
              История действий администраторов · Всего записей: {total}
            </p>
          </div>
          <button className="btn secondary" onClick={loadLogs} disabled={loading}>
            <IconRefresh className={loading ? "spin" : ""} />
            Обновить
          </button>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-filter-group">
            <label>
              <IconFilter size="sm" />
              Действие
            </label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск по действию..."
            />
          </div>
        </div>

        {error && (
          <div className="alert admin-alert">
            <span>{error}</span>
          </div>
        )}

        {/* Audit Table */}
        <div className="admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table admin-audit-table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Администратор</th>
                  <th>Действие</th>
                  <th>Цель</th>
                  <th>Детали</th>
                  <th>IP адрес</th>
                </tr>
              </thead>
              <tbody>
                {loading && !logs.length ? (
                  <tr>
                    <td colSpan={6} className="admin-table-loading">
                      <div className="admin-loading-spinner"></div>
                      Загрузка...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      Записей не найдено
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="admin-table-date">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="admin-table-email">
                        {log.admin_email}
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-action">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td>
                        {log.target_type && (
                          <span className="admin-target">
                            {log.target_type}: {log.target_id?.slice(0, 8)}...
                          </span>
                        )}
                        {!log.target_type && "—"}
                      </td>
                      <td className="admin-table-detail">
                        {log.details && Object.keys(log.details).length > 0 
                          ? JSON.stringify(log.details).slice(0, 50)
                          : "—"}
                      </td>
                      <td className="mono">{log.ip_address || "—"}</td>
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
    </div>
  );
}
