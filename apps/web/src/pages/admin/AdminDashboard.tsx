import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  apiAdminStats,
  apiAdminSystemOverview,
  apiAdminExtendedStats,
  apiAdminRealtimeStats,
  type AdminStats,
  type SystemOverview,
  type ExtendedStats,
  type RealtimeStats,
} from "../../lib/adminApi";
import {
  IconUsers,
  IconFolder,
  IconBook,
  IconDocument,
  IconChartBar,
  IconExclamation,
  IconCheckCircle,
  IconRefresh,
  IconClock,
  IconGlobe,
} from "../../components/FlowbiteIcons";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "danger";
  link?: string;
  subtitle?: string;
};

function StatCard({
  title,
  value,
  icon,
  color,
  link,
  subtitle,
}: StatCardProps) {
  const colorClasses = {
    primary: "admin-stat-primary",
    success: "admin-stat-success",
    warning: "admin-stat-warning",
    danger: "admin-stat-danger",
  };

  const content = (
    <div className={`admin-stat-card ${colorClasses[color]}`}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-content">
        <span className="admin-stat-value">{value}</span>
        <span className="admin-stat-title">{title}</span>
        {subtitle && <span className="admin-stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="admin-stat-link">
        {content}
      </Link>
    );
  }

  return content;
}

