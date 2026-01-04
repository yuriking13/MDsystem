import React, { useEffect, useState } from "react";
import {
  apiSearchArticles,
  apiGetArticles,
  apiUpdateArticleStatus,
  apiRemoveArticle,
  apiTranslateArticles,
  type Article,
  type SearchFilters,
} from "../lib/api";

type Props = {
  projectId: string;
  canEdit: boolean;
};

const PUBLICATION_TYPES = [
  { id: "systematic_review", label: "Систематический обзор", pubmed: "Systematic Review" },
  { id: "meta_analysis", label: "Мета-анализ", pubmed: "Meta-Analysis" },
  { id: "rct", label: "РКИ", pubmed: "Randomized Controlled Trial" },
  { id: "clinical_trial", label: "Клиническое исследование", pubmed: "Clinical Trial" },
  { id: "review", label: "Обзор", pubmed: "Review" },
  { id: "books", label: "Книги", pubmed: "Book" },
];

const DATE_PRESETS = [
  { id: "1m", label: "Последний месяц", months: 1 },
  { id: "6m", label: "Последние 6 месяцев", months: 6 },
  { id: "1y", label: "Последний год", months: 12 },
  { id: "2y", label: "Последние 2 года", months: 24 },
  { id: "3y", label: "Последние 3 года", months: 36 },
  { id: "5y", label: "Последние 5 лет", months: 60 },
  { id: "10y", label: "Последние 10 лет", months: 120 },
  { id: "custom", label: "Произвольный период", months: 0 },
];

