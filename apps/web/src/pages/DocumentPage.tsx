import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TiptapEditor, { TiptapEditorHandle } from "../components/TiptapEditor/TiptapEditor";
import CitationPicker from "../components/TiptapEditor/CitationPicker";
import {
  apiGetDocument,
  apiUpdateDocument,
  apiGetArticles,
  apiAddCitation,
  apiRemoveCitation,
  apiUpdateCitation,
  apiSyncCitations,
  apiGetProject,
  apiGetStatistics,
  apiMarkStatisticUsedInDocument,
  apiSyncStatistics,
  apiGetStatistic,
  apiUpdateStatistic,
  apiCreateStatistic,
  apiRenumberCitations,
  apiGetProjectFiles,
  apiGetFileDownloadUrl,
  apiMarkFileUsed,
  apiSyncFileUsage,
  type Document,
  type Article,
  type Citation,
  type CitationStyle,
  type ProjectStatistic,
  type DataClassification,
  type ProjectFile,
} from "../lib/api";
import { type ProjectFileNodeAttrs } from "../components/TiptapEditor/extensions/ProjectFileNode";
import ChartFromTable, { CHART_TYPE_INFO, ChartCreatorModal, type ChartType, type TableData } from "../components/ChartFromTable";

// Компонент элемента выбора файла с миниатюрой
function FilePickerItem({ file, projectId, onSelect }: { file: ProjectFile; projectId: string; onSelect: () => void }) {
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const [loadingThumb, setLoadingThumb] = React.useState(false);

  React.useEffect(() => {
    // Load thumbnail for images and videos
    if (file.category === 'image' || file.category === 'video') {
      setLoadingThumb(true);
      apiGetFileDownloadUrl(projectId, file.id)
        .then(({ url }) => setThumbnailUrl(url))
        .catch(() => setThumbnailUrl(null))
        .finally(() => setLoadingThumb(false));
    }
  }, [file.id, file.category, projectId]);

  const renderIcon = () => {
    if (loadingThumb) {
      return (
        <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
      );
    }

    if (thumbnailUrl && file.category === 'image') {
      return (
        <div style={{ width: '100%', height: 80, borderRadius: 6, overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
          <img 
            src={thumbnailUrl} 
            alt={file.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      );
    }

    if (thumbnailUrl && file.category === 'video') {
      return (
        <div style={{ width: '100%', height: 80, borderRadius: 6, overflow: 'hidden', background: 'rgba(0,0,0,0.4)', position: 'relative' }}>
          <video 
            src={thumbnailUrl} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            preload="metadata"
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'white', opacity: 0.9 }}>
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      );
    }

    // Default icons for non-media files
    return (
      <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 6 }}>
        {file.category === 'audio' && (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
        )}
        {file.category === 'document' && (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
        {file.category === 'other' && (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
        {file.category === 'image' && !thumbnailUrl && (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        )}
        {file.category === 'video' && !thumbnailUrl && (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div 
      className="file-picker-item"
      onClick={onSelect}
      style={{
        padding: 10,
        background: 'var(--bg-glass-light)',
        border: '1px solid var(--border-glass)',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.background = 'rgba(75,116,255,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-glass)';
        e.currentTarget.style.background = 'var(--bg-glass-light)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {renderIcon()}
      <div style={{ 
        fontSize: 11, 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        marginTop: 8,
        marginBottom: 2,
        fontWeight: 500,
      }} title={file.name}>
        {file.name}
      </div>
      <div className="muted" style={{ fontSize: 10 }}>
        {file.sizeFormatted}
      </div>
    </div>
  );
}

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
  const lastUserEditRef = useRef(0);
  const editorRef = useRef<TiptapEditorHandle>(null);

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
  
  // Модальное окно выбора файла из проекта
  const [showFileModal, setShowFileModal] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileFilter, setFileFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  const [fileSearch, setFileSearch] = useState('');
  
  // Состояние для обновления библиографии проекта
  const [updatingBibliography, setUpdatingBibliography] = useState(false);

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


  // Извлечение ID цитат из HTML контента
  const parseCitationsFromContent = useCallback((htmlContent: string): Set<string> => {
    if (!htmlContent) return new Set();
    
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(htmlContent, "text/html");
    const citationIds = new Set<string>();
    
    // Находим все элементы с data-citation-id
    parsedDoc.querySelectorAll('[data-citation-id]').forEach((el) => {
      const citationId = el.getAttribute('data-citation-id');
      if (citationId) {
        citationIds.add(citationId);
      }
    });
    
    return citationIds;
  }, []);

  // Извлечение ID файлов из HTML контента
  const parseFilesFromContent = useCallback((htmlContent: string): string[] => {
    if (!htmlContent) return [];
    
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(htmlContent, "text/html");
    const fileIds: string[] = [];
    
    // Находим все элементы с data-file-id (project file nodes)
    parsedDoc.querySelectorAll('[data-file-id]').forEach((el) => {
      const fileId = el.getAttribute('data-file-id');
      if (fileId) {
        fileIds.push(fileId);
      }
    });
    
    return fileIds;
  }, []);

  // Фильтрация цитат на основе текущего содержимого
  const visibleCitations = useMemo(() => {
    const citationIdsInContent = parseCitationsFromContent(content);
    
    // Если нет цитат в контенте, показываем пустой список
    if (citationIdsInContent.size === 0) {
      return [];
    }
    
    // Фильтруем цитаты, оставляя только те, что есть в контенте
    return (doc?.citations || []).filter(citation => citationIdsInContent.has(citation.id));
  }, [content, doc?.citations, parseCitationsFromContent]);

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

        // First row with th cells is treated as headers
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
  // Синхронизирует цитаты с БД:
  // - Удаляет из БД цитаты, которых больше нет в тексте
  // - Перенумеровывает оставшиеся цитаты для компактности
  const saveDocument = useCallback(
    async (newContent: string) => {
      if (!projectId || !docId) return;
      setSaving(true);
      try {
        // Проверяем, изменились ли цитаты
        const oldCitationIds = doc?.content ? parseCitationsFromContent(doc.content) : new Set<string>();
        const newCitationIds = parseCitationsFromContent(newContent);
        const citationsChanged = oldCitationIds.size !== newCitationIds.size ||
          [...oldCitationIds].some(id => !newCitationIds.has(id));
        
        await apiUpdateDocument(projectId, docId, { content: newContent });
        // Keep local doc state in sync so we don't think there are pending edits after save
        setDoc((prev) => (prev ? { ...prev, content: newContent } : prev));
        
        // Если цитаты изменились, синхронизируем с БД
        // Это удалит цитаты, которых больше нет в тексте, и перенумерует остальные
        if (citationsChanged) {
          try {
            setUpdatingBibliography(true);
            
            // Синхронизируем цитаты - передаём ID цитат, которые есть в HTML
            const citationIdsArray = Array.from(newCitationIds);
            const syncResult = await apiSyncCitations(projectId, docId, citationIdsArray);
            
            if (syncResult.document) {
              // Обновляем состояние документа с новыми цитатами
              setDoc(syncResult.document);
              
              // Если контент документа изменился (перенумерация), обновляем редактор
              if (syncResult.document.content && syncResult.document.content !== newContent) {
                if (editorRef.current) {
                  editorRef.current.forceSetContent(syncResult.document.content);
                }
                setContent(syncResult.document.content);
              }
            }
          } catch (syncErr) {
            console.warn("Sync citations warning:", syncErr);
            // Fallback: просто загружаем документ заново
            try {
              const fullDoc = await apiGetDocument(projectId, docId);
              setDoc(fullDoc.document);
            } catch {
              // Игнорируем ошибку fallback
            }
          } finally {
            setUpdatingBibliography(false);
          }
        }
        
        // Sync statistics (tables and charts) from document content
        // ALWAYS call sync to remove links when tables/charts are deleted from document
        const result = parseStatisticsFromContent(newContent);
        const tables = result?.tables || [];
        const charts = result?.charts || [];
        
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
        
        if (tables.length > 0 || charts.length > 0) {

          // Push updated table data back to Statistics so external views stay in sync
          const tableUpdates = tables
            .filter((t) => t.id && Array.isArray((t.tableData as any)?.headers))
            .map(async (t) => {
              try {
                const td = t.tableData as TableData;
                const headers = td.headers || [];
                const cols = Math.max(headers.length, ...(td.rows || []).map((r) => r.length));
                const labelColumn = 0;
                const dataColumns = Array.from({ length: cols }, (_, i) => i).filter((i) => i !== labelColumn);
                const xColumn = dataColumns[0] ?? 0;
                const yColumn = dataColumns[1] ?? dataColumns[0] ?? 0;

                const existingStat = statistics.find((s) => s.id === t.id);
                const baseConfig = (existingStat?.config as Record<string, any>) || {};
                const chartType = baseConfig.type || existingStat?.chart_type || 'bar';

                await apiUpdateStatistic(projectId, t.id, {
                  tableData: td,
                  config: {
                    ...baseConfig,
                    title: t.title,
                    labelColumn,
                    dataColumns,
                    xColumn,
                    yColumn,
                    type: chartType,
                  },
                  chartType,
                });
              } catch (updateErr) {
                console.warn("Failed to update statistic from document table", t.id, updateErr);
              }
            });
          if (tableUpdates.length) {
            await Promise.allSettled(tableUpdates);
          }
        }
        
        // Sync file usage - extract file IDs from content and sync with API
        // This removes file references when files are deleted from the document
        const fileIds = parseFilesFromContent(newContent);
        try {
          await apiSyncFileUsage(projectId, docId, fileIds);
        } catch (syncErr) {
          console.warn("File sync warning:", syncErr);
          // Don't fail the save if file sync fails
        }
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [projectId, docId, doc?.content, parseStatisticsFromContent, parseCitationsFromContent, parseFilesFromContent, statistics]
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
    if (!projectId) {
      return;
    }

    // Skip sync while there are unsaved local edits (avoid overwriting user's work)
    if (content && doc?.content && content !== doc.content) {
      return;
    }

    // Also skip if the user edited within the last 2.5 seconds
    const sinceEdit = Date.now() - lastUserEditRef.current;
    if (sinceEdit < 2500) {
      return;
    }
    if (isSyncingStatistics.current) {
      return;
    }
    isSyncingStatistics.current = true;

    try {
      // Get current content from editor (source of truth) or fallback to state
      const currentHtml = editorRef.current?.getHTML() || content;
      if (!currentHtml) {
        return;
      }

      const parser = new DOMParser();
      const docDom = parser.parseFromString(currentHtml, "text/html");

      const tables = Array.from(docDom.querySelectorAll('table[data-statistic-id]')) as HTMLElement[];
      
      // Find chart nodes by data-chart-id attribute (used in TipTap ChartNode)
      const chartNodes = Array.from(docDom.querySelectorAll('[data-chart-id]')) as HTMLElement[];
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const tableIds = Array.from(new Set(tables
        .map((el) => el.getAttribute('data-statistic-id'))
        .filter((id): id is string => !!id && uuidRegex.test(id))));
      
      const chartIds = Array.from(new Set(chartNodes
        .map((el) => el.getAttribute('data-chart-id'))
        .filter((id): id is string => !!id && uuidRegex.test(id))));

      const allIds = [...tableIds, ...chartIds];
      if (allIds.length === 0) return;

      const statMap = new Map<string, TableData>();
      const missingIds = new Set<string>();
      await Promise.allSettled(tableIds.map(async (id) => {
        try {
          const res = await apiGetStatistic(projectId, id);
          if (res.statistic.table_data) {
            statMap.set(id, res.statistic.table_data as TableData);
          }
        } catch (err: any) {
          console.warn('[SYNC] Failed to load statistic:', id, err);
          missingIds.add(id);
        }
      }));

      // Determine which statistics were deleted server-side
      const existingIds = new Set<string>();
      try {
        const list = await apiGetStatistics(projectId);
        list.statistics.forEach((s) => existingIds.add(s.id));
      } catch (err) {
        console.warn('[SYNC] Failed to fetch statistics list:', err);
      }

      // Helper to extract cell data from a table element
      const extractTableData = (tableEl: HTMLElement): { headers: string[]; rows: string[][] } => {
        const headers: string[] = [];
        const rows: string[][] = [];
        const trs = tableEl.querySelectorAll('tr');
        trs.forEach((tr, rowIdx) => {
          const cells: string[] = [];
          tr.querySelectorAll('th, td').forEach((cell) => {
            cells.push((cell.textContent || '').trim());
          });
          if (rowIdx === 0 && tr.querySelector('th')) {
            headers.push(...cells);
          } else if (cells.length > 0) {
            rows.push(cells);
          }
        });
        return { headers, rows };
      };

      // Helper to compare table data (ignores formatting, styles, structure)
      const isTableDataEqual = (tableEl: HTMLElement, statData: TableData): boolean => {
        const docData = extractTableData(tableEl);
        const statHeaders = statData.headers || [];
        const statRows = statData.rows || [];
        
        // Compare headers
        if (docData.headers.length !== statHeaders.length) return false;
        for (let i = 0; i < docData.headers.length; i++) {
          if (docData.headers[i] !== (statHeaders[i] || '').trim()) return false;
        }
        
        // Compare rows
        if (docData.rows.length !== statRows.length) return false;
        for (let r = 0; r < docData.rows.length; r++) {
          const docRow = docData.rows[r];
          const statRow = statRows[r] || [];
          if (docRow.length !== statRow.length) return false;
          for (let c = 0; c < docRow.length; c++) {
            if (docRow[c] !== (statRow[c] || '').trim()) return false;
          }
        }
        
        return true;
      };

      let changed = false;
      tables.forEach((tableEl) => {
        const statId = tableEl.getAttribute('data-statistic-id');
        if (!statId) return;
        const data = statMap.get(statId);

        // If statistic was removed or missing, drop the table from the document
        if (!data && ((existingIds.size > 0 && !existingIds.has(statId)) || missingIds.has(statId))) {
          tableEl.remove();
          changed = true;
          return;
        }

        if (!data) return;

        // Compare only the DATA, not the HTML structure/styles
        if (!isTableDataEqual(tableEl, data)) {
          const newHtml = buildTableHtmlFromStatistic(data, statId);
          const wrapper = document.createElement('div');
          wrapper.innerHTML = newHtml;
          const newTable = wrapper.firstElementChild;
          if (newTable) {
            tableEl.replaceWith(newTable);
            changed = true;
          }
        }
      });

      // Also remove chart nodes if their statistic was deleted
      chartNodes.forEach((chartEl) => {
        const chartId = chartEl.getAttribute('data-chart-id');
        if (!chartId) return;

        // If chart's statistic was removed, drop the chart from the document
        if (existingIds.size > 0 && !existingIds.has(chartId)) {
          // Find the chart-node-wrapper parent or remove the element directly
          const wrapper = chartEl.closest('.chart-node-wrapper') || chartEl;
          wrapper.remove();
          changed = true;
          console.log('[SYNC] Removed deleted chart from document:', chartId);
        }
      });

      if (changed) {
        const updatedContent = docDom.body.innerHTML;
        // Use forceSetContent to directly update TipTap editor
        if (editorRef.current) {
          editorRef.current.forceSetContent(updatedContent);
        }
        setContent(updatedContent);
        setDoc((prev) => prev ? { ...prev, content: updatedContent } : prev);
        await saveDocument(updatedContent);
      }
    } finally {
      isSyncingStatistics.current = false;
    }
  }, [buildTableHtmlFromStatistic, content, doc?.content, projectId, saveDocument]);

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
    }, 2000);
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

  // Открыть модал выбора файла
  async function openFileModal() {
    if (!projectId) return;
    setShowFileModal(true);
    setLoadingFiles(true);
    
    try {
      const res = await apiGetProjectFiles(projectId);
      setProjectFiles(res.files);
    } catch (err) {
      console.error("Load files error:", err);
    } finally {
      setLoadingFiles(false);
    }
  }

  // Вставить файл в редактор
  async function handleInsertFile(file: ProjectFile) {
    if (!projectId || !docId || !editorRef.current) return;
    
    const attrs: ProjectFileNodeAttrs = {
      fileId: file.id,
      projectId: projectId,
      fileName: file.name,
      mimeType: file.mimeType,
      category: file.category as 'image' | 'video' | 'audio' | 'document' | 'other',
    };
    
    const success = editorRef.current.insertFile(attrs);
    if (success) {
      // Отметить файл как используемый в документе
      try {
        await apiMarkFileUsed(projectId, file.id, docId);
      } catch (err) {
        console.error("Failed to mark file as used:", err);
      }
      setShowFileModal(false);
    }
  }

  // Фильтрация файлов по категории и поиску
  const filteredFiles = useMemo(() => {
    let files = projectFiles;
    if (fileFilter !== 'all') {
      files = files.filter(f => f.category === fileFilter);
    }
    if (fileSearch.trim()) {
      const search = fileSearch.toLowerCase().trim();
      files = files.filter(f => f.name.toLowerCase().includes(search));
    }
    return files;
  }, [projectFiles, fileFilter, fileSearch]);
  
  // Вставить статистику в редактор
  async function handleInsertStatistic(stat: ProjectStatistic) {
    if (!stat.table_data || !stat.config || !projectId || !docId) return;
    
    // ВАЖНО: Проверяем существование статистики на сервере перед импортом
    try {
      await apiGetStatistic(projectId, stat.id);
    } catch (err: any) {
      // Статистика была удалена — обновляем список и показываем ошибку
      setError("Эта статистика была удалена. Список обновлён.");
      const res = await apiGetStatistics(projectId);
      setStatistics(res.statistics);
      return;
    }
    
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

  const handleContentChange = useCallback((html: string) => {
    lastUserEditRef.current = Date.now();
    setContent(html);
    
    // Проверяем, изменились ли цитаты в контенте
    const newCitationIds = parseCitationsFromContent(html);
    const oldCitationIds = parseCitationsFromContent(content);
    
    // Если количество цитат изменилось, планируем обновление
    if (newCitationIds.size !== oldCitationIds.size) {
      // Цитаты изменились - UI обновится автоматически через visibleCitations
      console.log('Citations changed:', oldCitationIds.size, '->', newCitationIds.size);
    }
  }, [content, parseCitationsFromContent]);
  
  // Вставить таблицу из статистики
  async function handleInsertTable(stat: ProjectStatistic) {
    if (!stat.table_data || !projectId || !docId) return;
    
    // ВАЖНО: Проверяем существование статистики на сервере перед импортом
    try {
      await apiGetStatistic(projectId, stat.id);
    } catch (err: any) {
      // Статистика была удалена — обновляем список и показываем ошибку
      setError("Эта статистика была удалена. Список обновлён.");
      const res = await apiGetStatistics(projectId);
      setStatistics(res.statistics);
      return;
    }
    
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
      return result.statistic.id;
    } catch (err) {
      console.error("Failed to auto-save table:", err);
      return undefined;
    }
  }, [projectId, docId]);

  // Добавить цитату - всегда создаём новую запись (можно несколько цитат к одному источнику)
  // Модальное окно НЕ закрывается, чтобы можно было добавить несколько цитат
  // 
  // Логика нумерации:
  // - Новый источник получает минимальный свободный номер [n]
  // - Повторная цитата того же источника получает тот же номер с sub_number (n#k)
  // - Номера всегда компактны (1, 2, 3...) без пропусков
  async function handleAddCitation(article: Article) {
    if (!projectId || !docId) return;

    try {
      // Создаём новую цитату - API сам вычисляет правильные номера
      const res = await apiAddCitation(projectId, docId, article.id);
      
      // Вставить цитату в редактор
      const fn = (window as any).__editorInsertCitation;
      if (fn) {
        fn({
          citationId: res.citation.id,
          citationNumber: res.citation.inline_number,
          articleId: article.id,
          subNumber: res.citation.sub_number || 1,
          note: res.citation.note || '',
        });
      }
      
      // Обновить документ для синхронизации списка литературы
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
        <div className="row gap" style={{ alignItems: 'center' }}>
          {updatingBibliography && (
            <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3b82f6' }}>
              <svg className="icon-sm loading-spinner" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              обновление библиографии...
            </span>
          )}
          {saving && <span className="muted">Сохранение...</span>}
          {!saving && !updatingBibliography && <span className="muted" style={{ color: "#4ade80" }}>✓ Сохранено</span>}
        </div>
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Основной контент */}
      <div className="document-content">
        {/* Редактор с встроенными сайдбарами */}
        <div className="document-editor-wrapper">
          <TiptapEditor
            ref={editorRef}
            content={content}
            onChange={handleContentChange}
            onInsertCitation={openCitationPicker}
            onImportStatistic={openImportModal}
            onImportFile={openFileModal}
            onCreateChartFromTable={openChartModal}
            onRemoveCitation={handleRemoveCitation}
            onUpdateCitationNote={handleUpdateCitationNote}
            onTableCreated={handleTableCreated}
            onLoadStatistic={handleLoadStatistic}
            onSaveStatistic={handleSaveStatistic}
            citations={visibleCitations}
            citationStyle={citationStyle}
            projectId={projectId}
          />
        </div>
      </div>

      {/* Модалка выбора статьи - использует новый CitationPicker */}
      {showCitationPicker && (
        <CitationPicker
          articles={articles}
          citationStyle={citationStyle}
          onSelect={handleAddCitation}
          onClose={() => setShowCitationPicker(false)}
          isLoading={articles.length === 0}
        />
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

      {/* Модалка выбора файла из проекта */}
      {showFileModal && (
        <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                Вставить файл из проекта
              </h3>
              <button
                className="btn secondary"
                onClick={() => setShowFileModal(false)}
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Поиск по названию файла */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth={1.5} 
                  viewBox="0 0 24 24"
                  style={{ 
                    position: 'absolute', 
                    left: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Поиск по названию файла..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px 10px 40px',
                    borderRadius: 8,
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-glass-light)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            {/* Фильтр по типу */}
            <div className="row gap" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
              {(['all', 'image', 'video', 'audio', 'document'] as const).map((cat) => (
                <button
                  key={cat}
                  className={`btn ${fileFilter === cat ? '' : 'secondary'}`}
                  onClick={() => setFileFilter(cat)}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  type="button"
                >
                  {cat === 'all' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                      Все
                    </>
                  )}
                  {cat === 'image' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      Изображения
                    </>
                  )}
                  {cat === 'video' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
                      </svg>
                      Видео
                    </>
                  )}
                  {cat === 'audio' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                      Аудио
                    </>
                  )}
                  {cat === 'document' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      Документы
                    </>
                  )}
                </button>
              ))}
            </div>

            {loadingFiles ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="muted">Загрузка файлов...</div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <svg className="w-12 h-12" style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <div className="muted">
                  {projectFiles.length === 0 
                    ? 'Нет загруженных файлов. Загрузите файлы во вкладке "Файлы" проекта.'
                    : fileSearch ? 'Файлы не найдены по вашему запросу' : 'Нет файлов выбранного типа'}
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: 12,
                maxHeight: 450,
                overflow: 'auto',
                padding: 4,
              }}>
                {filteredFiles.map((file) => (
                  <FilePickerItem 
                    key={file.id} 
                    file={file} 
                    projectId={projectId!} 
                    onSelect={() => handleInsertFile(file)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
