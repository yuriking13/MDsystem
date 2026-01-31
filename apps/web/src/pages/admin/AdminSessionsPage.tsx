import React, { useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  apiAdminGetActiveSessions,
  apiAdminTerminateSession,
  type ActiveSession,
} from "../../lib/adminApi";
import {
  IconGlobe,
  IconRefresh,
  IconXCircle,
  IconUsers,
  IconClock,
} from "../../components/FlowbiteIcons";
import { Link } from "react-router-dom";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Unknown";
  let os = "Unknown";

  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAdminGetActiveSessions();
      setSessions(data.sessions);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleTerminate(sessionId: string) {
    if (!confirm("Завершить эту сессию?")) return;
    try {
      await apiAdminTerminateSession(sessionId);
      loadSessions();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconGlobe size="lg" />
            Активные сессии
          </h1>
          <p className="admin-page-subtitle">Всего: {sessions.length}</p>
        </div>
        <button
          className="btn secondary"
          onClick={loadSessions}
          disabled={loading}
        >
          <IconRefresh className={loading ? "spin" : ""} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="alert admin-alert">
          <span>{error}</span>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table admin-sessions-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Начало сессии</th>
                <th>Последняя активность</th>
                <th>IP</th>
                <th>Браузер / ОС</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && !sessions.length ? (
                <tr>
                  <td colSpan={6} className="admin-table-loading">
                    <div className="admin-loading-spinner"></div>
                    Загрузка...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    <IconUsers size="lg" className="text-muted" />
                    <p>Нет активных сессий</p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const { browser, os } = parseUserAgent(
                    session.user_agent || "",
                  );
                  return (
                    <tr key={session.id}>
                      <td className="admin-table-email">
                        <Link to={`/admin/users/${session.user_id}`}>
                          {session.email}
                        </Link>
                      </td>
                      <td className="admin-table-date">
                        <IconClock size="sm" className="text-muted" />
                        {formatDate(session.started_at)}
                      </td>
                      <td className="admin-table-date">
                        {formatDate(session.last_activity_at)}
                      </td>
                      <td className="mono">{session.ip_address || "—"}</td>
                      <td>
                        <span className="admin-badge">{browser}</span>
                        <span className="admin-badge admin-badge-secondary">
                          {os}
                        </span>
                      </td>
                      <td className="admin-table-actions">
                        <button
                          className="admin-action-btn admin-action-danger"
                          onClick={() => handleTerminate(session.id)}
                          title="Завершить сессию"
                        >
                          <IconXCircle size="sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