// Simple bar chart component
function MiniBarChart({
  data,
  label,
}: {
  data: { date: string; count: string }[];
  label: string;
}) {
  if (!data.length) return <div className="admin-empty">Нет данных</div>;

  const maxCount = Math.max(...data.map((d) => parseInt(d.count)));
  const last7 = data.slice(-7);

  return (
    <div className="admin-mini-chart">
      <div className="admin-mini-chart-label">{label}</div>
      <div className="admin-mini-chart-bars">
        {last7.map((item, i) => {
          const height =
            maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
          const day = new Date(item.date).toLocaleDateString("ru-RU", {
            weekday: "short",
          });
          return (
            <div
              key={i}
              className="admin-mini-chart-bar-wrapper"
              title={`${day}: ${item.count}`}
            >
              <div
                className="admin-mini-chart-bar"
                style={{ height: `${Math.max(height, 5)}%` }}
              />
              <span className="admin-mini-chart-day">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [extended, setExtended] = useState<ExtendedStats | null>(null);
  const [realtime, setRealtime] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [statsData, overviewData, extendedData, realtimeData] =
        await Promise.all([
          apiAdminStats(),
          apiAdminSystemOverview(),
          apiAdminExtendedStats().catch(() => null),
          apiAdminRealtimeStats().catch(() => null),
        ]);
      setStats(statsData);
      setOverview(overviewData);
      setExtended(extendedData);
      setRealtime(realtimeData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Auto-refresh realtime stats every 30 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const realtimeData = await apiAdminRealtimeStats();
        setRealtime(realtimeData);
      } catch {
        // Ignore errors during auto-refresh
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalStorage =
    overview?.storage.byCategory.reduce(
      (sum, cat) => sum + parseInt(cat.total_size_bytes || "0"),
      0,
    ) || 0;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Дашборд</h1>
          <p className="admin-page-subtitle">Обзор системы Scientiaiter</p>
        </div>
        <button className="btn secondary" onClick={loadData} disabled={loading}>
          <IconRefresh className={loading ? "spin" : ""} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="alert admin-alert">
          <IconExclamation />
          <span>{error}</span>
        </div>
      )}

      {loading && !stats ? (
        <div className="admin-loading-content">
          <div className="admin-loading-spinner"></div>
          <p>Загрузка статистики...</p>
        </div>
      ) : (
        <>
          {/* Realtime Banner */}
          {realtime && (
            <div className="admin-realtime-banner">
              <div className="admin-realtime-item">
                <IconGlobe className="admin-realtime-icon pulse" />
                <span className="admin-realtime-value">
                  {realtime.onlineUsers}
                </span>
                <span className="admin-realtime-label">онлайн сейчас</span>
              </div>
              {realtime.recentErrors.length > 0 && (
                <div className="admin-realtime-item admin-realtime-danger">
                  <IconExclamation className="admin-realtime-icon" />
                  <span className="admin-realtime-value">
                    {realtime.recentErrors.reduce(
                      (sum, e) => sum + parseInt(e.count),
                      0,
                    )}
                  </span>
                  <span className="admin-realtime-label">ошибок за час</span>
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="admin-stats-grid">
            <StatCard
              title="Пользователей"
              value={stats?.totalUsers || 0}
              icon={<IconUsers size="lg" />}
              color="primary"
              link="/admin/users"
            />
            <StatCard
              title="Проектов"
              value={stats?.totalProjects || 0}
              icon={<IconFolder size="lg" />}
              color="success"
            />
            <StatCard
              title="Статей"
              value={stats?.totalArticles || 0}
              icon={<IconBook size="lg" />}
              color="primary"
            />
            <StatCard
              title="Документов"
              value={stats?.totalDocuments || 0}
              icon={<IconDocument size="lg" />}
              color="success"
            />
            <StatCard
              title="Активны сегодня"
              value={stats?.activeUsersToday || 0}
              icon={<IconChartBar size="lg" />}
              color="warning"
              link="/admin/activity"
            />
            <StatCard
              title="Ошибок сегодня"
              value={stats?.unresolvedErrorsToday || 0}
              icon={<IconExclamation size="lg" />}
              color={stats?.unresolvedErrorsToday ? "danger" : "success"}
              link="/admin/errors"
            />
          </div>

          {/* Charts Row */}
          {extended && (
            <div className="admin-charts-row">
              <div className="admin-card admin-chart-card">
                <div className="admin-card-header">
                  <h3>
                    <IconUsers size="sm" /> Регистрации (30 дней)
                  </h3>
                </div>
                <div className="admin-card-content">
                  <MiniBarChart
                    data={extended.usersGrowth}
                    label="Новые пользователи"
                  />
                </div>
              </div>
              <div className="admin-card admin-chart-card">
                <div className="admin-card-header">
                  <h3>
                    <IconFolder size="sm" /> Проекты (30 дней)
                  </h3>
                </div>
                <div className="admin-card-content">
                  <MiniBarChart
                    data={extended.projectsGrowth}
                    label="Новые проекты"
                  />
                </div>
              </div>
              <div className="admin-card admin-chart-card">
                <div className="admin-card-header">
                  <h3>
                    <IconChartBar size="sm" /> Активность (7 дней)
                  </h3>
                </div>
                <div className="admin-card-content">
                  <MiniBarChart
                    data={extended.activeUsersWeekly}
                    label="Активных пользователей"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content Grid */}
          <div className="admin-content-grid">
            {/* Top Users */}
            {extended?.topUsers && extended.topUsers.length > 0 && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3>
                    <IconUsers size="sm" /> Топ пользователей
                  </h3>
                </div>
                <div className="admin-card-content">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Проектов</th>
                        <th>Документов</th>
                        <th>Статей</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extended.topUsers.slice(0, 5).map((user) => (
                        <tr key={user.id}>
                          <td className="admin-table-email">
                            <Link to={`/admin/users/${user.id}`}>
                              {user.email}
                            </Link>
                          </td>
                          <td>{user.projects_count}</td>
                          <td>{user.documents_count}</td>
                          <td>{user.articles_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Projects */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>
                  <IconFolder size="sm" /> Последние проекты
                </h3>
              </div>
              <div className="admin-card-content">
                {overview?.recentProjects.length ? (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Проект</th>
                        <th>Владелец</th>
                        <th>Документов</th>
                        <th>Создан</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentProjects.map((project) => (
                        <tr key={project.id}>
                          <td className="admin-table-name">{project.name}</td>
                          <td className="admin-table-email">
                            {project.owner_email || "—"}
                          </td>
                          <td>{project.docs_count}</td>
                          <td className="admin-table-date">
                            {formatDate(project.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="admin-empty">Проектов пока нет</p>
                )}
              </div>
            </div>

            {/* Storage Usage */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>
                  <IconDocument size="sm" /> Хранилище
                </h3>
                <span className="admin-card-badge">
                  {formatBytes(totalStorage)}
                </span>
              </div>
              <div className="admin-card-content">
                {overview?.storage.byCategory.length ? (
                  <div className="admin-storage-list">
                    {overview.storage.byCategory.map((cat) => {
                      const percentage =
                        totalStorage > 0
                          ? (parseInt(cat.total_size_bytes || "0") /
                              totalStorage) *
                            100
                          : 0;
                      return (
                        <div key={cat.category} className="admin-storage-item">
                          <div className="admin-storage-info">
                            <span className="admin-storage-category">
                              {cat.category}
                            </span>
                            <span className="admin-storage-details">
                              {cat.category_count} файлов ·{" "}
                              {formatBytes(
                                parseInt(cat.total_size_bytes || "0"),
                              )}
                            </span>
                          </div>
                          <div className="admin-storage-bar">
                            <div
                              className="admin-storage-fill"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-empty">Файлов пока нет</p>
                )}
              </div>
            </div>

            {/* Active Jobs */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>
                  <IconChartBar size="sm" /> Фоновые задачи (24ч)
                </h3>
              </div>
              <div className="admin-card-content">
                {overview?.activeJobs.length ? (
                  <div className="admin-jobs-grid">
                    {overview.activeJobs.map((job) => (
                      <div
                        key={job.status}
                        className={`admin-job-item admin-job-${job.status}`}
                      >
                        <span className="admin-job-count">{job.count}</span>
                        <span className="admin-job-status">{job.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-centered">
                    <IconCheckCircle size="lg" className="text-success" />
                    <p>Нет активных задач</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3>Быстрые действия</h3>
              </div>
              <div className="admin-card-content">
                <div className="admin-quick-actions">
                  <Link to="/admin/users" className="admin-quick-action">
                    <IconUsers />
                    <span>Пользователи</span>
                  </Link>
                  <Link to="/admin/activity" className="admin-quick-action">
                    <IconChartBar />
                    <span>Активность</span>
                  </Link>
                  <Link to="/admin/errors" className="admin-quick-action">
                    <IconExclamation />
                    <span>Ошибки</span>
                  </Link>
                  <Link to="/admin/sessions" className="admin-quick-action">
                    <IconGlobe />
                    <span>Сессии</span>
                  </Link>
                  <Link to="/admin/audit" className="admin-quick-action">
                    <IconDocument />
                    <span>Аудит</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
