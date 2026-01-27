import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  apiAdminGetProjects,
  apiAdminDeleteProject,
  type AdminProject,
} from "../../lib/adminApi";
import {
  IconFolder,
  IconSearch,
  IconRefresh,
  IconEye,
  IconTrash,
  IconUsers,
  IconDocument,
  IconBook,
} from "../../components/FlowbiteIcons";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'name' | 'documents_count' | 'articles_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAdminGetProjects({
        page,
        limit: 20,
        search: search || undefined,
        sortBy,
        sortOrder,
      });
      setProjects(data.projects);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, [page, sortBy, sortOrder]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadProjects();
  }

  async function handleDelete(project: AdminProject) {
    if (!confirm(`Удалить проект "${project.name}"? Это действие необратимо!`)) return;
    try {
      await apiAdminDeleteProject(project.id);
      loadProjects();
    } catch (err: any) {
      alert(err?.message || "Ошибка удаления");
    }
  }

  function handleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconFolder size="lg" />
            Проекты
          </h1>
          <p className="admin-page-subtitle">Всего: {total}</p>
        </div>
        <button className="btn secondary" onClick={loadProjects} disabled={loading}>
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
            placeholder="Поиск по названию или email владельца..."
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

      {/* Projects Table */}
      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th 
                  className="sortable"
                  onClick={() => handleSort('name')}
                >
                  Название {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Владелец</th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('documents_count')}
                >
                  Документы {sortBy === 'documents_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('articles_count')}
                >
                  Статьи {sortBy === 'articles_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Участники</th>
                <th>Размер</th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('created_at')}
                >
                  Создан {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && !projects.length ? (
                <tr>
                  <td colSpan={8} className="admin-table-loading">
                    <div className="admin-loading-spinner"></div>
                    Загрузка...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-table-empty">
                    Проекты не найдены
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id}>
                    <td className="admin-table-name">
                      <IconFolder size="sm" className="text-muted" />
                      {project.name}
                    </td>
                    <td className="admin-table-email">
                      {project.owner_email ? (
                        <Link to={`/admin/users/${project.owner_id}`}>
                          {project.owner_email}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge">
                        <IconDocument size="sm" />
                        {project.documents_count}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge">
                        <IconBook size="sm" />
                        {project.articles_count}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge">
                        <IconUsers size="sm" />
                        {project.members_count}
                      </span>
                    </td>
                    <td className="mono">{formatBytes(project.total_size)}</td>
                    <td className="admin-table-date">{formatDate(project.created_at)}</td>
                    <td>
                      <div className="admin-table-actions">
                        <Link 
                          to={`/admin/projects/${project.id}`}
                          className="admin-action-btn"
                          title="Просмотр"
                        >
                          <IconEye size="sm" />
                        </Link>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => handleDelete(project)}
                          title="Удалить"
                        >
                          <IconTrash size="sm" />
                        </button>
                      </div>
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
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Назад
            </button>
            <span className="admin-pagination-info">
              Страница {page} из {totalPages}
            </span>
            <button
              className="btn secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
