import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiAdminStats,
  apiAdminSystemOverview,
  type AdminStats,
  type SystemOverview
} from "../../lib/adminApi";
import {
  IconUsers,
  IconFolder,
  IconBook,
  IconDocument,
  IconChartBar,
  IconExclamation,
  IconCheckCircle,
  IconRefresh
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
};

function StatCard({ title, value, icon, color, link }: StatCardProps) {
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
      </div>
    </div>
  );

  if (link) {
    return <Link to={link} className="admin-stat-link">{content}</Link>;
  }

  return content;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [statsData, overviewData] = await Promise.all([
        apiAdminStats(),
        apiAdminSystemOverview(),
      ]);
      setStats(statsData);
      setOverview(overviewData);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalStorage = overview?.storage.byCategory.reduce(
    (sum, cat) => sum + parseInt(cat.total_size_bytes || "0"),
    0
  ) || 0;

  return (
    <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>Дашборд</h1>
            <p className="admin-page-subtitle">Обзор системы MDsystem</p>
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

            {/* Content Grid */}
            <div className="admin-content-grid">
              {/* Recent Projects */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3>
                    <IconFolder size="sm" />
                    Последние проекты
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
                            <td className="admin-table-email">{project.owner_email || "—"}</td>
                            <td>{project.docs_count}</td>
                            <td className="admin-table-date">{formatDate(project.created_at)}</td>
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
                    <IconDocument size="sm" />
                    Использование хранилища
                  </h3>
                  <span className="admin-card-badge">{formatBytes(totalStorage)}</span>
                </div>
                <div className="admin-card-content">
                  {overview?.storage.byCategory.length ? (
                    <div className="admin-storage-list">
                      {overview.storage.byCategory.map((cat) => {
                        const percentage = totalStorage > 0 
                          ? (parseInt(cat.total_size_bytes || "0") / totalStorage) * 100 
                          : 0;
                        return (
                          <div key={cat.category} className="admin-storage-item">
                            <div className="admin-storage-info">
                              <span className="admin-storage-category">{cat.category}</span>
                              <span className="admin-storage-details">
                                {cat.category_count} файлов · {formatBytes(parseInt(cat.total_size_bytes || "0"))}
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
                    <IconChartBar size="sm" />
                    Фоновые задачи (24ч)
                  </h3>
                </div>
                <div className="admin-card-content">
                  {overview?.activeJobs.length ? (
                    <div className="admin-jobs-grid">
                      {overview.activeJobs.map((job) => (
                        <div key={job.status} className={`admin-job-item admin-job-${job.status}`}>
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
                      <span>Управление пользователями</span>
                    </Link>
                    <Link to="/admin/activity" className="admin-quick-action">
                      <IconChartBar />
                      <span>Просмотр активности</span>
                    </Link>
                    <Link to="/admin/errors" className="admin-quick-action">
                      <IconExclamation />
                      <span>Просмотр ошибок</span>
                    </Link>
                    <Link to="/admin/audit" className="admin-quick-action">
                      <IconDocument />
                      <span>Журнал аудита</span>
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
