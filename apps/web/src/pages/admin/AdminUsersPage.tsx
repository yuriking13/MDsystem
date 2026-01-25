import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import {
  apiAdminGetUsers,
  apiAdminGetUser,
  apiAdminUpdateUserAdmin,
  type UserListItem,
  type UserDetailResponse,
} from "../../lib/adminApi";
import {
  IconUsers,
  IconSearch,
  IconRefresh,
  IconEye,
  IconShield,
  IconCheckCircle,
  IconXCircle,
  IconArrowLeft,
  IconChartBar,
  IconCalendar,
  IconFolder,
} from "../../components/FlowbiteIcons";

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

// User List Component
function UsersList() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAdminGetUsers(page, 20, search || undefined);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers();
  }

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    try {
      await apiAdminUpdateUserAdmin(userId, !currentIsAdmin);
      loadUsers();
    } catch (err: any) {
      alert(err?.message || "Ошибка");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconUsers size="lg" />
            Пользователи
          </h1>
          <p className="admin-page-subtitle">Всего: {total}</p>
        </div>
        <button className="btn secondary" onClick={loadUsers} disabled={loading}>
          <IconRefresh className={loading ? "spin" : ""} />
          Обновить
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="admin-search-form">
        <div className="admin-search-input-wrapper">
          <IconSearch size="sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по email..."
            className="admin-search-input"
          />
        </div>
        <button type="submit" className="btn">Найти</button>
      </form>

      {error && (
        <div className="alert admin-alert">
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table admin-users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Зарегистрирован</th>
                <th>Последний вход</th>
                <th>Проектов</th>
                <th>Подписка</th>
                <th>Админ</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && !users.length ? (
                <tr>
                  <td colSpan={7} className="admin-table-loading">
                    <div className="admin-loading-spinner"></div>
                    Загрузка...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="admin-table-email">
                      <Link to={`/admin/users/${user.id}`}>{user.email}</Link>
                    </td>
                    <td className="admin-table-date">{formatDate(user.created_at)}</td>
                    <td className="admin-table-date">{formatDate(user.last_login_at)}</td>
                    <td>{user.projects_count}</td>
                    <td>
                      <span className={`admin-badge admin-badge-${user.subscription_status}`}>
                        {user.subscription_status}
                      </span>
                    </td>
                    <td>
                      {user.is_admin ? (
                        <IconCheckCircle className="text-success" />
                      ) : (
                        <IconXCircle className="text-muted" />
                      )}
                    </td>
                    <td className="admin-table-actions">
                      <Link 
                        to={`/admin/users/${user.id}`}
                        className="admin-action-btn"
                        title="Просмотр"
                      >
                        <IconEye size="sm" />
                      </Link>
                      <button
                        className="admin-action-btn"
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        title={user.is_admin ? "Убрать права админа" : "Дать права админа"}
                      >
                        <IconShield size="sm" className={user.is_admin ? "text-accent" : ""} />
                      </button>
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
    </div>
  );
}

// User Detail Component
function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!userId) return;
      setLoading(true);
      try {
        const result = await apiAdminGetUser(userId);
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading-content">
          <div className="admin-loading-spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-page">
        <div className="alert admin-alert">{error || "Пользователь не найден"}</div>
        <Link to="/admin/users" className="btn secondary">
          <IconArrowLeft /> Назад
        </Link>
      </div>
    );
  }

  const { user, projects, recentActivity, sessions } = data;

  // Group activity by date
  const activityByDate: Record<string, { total: number; duration: number; types: string[] }> = {};
  recentActivity.forEach((a) => {
    if (!activityByDate[a.date]) {
      activityByDate[a.date] = { total: 0, duration: 0, types: [] };
    }
    activityByDate[a.date].total += parseInt(a.count);
    activityByDate[a.date].duration += parseInt(a.total_duration || "0");
    if (!activityByDate[a.date].types.includes(a.action_type)) {
      activityByDate[a.date].types.push(a.action_type);
    }
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link to="/admin/users" className="admin-back-link">
            <IconArrowLeft size="sm" />
            Все пользователи
          </Link>
          <h1>{user.email}</h1>
          <div className="admin-user-badges">
            {user.is_admin && (
              <span className="admin-badge admin-badge-admin">
                <IconShield size="sm" /> Администратор
              </span>
            )}
            <span className={`admin-badge admin-badge-${user.subscription_status}`}>
              {user.subscription_status}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-user-detail-grid">
        {/* User Info */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Информация о пользователе</h3>
          </div>
          <div className="admin-card-content">
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span className="admin-info-label">ID</span>
                <span className="admin-info-value mono">{user.id}</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Email</span>
                <span className="admin-info-value">{user.email}</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Зарегистрирован</span>
                <span className="admin-info-value">{formatDate(user.created_at)}</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Последний вход</span>
                <span className="admin-info-value">{formatDate(user.last_login_at)}</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Проектов создано</span>
                <span className="admin-info-value">{user.projects_count}</span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Участник проектов</span>
                <span className="admin-info-value">{user.member_of_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <IconChartBar size="sm" />
              Активность (30 дней)
            </h3>
            <Link to={`/admin/activity?userId=${user.id}`} className="admin-card-link">
              Подробнее
            </Link>
          </div>
          <div className="admin-card-content">
            {Object.keys(activityByDate).length > 0 ? (
              <div className="admin-activity-summary">
                {Object.entries(activityByDate)
                  .slice(0, 7)
                  .map(([date, info]) => (
                    <div key={date} className="admin-activity-day">
                      <span className="admin-activity-date">{formatShortDate(date)}</span>
                      <div className="admin-activity-bar-wrapper">
                        <div
                          className="admin-activity-bar"
                          style={{ width: `${Math.min(info.total * 2, 100)}%` }}
                        />
                      </div>
                      <span className="admin-activity-count">
                        {info.total} действий · {Math.round(info.duration / 60)} мин
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="admin-empty">Нет данных об активности</p>
            )}
          </div>
        </div>

        {/* Projects */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <IconFolder size="sm" />
              Проекты
            </h3>
          </div>
          <div className="admin-card-content">
            {projects.length > 0 ? (
              <div className="admin-projects-list">
                {projects.map((project) => (
                  <div key={project.id} className="admin-project-item">
                    <div className="admin-project-info">
                      <span className="admin-project-name">{project.name}</span>
                      <span className="admin-project-meta">
                        {project.documents_count} док. · {project.articles_count} статей
                      </span>
                    </div>
                    <span className="admin-project-date">
                      {formatShortDate(project.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-empty">Нет проектов</p>
            )}
          </div>
        </div>

        {/* Sessions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <IconCalendar size="sm" />
              Последние сессии
            </h3>
          </div>
          <div className="admin-card-content">
            {sessions.length > 0 ? (
              <div className="admin-sessions-list">
                {sessions.map((session) => (
                  <div key={session.id} className="admin-session-item">
                    <div className="admin-session-status">
                      {session.is_active ? (
                        <span className="admin-status-dot active" title="Активна" />
                      ) : (
                        <span className="admin-status-dot" title="Завершена" />
                      )}
                    </div>
                    <div className="admin-session-info">
                      <span className="admin-session-time">
                        {formatDate(session.started_at)}
                        {session.ended_at && ` — ${formatDate(session.ended_at)}`}
                      </span>
                      <span className="admin-session-meta">
                        {session.ip_address} · {session.user_agent?.slice(0, 50)}...
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-empty">Нет данных о сессиях</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function AdminUsersPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <AdminLayout>
      {userId ? <UserDetail /> : <UsersList />}
    </AdminLayout>
  );
}