const TEXT_AVAILABILITY = [
  { id: "any", label: "Любой (абстракт)" },
  { id: "full", label: "Полный текст" },
  { id: "free_full", label: "Бесплатный полный текст" },
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
  
  // Период
  const [datePreset, setDatePreset] = useState("5y");
  const [customYearFrom, setCustomYearFrom] = useState<number>(2020);
  const [customYearTo, setCustomYearTo] = useState<number>(new Date().getFullYear());
  
  // Доступность текста
  const [textAvailability, setTextAvailability] = useState("any");
  
  // Типы публикаций
  const [pubTypes, setPubTypes] = useState<string[]>([]);
  const [pubTypesLogic, setPubTypesLogic] = useState<"or" | "and">("or");
  
  // Перевод
  const [translateAfterSearch, setTranslateAfterSearch] = useState(false);
  
  const [maxResults, setMaxResults] = useState(100);
  const [searching, setSearching] = useState(false);
  
  // Перевод постфактум
  const [translating, setTranslating] = useState(false);

  // Выбранная статья для просмотра
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

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

  // Вычислить годы из пресета
  function getYearsFromPreset(): { yearFrom: number; yearTo: number } {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (datePreset === "custom") {
      return { yearFrom: customYearFrom, yearTo: customYearTo };
    }
    
    const preset = DATE_PRESETS.find((p) => p.id === datePreset);
    if (!preset || preset.months === 0) {
      return { yearFrom: currentYear - 5, yearTo: currentYear };
    }
    
    const fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - preset.months);
    
    return { yearFrom: fromDate.getFullYear(), yearTo: currentYear };
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    setOk(null);

    const { yearFrom, yearTo } = getYearsFromPreset();
    
    const filters: SearchFilters = {
      yearFrom,
      yearTo,
    };
    
    // Доступность текста
    if (textAvailability === "free_full") {
      filters.freeFullTextOnly = true;
    } else if (textAvailability === "full") {
      filters.fullTextOnly = true;
    }
    
    // Типы публикаций
    if (pubTypes.length > 0) {
      const pubmedTypes = PUBLICATION_TYPES
        .filter((pt) => pubTypes.includes(pt.id))
        .map((pt) => pt.pubmed);
      filters.publicationTypes = pubmedTypes;
      filters.publicationTypesLogic = pubTypesLogic;
    }
    
    // Перевод
    filters.translate = translateAfterSearch;

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

  // Перевести непереведённые статьи
  async function handleTranslate() {
    setTranslating(true);
    setError(null);
    setOk(null);
    
    try {
      const res = await apiTranslateArticles(projectId);
      setOk(res.message);
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка перевода");
    } finally {
      setTranslating(false);
    }
  }

  const total = counts.candidate + counts.selected + counts.excluded;
  
  // Подсчёт непереведённых статей
  const untranslatedCount = articles.filter((a) => !a.title_ru).length;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="row space" style={{ marginBottom: 12 }}>
        <h2>База статей ({total})</h2>
        <div className="row gap">
          {canEdit && untranslatedCount > 0 && (
            <button
              className="btn secondary"
              onClick={handleTranslate}
              disabled={translating}
              type="button"
              title={`Перевести ${untranslatedCount} статей без перевода`}
            >
              {translating ? "Переводим..." : `🌐 Перевести (${untranslatedCount})`}
            </button>
          )}
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

            {/* Период публикации */}
            <div>
              <span className="muted">Период публикации:</span>
              <div className="row gap" style={{ flexWrap: "wrap", marginTop: 6 }}>
                {DATE_PRESETS.map((preset) => (
                  <label key={preset.id} className="row gap" style={{ alignItems: "center" }}>
                    <input
                      type="radio"
                      name="datePreset"
                      checked={datePreset === preset.id}
                      onChange={() => setDatePreset(preset.id)}
                      style={{ width: "auto" }}
                    />
                    <span style={{ fontSize: 13 }}>{preset.label}</span>
                  </label>
                ))}
              </div>
              
              {datePreset === "custom" && (
                <div className="row gap" style={{ marginTop: 8 }}>
                  <label className="stack" style={{ flex: 1 }}>
                    <span>Год от</span>
                    <input
                      type="number"
                      value={customYearFrom}
                      onChange={(e) => setCustomYearFrom(Number(e.target.value))}
                      min={1900}
                      max={2100}
                    />
                  </label>
                  <label className="stack" style={{ flex: 1 }}>
                    <span>Год до</span>
                    <input
                      type="number"
                      value={customYearTo}
                      onChange={(e) => setCustomYearTo(Number(e.target.value))}
                      min={1900}
                      max={2100}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Доступность текста */}
            <div>
              <span className="muted">Доступность текста:</span>
              <div className="row gap" style={{ flexWrap: "wrap", marginTop: 6 }}>
                {TEXT_AVAILABILITY.map((opt) => (
                  <label key={opt.id} className="row gap" style={{ alignItems: "center" }}>
                    <input
                      type="radio"
                      name="textAvailability"
                      checked={textAvailability === opt.id}
                      onChange={() => setTextAvailability(opt.id)}
                      style={{ width: "auto" }}
                    />
                    <span style={{ fontSize: 13 }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Тип публикации */}
            <div>
              <div className="row gap" style={{ alignItems: "center", marginBottom: 6 }}>
                <span className="muted">Тип публикации:</span>
                {pubTypes.length > 1 && (
                  <div className="row gap" style={{ marginLeft: 12 }}>
                    <label className="row gap" style={{ alignItems: "center" }}>
                      <input
                        type="radio"
                        name="pubTypesLogic"
                        checked={pubTypesLogic === "or"}
                        onChange={() => setPubTypesLogic("or")}
                        style={{ width: "auto" }}
                      />
                      <span style={{ fontSize: 12 }}>ИЛИ</span>
                    </label>
                    <label className="row gap" style={{ alignItems: "center" }}>
                      <input
                        type="radio"
                        name="pubTypesLogic"
                        checked={pubTypesLogic === "and"}
                        onChange={() => setPubTypesLogic("and")}
                        style={{ width: "auto" }}
                      />
                      <span style={{ fontSize: 12 }}>И</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="row gap" style={{ flexWrap: "wrap" }}>
                {PUBLICATION_TYPES.map((pt) => (
                  <label key={pt.id} className="row gap" style={{ alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={pubTypes.includes(pt.id)}
                      onChange={() => togglePubType(pt.id)}
                      style={{ width: "auto" }}
                    />
                    <span style={{ fontSize: 13 }}>{pt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Дополнительные опции */}
            <div className="row gap" style={{ flexWrap: "wrap", alignItems: "center" }}>
              <label className="stack" style={{ minWidth: 150 }}>
                <span>Макс. результатов</span>
                <input
                  type="number"
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  min={10}
                  max={500}
                />
              </label>
              
              <label className="row gap" style={{ alignItems: "center", marginTop: 20 }}>
                <input
                  type="checkbox"
                  checked={translateAfterSearch}
                  onChange={(e) => setTranslateAfterSearch(e.target.checked)}
                  style={{ width: "auto" }}
                />
                <span>🌐 Перевести заголовки и абстракты (RU)</span>
              </label>
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
                  {a.title_ru && <span className="translate-badge">🌐</span>}
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
        <div className="modal-overlay" onClick={() => { setSelectedArticle(null); setShowOriginal(false); }}>
          <div className="modal article-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row space" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Просмотр статьи</h3>
              <div className="row gap">
                {selectedArticle.title_ru && (
                  <button
                    className={`btn ${showOriginal ? "secondary" : ""}`}
                    onClick={() => setShowOriginal(!showOriginal)}
                    type="button"
                    style={{ fontSize: 12, padding: "6px 10px" }}
                  >
                    {showOriginal ? "🌐 Перевод" : "EN Оригинал"}
                  </button>
                )}
                <button
                  className="btn secondary"
                  onClick={() => { setSelectedArticle(null); setShowOriginal(false); }}
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>

            <h4>
              {showOriginal || !selectedArticle.title_ru 
                ? selectedArticle.title_en 
                : selectedArticle.title_ru}
            </h4>
            {selectedArticle.title_ru && !showOriginal && (
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
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
              {!selectedArticle.title_ru && (
                <span className="id-badge" style={{ background: "#2a2a1a", color: "#d4a" }}>
                  Нет перевода
                </span>
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
              {showOriginal || !selectedArticle.abstract_ru 
                ? (selectedArticle.abstract_en || "Нет абстракта")
                : selectedArticle.abstract_ru}
            </div>
            
            {selectedArticle.abstract_ru && !showOriginal && selectedArticle.abstract_en && (
              <details style={{ marginTop: 12 }}>
                <summary className="muted" style={{ cursor: "pointer" }}>
                  Показать оригинал абстракта
                </summary>
                <div
                  className="abstract-text muted"
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: "#0a0f1a",
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {selectedArticle.abstract_en}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
