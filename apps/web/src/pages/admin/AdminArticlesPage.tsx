import React, { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  apiAdminGetArticles,
  apiAdminDeleteOrphanArticles,
  type AdminArticle,
  type AdminArticlesResponse,
} from "../../lib/adminApi";
import {
  IconBook,
  IconSearch,
  IconRefresh,
  IconTrash,
  IconCheckCircle,
} from "../../components/FlowbiteIcons";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [hasStatsFilter, setHasStatsFilter] = useState<
    "true" | "false" | "all"
  >("all");
  const [sources, setSources] = useState<{ source: string; count: number }[]>(
    [],
  );
  const [stats, setStats] = useState<AdminArticlesResponse["stats"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiAdminGetArticles({
        page,
        limit: 50,
        search: appliedSearch || undefined,
        source: sourceFilter || undefined,
        hasStats: hasStatsFilter,
      });
      setArticles(data.articles);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSources(data.sources);
      setStats(data.stats);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, sourceFilter, hasStatsFilter]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  async function handleDeleteOrphans() {
    if (
      !confirm(
        "Удалить все статьи, не используемые в проектах? Это действие необратимо!",
      )
    )
      return;
    setCleanupLoading(true);
    try {
      const result = await apiAdminDeleteOrphanArticles();
      alert(`Удалено статей: ${result.deletedCount}`);
      loadArticles();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCleanupLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconBook size="lg" />
            Статьи
          </h1>
          <p className="admin-page-subtitle">Всего: {total}</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="btn danger"
            onClick={handleDeleteOrphans}
            disabled={cleanupLoading}
          >
            <IconTrash size="sm" />
            {cleanupLoading ? "Удаление..." : "Удалить сироты"}
          </button>
          <button
            className="btn secondary"
            onClick={loadArticles}
            disabled={loading}
          >
            <IconRefresh className={loading ? "spin" : ""} />
            Обновить
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="admin-articles-stats">
          <div className="admin-stat-mini">
            <span className="admin-stat-mini-value">{stats.total}</span>
            <span className="admin-stat-mini-label">Всего</span>
          </div>
          <div className="admin-stat-mini">
            <span className="admin-stat-mini-value">{stats.with_doi}</span>
            <span className="admin-stat-mini-label">С DOI</span>
          </div>
          <div className="admin-stat-mini">
            <span className="admin-stat-mini-value">{stats.with_pmid}</span>
            <span className="admin-stat-mini-label">С PMID</span>
          </div>
          <div className="admin-stat-mini">
            <span className="admin-stat-mini-value">{stats.with_stats}</span>
            <span className="admin-stat-mini-label">Со статистикой</span>
          </div>
          <div className="admin-stat-mini">
            <span className="admin-stat-mini-value">{stats.from_files}</span>
            <span className="admin-stat-mini-label">Из файлов</span>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="admin-filters-row">
        <form onSubmit={handleSearch} className="admin-search-form">
          <div className="admin-search-input-wrapper">
            <IconSearch size="sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, DOI или PMID..."
              className="admin-search-input"
            />
          </div>
          <button type="submit" className="btn">
            Найти
          </button>
        </form>

        <div className="admin-filters">
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">Все источники</option>
            {sources.map((s) => (
              <option key={s.source} value={s.source}>
                {s.source} ({s.count})
              </option>
            ))}
          </select>

          <select
            value={hasStatsFilter}
            onChange={(e) => {
              setHasStatsFilter(e.target.value as "true" | "false" | "all");
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="all">Все статьи</option>
            <option value="true">Со статистикой</option>
            <option value="false">Без статистики</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert admin-alert">
          <span>{error}</span>
        </div>
      )}

      {/* Articles Table */}
      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>DOI</th>
                <th>PMID</th>
                <th>Год</th>
                <th>Источник</th>
                <th>Статистика</th>
                <th>Проектов</th>
                <th>Добавлена</th>
              </tr>
            </thead>
            <tbody>
              {loading && !articles.length ? (
                <tr>
                  <td colSpan={8} className="admin-table-loading">
                    <div className="admin-loading-spinner"></div>
                    Загрузка...
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-table-empty">
                    Статьи не найдены
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id}>
                    <td className="admin-table-title" title={article.title_en}>
                      {article.title_en.length > 60
                        ? article.title_en.substring(0, 60) + "..."
                        : article.title_en}
                    </td>
                    <td className="mono">
                      {article.doi ? (
                        <a
                          href={`https://doi.org/${article.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {article.doi.length > 25
                            ? article.doi.substring(0, 25) + "..."
                            : article.doi}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mono">
                      {article.pmid ? (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {article.pmid}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{article.year || "—"}</td>
                    <td>
                      <span className="admin-badge">{article.source}</span>
                    </td>
                    <td>
                      {article.has_stats ? (
                        <IconCheckCircle size="sm" className="text-success" />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{article.projects_using}</td>
                    <td className="admin-table-date">
                      {formatDate(article.created_at)}
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
