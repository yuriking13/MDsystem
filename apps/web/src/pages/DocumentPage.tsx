import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TiptapEditor from "../components/TiptapEditor/TiptapEditor";
import {
  apiGetDocument,
  apiUpdateDocument,
  apiGetArticles,
  apiAddCitation,
  apiRemoveCitation,
  apiUpdateCitation,
  apiGetProject,
  apiGetStatistics,
  apiMarkStatisticUsedInDocument,
  type Document,
  type Article,
  type Citation,
  type CitationStyle,
  type ProjectStatistic,
} from "../lib/api";
import ChartFromTable, { CHART_TYPE_INFO, ChartCreatorModal, type ChartType, type TableData } from "../components/ChartFromTable";

// Простое форматирование цитаты для отображения в панели
// Всегда используем язык оригинала (английский)
function formatCitationSimple(
  article: { 
    title_en: string; 
    title_ru?: string | null; 
    authors?: string[] | null; 
    year?: number | null;
    journal?: string | null;
  },
  style: CitationStyle
): string {
  const authors = article.authors || [];
  const firstAuthor = authors[0] || 'Anonymous';
  // Всегда используем оригинальное название (английское)
  const title = article.title_en;
  const year = article.year || 'n.d.';
  
  // Сокращаем имя первого автора
  const parts = firstAuthor.split(' ');
  const shortAuthor = parts.length > 1 
    ? `${parts[0]} ${parts.slice(1).map(p => p[0] + '.').join('')}`
    : parts[0];
  
  switch (style) {
    case 'gost':
      // ГОСТ для иностранных источников использует оригинальный язык
      return `${shortAuthor}${authors.length > 1 ? ' et al.' : ''} ${title.slice(0, 60)}${title.length > 60 ? '...' : ''} (${year})`;
    case 'apa':
      return `${shortAuthor}${authors.length > 1 ? ' et al.' : ''} (${year}). ${title.slice(0, 50)}...`;
    case 'vancouver':
      return `${shortAuthor}${authors.length > 1 ? ' et al' : ''}. ${title.slice(0, 50)}... ${year}`;
    default:
      return `${shortAuthor} (${year}) ${title.slice(0, 50)}...`;
  }
}

