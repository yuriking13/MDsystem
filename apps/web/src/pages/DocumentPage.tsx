import React, { useEffect, useState, useCallback, useRef } from "react";
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
  apiSyncStatistics,
  apiGetStatistic,
  apiUpdateStatistic,
  apiCreateStatistic,
  type Document,
  type Article,
  type Citation,
  type CitationStyle,
  type ProjectStatistic,
  type DataClassification,
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
  const hasSyncedStatistics = useRef(false);
  const isSyncingStatistics = useRef(false);

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


  // Парсинг таблиц и графиков из HTML контента
  const parseStatisticsFromContent = useCallback((htmlContent: string): { 
    tables: Array<{ id: string; title?: string; tableData: Record<string, any> }>;
    charts: Array<{ id: string; title?: string; config: Record<string, any>; tableData?: Record<string, any> }>;
  } => {
    // Защита от undefined/null контента
    if (!htmlContent) {
      return { tables: [], charts: [] };
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    
    const tables: Array<{ id: string; title?: string; tableData: Record<string, any> }> = [];
    const charts: Array<{ id: string; title?: string; config: Record<string, any>; tableData?: Record<string, any> }> = [];
    
    // Find tables - only those with valid statistic IDs
    doc.querySelectorAll('table[data-statistic-id]').forEach((table, index) => {
      const tableId = table.getAttribute('data-statistic-id');
      if (!tableId) return;
      
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tableId)) return;
      
      const headers: string[] = [];
      const rows: string[][] = [];
      
      table.querySelectorAll('tr').forEach((tr, rowIdx) => {
        const cells: string[] = [];
        tr.querySelectorAll('th, td').forEach(cell => {
          cells.push(cell.textContent || '');
        });
        
        if (rowIdx === 0 && tr.querySelector('th')) {
          headers.push(...cells);
        } else {
          rows.push(cells);
        }
      });
      
      tables.push({
        id: tableId,
        title: `Таблица ${index + 1}`,
        tableData: { headers, rows },
      });
    });
    
    // Find charts (chartNode elements)
    doc.querySelectorAll('[data-chart-id]').forEach((chartEl) => {
      const chartId = chartEl.getAttribute('data-chart-id');
      const chartDataStr = chartEl.getAttribute('data-chart') || chartEl.getAttribute('data-config');
      
      if (chartId) {
        let config: Record<string, any> = {};
        let tableData: Record<string, any> | undefined;
        
        if (chartDataStr) {
          try {
            const parsed = JSON.parse(chartDataStr.replace(/&#39;/g, "'"));
            config = parsed.config || parsed;
            tableData = parsed.tableData;
          } catch {
            // ignore parse errors
          }
        }
        
        charts.push({
          id: chartId,
          title: chartEl.querySelector('.chart-node-title')?.textContent || 'График',
          config,
          tableData,
        });
      }
    });
    
    return { tables, charts };
  }, []);

  // Автосохранение при изменении контента
  const saveDocument = useCallback(
    async (newContent: string) => {
      if (!projectId || !docId) return;
      setSaving(true);
      try {
        await apiUpdateDocument(projectId, docId, { content: newContent });
        
        // Sync statistics (tables and charts) from document content
        const result = parseStatisticsFromContent(newContent);
        const tables = result?.tables || [];
        const charts = result?.charts || [];
        
        if (tables.length > 0 || charts.length > 0) {
          try {
            await apiSyncStatistics(projectId, {
              documentId: docId,
              tables,
              charts,
            });
          } catch (syncErr) {
            console.warn("Statistics sync warning:", syncErr);
            // Don't fail the save if sync fails
          }

          // Push updated table data back to Statistics so external views stay in sync
          const tableUpdates = tables
            .filter((t) => t.id && Array.isArray((t.tableData as any)?.headers))
            .map(async (t) => {
              try {
                await apiUpdateStatistic(projectId, t.id, {
                  tableData: t.tableData as TableData,
                });
              } catch (updateErr) {
                console.warn("Failed to update statistic from document table", t.id, updateErr);
              }
            });
          if (tableUpdates.length) {
            await Promise.allSettled(tableUpdates);
          }
        }
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [projectId, docId, parseStatisticsFromContent]
  );

  // Build table HTML from statistic data (used to refresh document tables from Statistics)
  const buildTableHtmlFromStatistic = useCallback((tableData: TableData, statisticId?: string | null) => {
    const cols = Math.max(tableData.headers?.length || 0, ...(tableData.rows || []).map((r) => r.length));
    let html = '<table class="tiptap-table"';
    if (statisticId) {
      html += ` data-statistic-id="${statisticId}"`;
    }
    html += '>';

    html += '<colgroup>';
    for (let c = 0; c < cols; c++) {
      html += '<col />';
    }
    html += '</colgroup>';

    const safeHeaders = tableData.headers || Array.from({ length: cols }, (_, i) => `Колонка ${i + 1}`);
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      const text = safeHeaders[c] ?? '';
      html += `<th><p>${text}</p></th>`;
    }
    html += '</tr>';

    (tableData.rows || []).forEach((row) => {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const text = row[c] ?? '';
        html += `<td><p>${text}</p></td>`;
      }
      html += '</tr>';
    });

    html += '</table>';
    return html;
  }, []);

  // Refresh document content with the latest data from Statistics (run once after load)
  const syncDocumentWithStatistics = useCallback(async () => {
    if (!projectId || !content) return;
    if (isSyncingStatistics.current) return;
    isSyncingStatistics.current = true;

    try {
      const parser = new DOMParser();
      const docDom = parser.parseFromString(content, "text/html");

      const tables = Array.from(docDom.querySelectorAll('table[data-statistic-id]')) as HTMLElement[];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ids = Array.from(new Set(tables
        .map((el) => el.getAttribute('data-statistic-id'))
        .filter((id): id is string => !!id && uuidRegex.test(id))));

      if (ids.length === 0) return;

      const statMap = new Map<string, TableData>();
      await Promise.allSettled(ids.map(async (id) => {
        try {
          const res = await apiGetStatistic(projectId, id);
          if (res.statistic.table_data) {
            statMap.set(id, res.statistic.table_data as TableData);
          }
        } catch (err) {
          console.warn('Failed to load statistic for sync', id, err);
        }
      }));

      // Determine which statistics were deleted server-side
      const existingIds = new Set<string>();
      try {
        const list = await apiGetStatistics(projectId);
        list.statistics.forEach((s) => existingIds.add(s.id));
      } catch (err) {
        console.warn('Failed to fetch statistics list for sync', err);
      }

      let changed = false;
      tables.forEach((tableEl) => {
        const statId = tableEl.getAttribute('data-statistic-id');
        if (!statId) return;
        const data = statMap.get(statId);

        // If statistic was removed, drop the table from the document
        if (!data && existingIds.size > 0 && !existingIds.has(statId)) {
          tableEl.remove();
          changed = true;
          return;
        }

        if (!data) return;

        const newHtml = buildTableHtmlFromStatistic(data, statId);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = newHtml;
        const newTable = wrapper.firstElementChild;
        if (newTable && newTable.outerHTML !== tableEl.outerHTML) {
          tableEl.replaceWith(newTable);
          changed = true;
        }
      });

      if (changed) {
        const updatedContent = docDom.body.innerHTML;
        setContent(updatedContent);
        setDoc((prev) => prev ? { ...prev, content: updatedContent } : prev);
        await saveDocument(updatedContent);
      }
    } finally {
      isSyncingStatistics.current = false;
    }
  }, [buildTableHtmlFromStatistic, content, projectId, saveDocument]);

  // After initial load, refresh document tables from Statistics once
  useEffect(() => {
    if (loading || hasSyncedStatistics.current) return;
    if (!content) return;
    hasSyncedStatistics.current = true;
    syncDocumentWithStatistics();
  }, [loading, content, syncDocumentWithStatistics]);

  // Re-sync on window focus to capture external Statistic edits/deletions
  useEffect(() => {
    const handler = () => {
      syncDocumentWithStatistics();
    };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [syncDocumentWithStatistics]);

  // Periodic sync (fallback) to catch changes while window stays focused
  useEffect(() => {
    const interval = setInterval(() => {
      syncDocumentWithStatistics();
    }, 20000);
    return () => clearInterval(interval);
  }, [syncDocumentWithStatistics]);

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
      
      // Отмечаем статистику как используемую в этом документе (только если ID валидный UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(stat.id)) {
        try {
          await apiMarkStatisticUsedInDocument(projectId, stat.id, docId);
        } catch (err) {
          console.error("Failed to mark statistic as used:", err);
        }
      } else {
        console.warn("Skipping usage marking - invalid statistic ID:", stat.id);
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
      fn(tableData, stat.title, stat.id);
      
      // Отмечаем статистику как используемую (только если ID валидный UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(stat.id)) {
        try {
          await apiMarkStatisticUsedInDocument(projectId, stat.id, docId);
        } catch (err) {
          console.error("Failed to mark statistic as used:", err);
        }
      } else {
        console.warn("Skipping usage marking - invalid statistic ID:", stat.id);
      }
    } else {
      console.warn("Table insertion function not available");
    }
  }

  const handleLoadStatistic = useCallback(async (statId: string) => {
    if (!projectId) return null;

    try {
      const res = await apiGetStatistic(projectId, statId);
      return res.statistic;
    } catch (err) {
      console.error("Failed to load statistic:", err);
      return null;
    }
  }, [projectId]);

  const handleSaveStatistic = useCallback(async (
    statId: string | null,
    data: {
      title?: string;
      description?: string;
      config?: Record<string, any>;
      tableData?: TableData;
      dataClassification?: DataClassification;
      chartType?: string;
    }
  ) => {
    if (!projectId || !docId) return null;

    try {
      if (statId) {
        const res = await apiUpdateStatistic(projectId, statId, {
          title: data.title,
          description: data.description,
          config: data.config,
          tableData: data.tableData,
          dataClassification: data.dataClassification,
          chartType: data.chartType,
        });

        await apiMarkStatisticUsedInDocument(projectId, res.statistic.id, docId);
        return res.statistic.id;
      }

      const res = await apiCreateStatistic(projectId, {
        type: "table",
        title: data.title || `Таблица ${new Date().toLocaleString('ru-RU')}`,
        description: data.description,
        config: data.config || {},
        tableData: data.tableData,
        dataClassification: data.dataClassification,
        chartType: data.chartType || 'bar',
      });

      await apiMarkStatisticUsedInDocument(projectId, res.statistic.id, docId);
      return res.statistic.id;
    } catch (err: any) {
      console.error("Failed to save statistic:", err);
      setError(err?.message || "Не удалось сохранить таблицу");
      return statId;
    }
  }, [projectId, docId]);

  // Автосохранение новой таблицы в Статистику
  const handleTableCreated = useCallback(async (tableData: { rows: number; cols: number; data: any[][] }) => {
    if (!projectId || !docId) return undefined;

    // Подготовим данные и дефолтную конфигурацию графика, чтобы карточка в статистике сразу была рабочей
    const rawRows = tableData.data || [];
    const headerRow = rawRows[0] || [];
    const maxCols = rawRows.reduce((m, r) => Math.max(m, r?.length || 0), headerRow.length);
    const headers = Array.from({ length: maxCols }, (_, idx) => {
      const h = headerRow[idx];
      return h && String(h).trim().length > 0 ? String(h) : `Колонка ${idx + 1}`;
    });

    const rows = rawRows.slice(1).map((row = []) => {
      const padded = Array.from({ length: maxCols }, (_, idx) => {
        const v = row[idx];
        return v === undefined || v === null ? '' : String(v);
      });
      return padded;
    });

    // Выбираем столбцы для графика: первая колонка — подписи, остальные — данные
    const labelColumn = 0;
    const dataColumns = maxCols > 1 ? Array.from({ length: maxCols - 1 }, (_, i) => i + 1) : [0];
    const xColumn = maxCols > 1 ? 1 : 0;
    const yColumn = maxCols > 2 ? 2 : dataColumns[0];

    const classification = {
      variableType: "quantitative" as const,
      subType: "continuous" as const,
    };

    try {
      const result = await apiCreateStatistic(projectId, {
        type: "table",
        title: `Таблица ${new Date().toLocaleString('ru-RU')}`,
        description: "Автоматически создана в документе",
        config: {
          type: "bar",
          title: `Таблица ${new Date().toLocaleString('ru-RU')}`,
          labelColumn,
          dataColumns,
          bins: 10,
          xColumn,
          yColumn,
          dataClassification: classification,
        },
        tableData: {
          headers,
          rows,
        },
        dataClassification: classification,
        chartType: "bar",
      });

      await apiMarkStatisticUsedInDocument(projectId, result.statistic.id, docId);
      console.log('Table auto-saved to Statistics:', result.statistic.id);
      return result.statistic.id;
    } catch (err) {
      console.error("Failed to auto-save table:", err);
      return undefined;
    }
  }, [projectId, docId]);

  // Добавить цитату - всегда создаём новую запись (можно несколько цитат к одному источнику)
  // Модальное окно НЕ закрывается, чтобы можно было добавить несколько цитат
  async function handleAddCitation(article: Article) {
    if (!projectId || !docId) return;

    try {
      // Всегда создаём новую цитату
      const res = await apiAddCitation(projectId, docId, article.id);
      
      // Вставить цитату в редактор
      const fn = (window as any).__editorInsertCitation;
      if (fn) {
        fn({
          citationId: res.citation.id,
          citationNumber: res.citation.inline_number,
          articleId: article.id,
          note: res.citation.note || '',
        });
      }
      
      // Обновить документ
      const updated = await apiGetDocument(projectId, docId);
      setDoc(updated.document);
      
      // НЕ закрываем модальное окно - пользователь может добавить ещё цитаты
      // setShowCitationPicker(false);
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

  // Обновить note (прямую цитату) для цитаты
  async function handleUpdateCitationNote(citationId: string, note: string) {
    if (!projectId || !docId) return;
    
    try {
      await apiUpdateCitation(projectId, docId, citationId, { note });
      // Обновить документ
      const updated = await apiGetDocument(projectId, docId);
      setDoc(updated.document);
    } catch (err: any) {
      setError(err?.message || "Ошибка обновления цитаты");
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
        {/* Редактор с встроенными сайдбарами */}
        <div className="document-editor-wrapper">
          <TiptapEditor
            content={content}
            onChange={setContent}
            onInsertCitation={openCitationPicker}
            onImportStatistic={openImportModal}
            onCreateChartFromTable={openChartModal}
            onRemoveCitation={handleRemoveCitation}
            onUpdateCitationNote={handleUpdateCitationNote}
            onTableCreated={handleTableCreated}
            onLoadStatistic={handleLoadStatistic}
            onSaveStatistic={handleSaveStatistic}
            citations={doc.citations || []}
            citationStyle={citationStyle}
          />
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
                            {stat.title || 'Без названия'}
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
