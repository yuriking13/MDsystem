import React, { useEffect, useState } from "react";
import {
  apiSearchArticles,
  apiGetArticles,
  apiUpdateArticleStatus,
  apiRemoveArticle,
  type Article,
  type SearchFilters,
} from "../lib/api";

type Props = {
  projectId: string;
  canEdit: boolean;
};

const PUBLICATION_TYPES = [
  "Systematic Review",
  "Meta-Analysis",
  "Randomized Controlled Trial",
  "Clinical Trial",
  "Review",
];

export default function ArticlesSection({ projectId, canEdit }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [counts, setCounts] = useState({ candidate: 0, selected: 0, excluded: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Фильтр отображения
  const [viewStatus, setViewStatus] = useState<"candidate" | "selected" | "excluded" | "all">("candidate");
  const [showStatsOnly, setShowStatsOnly] = useState(false);

  // Поиск
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFrom, setYearFrom] = useState<number>(2020);
  const [yearTo, setYearTo] = useState<number>(new Date().getFullYear());
  const [freeFullText, setFreeFullText] = useState(false);
  const [pubTypes, setPubTypes] = useState<string[]>([]);
  const [maxResults, setMaxResults] = useState(100);
  const [searching, setSearching] = useState(false);

  // Выбранная статья для просмотра
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  async function loadArticles() {
    setLoading(true);
    setError(null);
    try {
      const status = viewStatus === "all" ? undefined : viewStatus;
      const res = await apiGetArticles(projectId, status, showStatsOnly || undefined);
      setArticles(res.articles);
      setCounts(res.counts);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки статей");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles();
  }, [projectId, viewStatus, showStatsOnly]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    setOk(null);

    const filters: SearchFilters = {};
    if (yearFrom) filters.yearFrom = yearFrom;
    if (yearTo) filters.yearTo = yearTo;
    if (freeFullText) filters.freeFullTextOnly = true;
    if (pubTypes.length > 0) filters.publicationTypes = pubTypes;

    try {
      const res = await apiSearchArticles(projectId, searchQuery.trim(), filters, maxResults);
      setOk(res.message);
      setShowSearch(false);
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка поиска");
    } finally {
      setSearching(false);
    }
  }

  async function handleStatusChange(article: Article, newStatus: "candidate" | "selected" | "excluded") {
    try {
      await apiUpdateArticleStatus(projectId, article.id, newStatus);
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка обновления статуса");
    }
  }

  async function handleRemove(article: Article) {
    if (!confirm(`Удалить статью "${article.title_en.slice(0, 50)}..." из проекта?`)) return;
    try {
      await apiRemoveArticle(projectId, article.id);
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка удаления");
    }
  }

  function togglePubType(pt: string) {
    setPubTypes((prev) =>
      prev.includes(pt) ? prev.filter((x) => x !== pt) : [...prev, pt]
    );
  }

  const total = counts.candidate + counts.selected + counts.excluded;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="row space" style={{ marginBottom: 12 }}>
        <h2>База статей ({total})</h2>
        {canEdit && (
          <button
            className="btn"
            onClick={() => setShowSearch(!showSearch)}
            type="button"
          >
            {showSearch ? "Скрыть поиск" : "🔍 Поиск в PubMed"}
          </button>
        )}
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {ok && <div className="ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {/* Форма поиска */}
      {showSearch && (
        <form onSubmit={handleSearch} className="card" style={{ marginBottom: 16 }}>
          <h3>Поиск статей в PubMed</h3>
          <div className="stack">
            <label className="stack">
              <span>Поисковый запрос *</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='например: "heart failure" AND "machine learning"'
                required
              />
            </label>

            <div className="row gap" style={{ flexWrap: "wrap" }}>
              <label className="stack" style={{ flex: 1, minWidth: 120 }}>
                <span>Год от</span>
                <input
                  type="number"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(Number(e.target.value))}
                  min={1900}
                  max={2100}
                />
              </label>
              <label className="stack" style={{ flex: 1, minWidth: 120 }}>
                <span>Год до</span>
                <input
                  type="number"
                  value={yearTo}
                  onChange={(e) => setYearTo(Number(e.target.value))}
                  min={1900}
                  max={2100}
                />
              </label>
              <label className="stack" style={{ flex: 1, minWidth: 120 }}>
                <span>Макс. результатов</span>
                <input
                  type="number"
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  min={10}
                  max={500}
                />
              </label>
            </div>

            <label className="row gap" style={{ alignItems: "center" }}>
              <input
                type="checkbox"
                checked={freeFullText}
                onChange={(e) => setFreeFullText(e.target.checked)}
                style={{ width: "auto" }}
              />
              <span>Только бесплатные полнотекстовые</span>
            </label>

            <div>
              <span className="muted">Тип публикации:</span>
              <div className="row gap" style={{ flexWrap: "wrap", marginTop: 6 }}>
                {PUBLICATION_TYPES.map((pt) => (
                  <label key={pt} className="row gap" style={{ alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={pubTypes.includes(pt)}
                      onChange={() => togglePubType(pt)}
                      style={{ width: "auto" }}
                    />
                    <span style={{ fontSize: 13 }}>{pt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="row gap">
              <button className="btn" disabled={searching} type="submit">
                {searching ? "Поиск..." : "Найти и добавить"}
              </button>
              <button
                className="btn secondary"
                onClick={() => setShowSearch(false)}
                type="button"
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Фильтры */}
      <div className="row gap" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <button
          className={viewStatus === "candidate" ? "btn" : "btn secondary"}
          onClick={() => setViewStatus("candidate")}
          type="button"
        >
          Кандидаты ({counts.candidate})
        </button>
        <button
          className={viewStatus === "selected" ? "btn" : "btn secondary"}
          onClick={() => setViewStatus("selected")}
          type="button"
        >
          ✅ Отобранные ({counts.selected})
        </button>
        <button
          className={viewStatus === "excluded" ? "btn" : "btn secondary"}
          onClick={() => setViewStatus("excluded")}
          type="button"
        >
          ❌ Исключённые ({counts.excluded})
        </button>
        <button
          className={viewStatus === "all" ? "btn" : "btn secondary"}
          onClick={() => setViewStatus("all")}
          type="button"
        >
          Все ({total})
        </button>
        <label className="row gap" style={{ alignItems: "center", marginLeft: 12 }}>
          <input
            type="checkbox"
            checked={showStatsOnly}
            onChange={(e) => setShowStatsOnly(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span className="muted">Только со статистикой</span>
        </label>
      </div>

      {/* Таблица статей */}
      {loading ? (
        <div className="muted">Загрузка...</div>
      ) : articles.length === 0 ? (
        <div className="muted">
          Нет статей. {canEdit && "Используйте поиск чтобы добавить статьи из PubMed."}
        </div>
      ) : (
        <div className="articles-table">
          {articles.map((a) => (
            <div
              key={a.id}
              className={`article-row ${a.has_stats ? "has-stats" : ""}`}
              onClick={() => setSelectedArticle(a)}
            >
              <div className="article-main">
                <div className="article-title">
                  {a.title_ru || a.title_en}
                  {a.has_stats && <span className="stats-badge">📊</span>}
                </div>
                <div className="article-meta">
                  {a.authors?.slice(0, 3).join(", ")}
                  {a.authors && a.authors.length > 3 && " et al."}
                  {a.year && ` • ${a.year}`}
                  {a.journal && ` • ${a.journal}`}
                </div>
                <div className="article-ids">
                  {a.pmid && <span className="id-badge">PMID: {a.pmid}</span>}
                  {a.doi && <span className="id-badge">DOI: {a.doi}</span>}
                </div>
              </div>
              {canEdit && (
                <div className="article-actions" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={a.status}
                    onChange={(e) =>
                      handleStatusChange(a, e.target.value as any)
                    }
                    style={{ padding: "6px 8px", borderRadius: 6 }}
                  >
                    <option value="candidate">Кандидат</option>
                    <option value="selected">✅ Отобрана</option>
                    <option value="excluded">❌ Исключена</option>
                  </select>
                  <button
                    className="btn secondary"
                    onClick={() => handleRemove(a)}
                    style={{ padding: "6px 10px", fontSize: 12 }}
                    type="button"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно просмотра статьи */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal article-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row space" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Просмотр статьи</h3>
              <button
                className="btn secondary"
                onClick={() => setSelectedArticle(null)}
                type="button"
              >
                ✕
              </button>
            </div>

            <h4>{selectedArticle.title_ru || selectedArticle.title_en}</h4>
            {selectedArticle.title_ru && (
              <p className="muted" style={{ fontSize: 13 }}>
                {selectedArticle.title_en}
              </p>
            )}

            <div className="article-meta" style={{ marginBottom: 12 }}>
              {selectedArticle.authors?.join(", ")}
              {selectedArticle.year && ` (${selectedArticle.year})`}
              {selectedArticle.journal && ` — ${selectedArticle.journal}`}
            </div>

            <div style={{ marginBottom: 12 }}>
              {selectedArticle.pmid && (
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="id-badge"
                  style={{ marginRight: 8 }}
                >
                  PubMed ↗
                </a>
              )}
              {selectedArticle.doi && (
                <a
                  href={`https://doi.org/${selectedArticle.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="id-badge"
                >
                  DOI ↗
                </a>
              )}
            </div>

            {selectedArticle.has_stats && (
              <div className="ok" style={{ marginBottom: 12 }}>
                📊 Статистика обнаружена в абстракте
              </div>
            )}

            <h5>Абстракт</h5>
            <div
              className="abstract-text"
              style={{
                maxHeight: 300,
                overflow: "auto",
                padding: 12,
                background: "#0f1626",
                borderRadius: 8,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {selectedArticle.abstract_ru || selectedArticle.abstract_en || "Нет абстракта"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