export default function DocumentPage() {
  const { projectId, docId } = useParams<{ projectId: string; docId: string }>();
  const nav = useNavigate();

  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("gost");

  // Модальное окно выбора статьи для цитаты
  const [showCitationPicker, setShowCitationPicker] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchArticle, setSearchArticle] = useState("");
  
  // Модальное окно импорта из статистики
  const [showImportModal, setShowImportModal] = useState(false);
  const [statistics, setStatistics] = useState<ProjectStatistic[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Модальное окно создания графика из таблицы
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartTableHtml, setChartTableHtml] = useState("");

  // Загрузка документа и проекта
  useEffect(() => {
    if (!projectId || !docId) return;

    async function load() {
      setLoading(true);
      try {
        const [docRes, projRes] = await Promise.all([
          apiGetDocument(projectId!, docId!),
          apiGetProject(projectId!),
        ]);
        setDoc(docRes.document);
        setTitle(docRes.document.title);
        setContent(docRes.document.content || "");
        setCitationStyle(projRes.project.citation_style || "gost");
      } catch (err: any) {
        setError(err?.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId, docId]);

  // Автосохранение при изменении контента
  const saveDocument = useCallback(
    async (newContent: string) => {
      if (!projectId || !docId) return;
      setSaving(true);
      try {
        await apiUpdateDocument(projectId, docId, { content: newContent });
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [projectId, docId]
  );

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content && content !== doc?.content) {
        saveDocument(content);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, doc?.content, saveDocument]);

  // Сохранить заголовок
  async function handleTitleBlur() {
    if (!projectId || !docId || title === doc?.title) return;
    try {
      await apiUpdateDocument(projectId, docId, { title });
    } catch (err) {
      console.error("Title save error:", err);
    }
  }

  // Открыть picker для вставки цитаты
  async function openCitationPicker() {
    if (!projectId) return;
    setShowCitationPicker(true);

    try {
      const res = await apiGetArticles(projectId, "selected");
      setArticles(res.articles);
    } catch (err) {
      console.error("Load articles error:", err);
    }
  }
  
  // Открыть модал импорта из статистики
  async function openImportModal() {
    if (!projectId) return;
    setShowImportModal(true);
    setLoadingStats(true);
    
    try {
      const res = await apiGetStatistics(projectId);
      setStatistics(res.statistics);
    } catch (err) {
      console.error("Load statistics error:", err);
    } finally {
      setLoadingStats(false);
    }
  }
  
  // Вставить статистику в редактор
  async function handleInsertStatistic(stat: ProjectStatistic) {
    if (!stat.table_data || !stat.config || !projectId || !docId) return;
    
    setShowImportModal(false);
    
    // Небольшая задержка чтобы редактор успел зарегистрировать функцию
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Используем глобальную функцию вставки графика
    const fn = (window as any).__editorInsertChart;
    if (fn) {
      fn({
        id: stat.id,
        config: stat.config,
        table_data: stat.table_data
      });
      
      // Отмечаем статистику как используемую в этом документе
      try {
        await apiMarkStatisticUsedInDocument(projectId, stat.id, docId);
      } catch (err) {
        console.error("Failed to mark statistic as used:", err);
      }
    } else {
      console.warn("Chart insertion function not available");
    }
  }
  
  // Открыть модал создания графика из таблицы
  function openChartModal(tableHtml: string) {
    setChartTableHtml(tableHtml);
    setShowChartModal(true);
  }
  
  // Вставить график из таблицы
  function handleInsertChartFromTable(chartHtml: string, chartId?: string) {
    const fn = (window as any).__editorInsertChart;
    if (fn) {
      // Parse the chart data from HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(chartHtml, 'text/html');
      const chartContainer = doc.querySelector('.chart-container');
      const chartDataStr = chartContainer?.getAttribute('data-chart');
      
      if (chartDataStr) {
        try {
          const rawData = JSON.parse(chartDataStr.replace(/&#39;/g, "'"));
          // Convert to the format expected by __editorInsertChart
          const chartData = {
            id: rawData.chartId || chartId || `chart_${Date.now()}`,
            config: rawData.config,
            table_data: rawData.tableData,
          };
          fn(chartData);
        } catch (err) {
          console.error("Failed to parse chart data:", err);
        }
      }
    }
    setShowChartModal(false);
  }
  
  // Вставить таблицу из статистики
  async function handleInsertTable(stat: ProjectStatistic) {
    if (!stat.table_data || !projectId || !docId) return;
    
    setShowImportModal(false);
    
    const tableData = stat.table_data as TableData;
    const fn = (window as any).__editorInsertTable;
    
    if (fn) {
      fn(tableData, stat.title);
      
      // Отмечаем статистику как используемую
      try {
        await apiMarkStatisticUsedInDocument(projectId, stat.id, docId);
      } catch (err) {
        console.error("Failed to mark statistic as used:", err);
      }
    } else {
      console.warn("Table insertion function not available");
    }
  }

  // Добавить цитату - всегда создаём новую запись (можно несколько цитат к одному источнику)
  async function handleAddCitation(article: Article) {
    if (!projectId || !docId) return;

    try {
      // Всегда создаём новую цитату
      const res = await apiAddCitation(projectId, docId, article.id);
      
      // sub_number используется для нумерации цитат
      const subNumber = (res.citation as { sub_number?: number }).sub_number || 1;
      
      // TODO: Implement citation insertion for Lexical editor
      // Need to add editorRef to LexicalEditor component and create insertCitation method
      // insertCitationToEditor(
      //   res.citation.inline_number,
      //   res.citation.id,
      //   res.citation.note || '',
      //   article.title_en // Всегда язык оригинала (английский)
      // );
      
      // Обновить документ
      const updated = await apiGetDocument(projectId, docId);
      setDoc(updated.document);
      
      setShowCitationPicker(false);
    } catch (err: any) {
      setError(err?.message || "Ошибка добавления цитаты");
    }
  }

  // Клик по цитате в тексте - скролл к списку литературы
  function handleCitationClick(citationNumber: number, citationId: string) {
    // Находим элемент в списке литературы и скроллим к нему
    const element = document.getElementById(`citation-${citationId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Подсветим ненадолго
      element.classList.add('citation-highlight');
      setTimeout(() => {
        element.classList.remove('citation-highlight');
      }, 2000);
    }
  }

  // Удалить цитату
  async function handleRemoveCitation(citationId: string) {
    if (!projectId || !docId) return;
    
    try {
      await apiRemoveCitation(projectId, docId, citationId);
      // Обновить документ
      const updated = await apiGetDocument(projectId, docId);
      setDoc(updated.document);
    } catch (err: any) {
      setError(err?.message || "Ошибка удаления цитаты");
    }
  }

  // Фильтр статей
  const filteredArticles = searchArticle
    ? articles.filter(
        (a) =>
          a.title_en.toLowerCase().includes(searchArticle.toLowerCase()) ||
          a.title_ru?.toLowerCase().includes(searchArticle.toLowerCase())
      )
    : articles;

  if (loading) {
    return (
      <div className="container">
        <div className="muted">Загрузка документа...</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="container">
        <div className="alert">Документ не найден</div>
        <button className="btn" onClick={() => nav(-1)}>
          ← Назад
        </button>
      </div>
    );
  }

  return (
    <div className="document-page-container">
      {/* Header */}
      <div className="document-header">
        <div className="row gap">
          <button className="btn secondary" onClick={() => nav(`/projects/${projectId}`)}>
            ← К проекту
          </button>
          <input
            className="doc-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Название документа"
          />
        </div>
        <div className="row gap">
          {saving && <span className="muted">Сохранение...</span>}
          {!saving && <span className="muted" style={{ color: "#4ade80" }}>✓ Сохранено</span>}
        </div>
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Основной контент */}
      <div className="document-content">
        {/* Редактор */}
        <div className="document-editor-wrapper">
          <TiptapEditor
            content={content}
            onChange={setContent}
            onInsertCitation={openCitationPicker}
            onImportStatistic={openImportModal}
            onCreateChartFromTable={openChartModal}
            citationStyle={citationStyle}
          />
        </div>

        {/* Панель цитат */}
        <div className="citations-panel-fixed">
          <div className="row space" style={{ marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Список литературы ({doc.citations?.length || 0})</h4>
            <span className="id-badge" title="Стиль цитирования">
              {citationStyle.toUpperCase()}
            </span>
          </div>
          {doc.citations && doc.citations.length > 0 ? (
            <ul className="citations-list">
              {doc.citations.map((c) => {
                // Формируем номер с учётом sub_number
                const subNum = c.sub_number || 1;
                const displayNum = subNum > 1 ? `${c.inline_number}.${subNum}` : String(c.inline_number);
                
                return (
                <li key={c.id} id={`citation-${c.id}`} className="citation-list-item">
                  <div className="citation-item" style={{ flexDirection: 'column', gap: 8 }}>
                    <div className="row space" style={{ width: '100%' }}>
                      <span 
                        className="citation-number clickable"
                        title="Скопировать ссылку для вставки в текст"
                        onClick={() => {
                          // Копируем формат цитаты для вставки
                          navigator.clipboard.writeText(`[${c.inline_number}]`);
                        }}
                      >
                        [{displayNum}]
                      </span>
                      <button
                        className="btn secondary"
                        onClick={() => handleRemoveCitation(c.id)}
                        style={{ padding: "2px 6px", fontSize: 10 }}
                        title="Удалить цитату"
                      >
                        ✕
                      </button>
                    </div>
                    <div 
                      className="citation-text"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (c.article.doi) {
                          window.open(`https://doi.org/${c.article.doi}`, '_blank');
                        } else if (c.article.pmid) {
                          window.open(`https://pubmed.ncbi.nlm.nih.gov/${c.article.pmid}`, '_blank');
                        }
                      }}
                      title="Открыть оригинал статьи"
                    >
                      {formatCitationSimple(c.article, citationStyle)}
                    </div>
                    {c.note && (
                      <div 
                        className="citation-quote"
                        style={{
                          fontSize: 11,
                          fontStyle: 'italic',
                          color: 'var(--text-muted)',
                          borderLeft: '2px solid var(--accent)',
                          paddingLeft: 8,
                          marginTop: 4,
                        }}
                      >
                        "{c.note}"
                      </div>
                    )}
                    <input
                      placeholder="+ Добавить цитату из текста..."
                      defaultValue={c.note || ''}
                      onBlur={async (e) => {
                        const newNote = e.target.value.trim();
                        if (newNote !== (c.note || '')) {
                          try {
                            await apiUpdateCitation(projectId!, docId!, c.id, { note: newNote });
                            // Обновляем локально
                            const updated = await apiGetDocument(projectId!, docId!);
                            setDoc(updated.document);
                          } catch (err) {
                            console.error('Update note error:', err);
                          }
                        }
                      }}
                      style={{
                        fontSize: 11,
                        padding: '6px 8px',
                        background: 'var(--bg-glass-light)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: 6,
                      }}
                    />
                  </div>
                </li>
              );
              })}
            </ul>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              Нажмите "📖 Цитата" в редакторе чтобы добавить ссылки на литературу
            </div>
          )}
        </div>
      </div>

      {/* Модалка выбора статьи */}
      {showCitationPicker && (
        <div className="modal-overlay" onClick={() => setShowCitationPicker(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="row space" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Выберите статью</h3>
              <button
                className="btn secondary"
                onClick={() => setShowCitationPicker(false)}
              >
                ✕
              </button>
            </div>

            <input
              placeholder="Поиск по названию..."
              value={searchArticle}
              onChange={(e) => setSearchArticle(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            <div style={{ maxHeight: 400, overflow: "auto" }}>
              {filteredArticles.length === 0 ? (
                <div className="muted">
                  Нет отобранных статей. Сначала отберите статьи в базе.
                </div>
              ) : (
                filteredArticles.map((a) => (
                  <div
                    key={a.id}
                    className="article-picker-item"
                    onClick={() => handleAddCitation(a)}
                  >
                    <div style={{ fontWeight: 500 }}>
                      {a.title_en || a.title_ru}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {a.authors?.slice(0, 2).join(", ")}
                      {a.year && ` • ${a.year}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Модалка импорта из статистики */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>📥 Импорт из Статистики</h3>
              <button
                className="btn secondary"
                onClick={() => setShowImportModal(false)}
              >
                ✕
              </button>
            </div>
            
            <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
              Выберите что вставить: таблицу с данными или график
            </p>

            <div style={{ maxHeight: 500, overflow: "auto" }}>
              {loadingStats ? (
                <div className="muted">Загрузка...</div>
              ) : statistics.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: 40 }}>
                  Нет доступных данных.<br/>
                  Создайте их в разделе Статистика проекта.
                </div>
              ) : (
                <div className="import-stats-list">
                  {statistics.map((stat) => {
                    const chartInfo = stat.chart_type ? CHART_TYPE_INFO[stat.chart_type as ChartType] : null;
                    const tableData = stat.table_data as TableData | null;
                    
                    return (
                      <div
                        key={stat.id}
                        className="import-stat-item-expanded"
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        <div className="import-stat-header" style={{ marginBottom: 12 }}>
                          <div className="import-stat-title" style={{ fontSize: 15, fontWeight: 600 }}>
                            {chartInfo?.icon || '📊'} {stat.title || 'Без названия'}
                          </div>
                          {stat.description && (
                            <div className="import-stat-desc muted" style={{ fontSize: 12, marginTop: 4 }}>
                              {stat.description}
                            </div>
                          )}
                        </div>
                        
                        <div className="row gap" style={{ alignItems: 'flex-start' }}>
                          {/* Таблица */}
                          {tableData && (
                            <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                                Таблица ({tableData.rows?.length || 0} строк)
                              </div>
                              <div style={{ maxHeight: 150, overflow: 'auto', fontSize: 11 }}>
                                <table style={{ 
                                  width: '100%', 
                                  borderCollapse: 'collapse',
                                  color: '#1e293b',
                                }}>
                                  <thead>
                                    <tr>
                                      {tableData.headers?.map((h, i) => (
                                        <th key={i} style={{ 
                                          border: '1px solid #d1d5db', 
                                          padding: '4px 8px',
                                          background: '#f3f4f6',
                                          fontWeight: 600,
                                        }}>
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tableData.rows?.slice(0, 5).map((row, i) => (
                                      <tr key={i}>
                                        {row.map((cell, j) => (
                                          <td key={j} style={{ 
                                            border: '1px solid #d1d5db', 
                                            padding: '4px 8px',
                                          }}>
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                    {(tableData.rows?.length || 0) > 5 && (
                                      <tr>
                                        <td colSpan={tableData.headers?.length || 1} style={{
                                          textAlign: 'center',
                                          color: '#64748b',
                                          padding: 4,
                                        }}>
                                          ... ещё {(tableData.rows?.length || 0) - 5} строк
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <button 
                                className="btn secondary"
                                style={{ marginTop: 12, width: '100%' }}
                                onClick={() => handleInsertTable(stat)}
                              >
                                📋 Вставить таблицу
                              </button>
                            </div>
                          )}
                          
                          {/* График */}
                          {stat.config && tableData && (
                            <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                                {chartInfo?.name || 'График'}
                              </div>
                              <div style={{ height: 150 }}>
                                <ChartFromTable 
                                  tableData={tableData} 
                                  config={stat.config as any} 
                                  height={150} 
                                />
                              </div>
                              <button 
                                className="btn"
                                style={{ marginTop: 12, width: '100%' }}
                                onClick={() => handleInsertStatistic(stat)}
                              >
                                📊 Вставить график
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Модалка создания графика из таблицы */}
      {showChartModal && chartTableHtml && (
        <ChartCreatorModal
          tableHtml={chartTableHtml}
          onClose={() => setShowChartModal(false)}
          onInsert={handleInsertChartFromTable}
        />
      )}
    </div>
  );
}
