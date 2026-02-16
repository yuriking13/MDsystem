import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { getErrorMessage } from "../lib/errorUtils";
import { useParams, useNavigate } from "react-router-dom";
import { editorEvents } from "../lib/editorEvents";
import TiptapEditor, {
  TiptapEditorHandle,
} from "../components/TiptapEditor/TiptapEditor";
import {
  EditorHeader,
  EditorLayoutWrapper,
  type Heading,
} from "../components/TiptapEditor";
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
  apiGetProjectFiles,
  apiGetFileDownloadUrl,
  apiMarkFileUsed,
  apiSyncFileUsage,
  apiGetDocumentVersions,
  apiGetDocumentVersion,
  apiCreateDocumentVersion,
  apiRestoreDocumentVersion,
  apiTriggerAutoVersion,
  type Document,
  type Article,
  type Citation,
  type CitationStyle,
  type Project,
  type ProjectStatistic,
  type DataClassification,
  type ProjectFile,
  type DocumentVersion,
} from "../lib/api";
import { type ProjectFileNodeAttrs } from "../components/TiptapEditor/extensions/ProjectFileNode";
import {
  IconRefresh,
  IconPlay,
  IconMusicalNote,
  IconDocument,
  IconDocumentPdf,
  IconPhoto,
  IconFilm,
  IconClock,
  IconClose,
  IconPlus,
  IconUndo,
  IconFolder,
  IconSearch,
} from "../components/FlowbiteIcons";
import ChartFromTable, {
  CHART_TYPE_INFO,
  ChartCreatorModal,
  type ChartConfig,
  type ChartType,
  type TableData,
} from "../components/ChartFromTable";

// Компонент элемента выбора файла с миниатюрой
function FilePickerItem({
  file,
  projectId,
  onSelect,
}: {
  file: ProjectFile;
  projectId: string;
  onSelect: () => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const [loadingThumb, setLoadingThumb] = React.useState(false);

  React.useEffect(() => {
    // Load thumbnail for images and videos
    if (file.category === "image" || file.category === "video") {
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
        <div className="file-picker-thumb file-picker-thumb--loading">
          <IconRefresh className="w-6 h-6 animate-spin file-picker-icon-muted" />
        </div>
      );
    }

    if (thumbnailUrl && file.category === "image") {
      return (
        <div className="file-picker-thumb file-picker-thumb--image">
          <img
            src={thumbnailUrl}
            alt={file.name}
            className="file-picker-thumb-media"
            onError={() => setThumbnailUrl(null)}
          />
        </div>
      );
    }

    if (thumbnailUrl && file.category === "video") {
      return (
        <div className="file-picker-thumb file-picker-thumb--video">
          <video
            src={thumbnailUrl}
            className="file-picker-thumb-media"
            muted
            preload="metadata"
          />
          <div className="file-picker-video-overlay">
            <IconPlay className="w-8 h-8 file-picker-icon-white" />
          </div>
        </div>
      );
    }

    // Default icons for non-media files
    return (
      <div className="file-picker-thumb file-picker-thumb--fallback">
        {file.category === "audio" && (
          <IconMusicalNote className="w-10 h-10 file-picker-icon-accent" />
        )}
        {file.category === "document" && (
          <IconDocument className="w-10 h-10 file-picker-icon-accent" />
        )}
        {file.category === "other" && (
          <IconDocumentPdf className="w-10 h-10 file-picker-icon-muted" />
        )}
        {file.category === "image" && !thumbnailUrl && (
          <IconPhoto className="w-10 h-10 file-picker-icon-accent" />
        )}
        {file.category === "video" && !thumbnailUrl && (
          <IconFilm className="w-10 h-10 file-picker-icon-accent" />
        )}
      </div>
    );
  };

  return (
    <div className="file-picker-item" onClick={onSelect}>
      {renderIcon()}
      <div className="file-picker-name" title={file.name}>
        {file.name}
      </div>
      <div className="muted file-picker-size">{file.sizeFormatted}</div>
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
  style: CitationStyle,
): string {
  const authors = article.authors || [];
  const firstAuthor = authors[0] || "Anonymous";
  // Всегда используем оригинальное название (английское)
  const title = article.title_en;
  const year = article.year || "n.d.";

  // Сокращаем имя первого автора
  const parts = firstAuthor.split(" ");
  const shortAuthor =
    parts.length > 1
      ? `${parts[0]} ${parts
          .slice(1)
          .map((p) => p[0] + ".")
          .join("")}`
      : parts[0];

  switch (style) {
    case "gost":
      // ГОСТ для иностранных источников использует оригинальный язык
      return `${shortAuthor}${authors.length > 1 ? " et al." : ""} ${title.slice(0, 60)}${title.length > 60 ? "..." : ""} (${year})`;
    case "apa":
      return `${shortAuthor}${authors.length > 1 ? " et al." : ""} (${year}). ${title.slice(0, 50)}...`;
    case "vancouver":
      return `${shortAuthor}${authors.length > 1 ? " et al" : ""}. ${title.slice(0, 50)}... ${year}`;
    default:
      return `${shortAuthor} (${year}) ${title.slice(0, 50)}...`;
  }
}

type DocumentStats = {
  wordCount: number;
  characterCount: number;
  pageCount: number;
};

const EMPTY_STATS: DocumentStats = {
  wordCount: 0,
  characterCount: 0,
  pageCount: 0,
};

const WORDS_PER_PAGE = 400;

function calculateDocumentStats(html: string): DocumentStats {
  if (!html) {
    return EMPTY_STATS;
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return EMPTY_STATS;
  }

  try {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, "text/html");

    // Удаляем таблицы из подсчёта — символы и слова в таблицах
    // не учитываются в общей статистике текстового документа
    const tables = parsed.querySelectorAll("table");
    tables.forEach((table) => table.remove());

    const text = parsed.body.textContent || "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const characterCount = text.length;
    const pageCount =
      wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE));

    return {
      wordCount,
      characterCount,
      pageCount,
    };
  } catch {
    return EMPTY_STATS;
  }
}

export default function DocumentPage() {
  const { projectId, docId } = useParams<{
    projectId: string;
    docId: string;
  }>();
  const nav = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [citationStyle, setCitationStyle] =
    useState<CitationStyle>("gost-r-7-0-5-2008");
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [documentStats, setDocumentStats] =
    useState<DocumentStats>(EMPTY_STATS);
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
  const [fileFilter, setFileFilter] = useState<
    "all" | "image" | "video" | "audio" | "document"
  >("all");
  const [fileSearch, setFileSearch] = useState("");

  // Состояние для обновления библиографии проекта
  const [updatingBibliography, setUpdatingBibliography] = useState(false);

  // Версионирование документа
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const [versionNote, setVersionNote] = useState("");

  // Загрузка документа и проекта
  useEffect(() => {
    if (!projectId || !docId) return;
    const currentProjectId = projectId;
    const currentDocId = docId;

    async function load() {
      setLoading(true);
      try {
        const [docRes, projRes] = await Promise.all([
          apiGetDocument(currentProjectId, currentDocId),
          apiGetProject(currentProjectId),
        ]);
        setDoc(docRes.document);
        setProject(projRes.project);
        setTitle(docRes.document.title);
        setContent(docRes.document.content || "");
        setCitationStyle(projRes.project.citation_style || "gost-r-7-0-5-2008");
        setLastSavedAt(
          docRes.document.updated_at
            ? new Date(docRes.document.updated_at)
            : null,
        );
        setDocumentStats(calculateDocumentStats(docRes.document.content || ""));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId, docId]);

  // Извлечение ID цитат из HTML контента (как Set для быстрой проверки наличия)
  const parseCitationsFromContent = useCallback(
    (htmlContent: string): Set<string> => {
      if (!htmlContent) return new Set();

      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(htmlContent, "text/html");
      const citationIds = new Set<string>();

      // Находим все элементы с data-citation-id
      parsedDoc.querySelectorAll("[data-citation-id]").forEach((el) => {
        const citationId = el.getAttribute("data-citation-id");
        if (citationId) {
          citationIds.add(citationId);
        }
      });

      return citationIds;
    },
    [],
  );

  // Извлечение ID цитат из HTML контента в порядке появления в документе (document order)
  // Нужен для передачи порядка цитат на сервер при синхронизации
  const parseCitationsOrderedFromContent = useCallback(
    (htmlContent: string): string[] => {
      if (!htmlContent) return [];

      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(htmlContent, "text/html");
      const citationIds: string[] = [];

      // querySelectorAll возвращает элементы в document order
      parsedDoc.querySelectorAll("[data-citation-id]").forEach((el) => {
        const citationId = el.getAttribute("data-citation-id");
        if (citationId) {
          citationIds.push(citationId);
        }
      });

      return citationIds;
    },
    [],
  );

  // Извлечение ID файлов из HTML контента
  const parseFilesFromContent = useCallback((htmlContent: string): string[] => {
    if (!htmlContent) return [];

    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(htmlContent, "text/html");
    const fileIds: string[] = [];

    // Находим все элементы с data-file-id (project file nodes)
    parsedDoc.querySelectorAll("[data-file-id]").forEach((el) => {
      const fileId = el.getAttribute("data-file-id");
      if (fileId) {
        fileIds.push(fileId);
      }
    });

    return fileIds;
  }, []);

  // Парсинг деталей цитат из HTML (номера, sub-номера, articleId)
  // Эти номера являются авторитетными — они соответствуют тому, что видит пользователь в редакторе
  // (после updateCitationNumbers, которая нумерует по порядку появления в документе)
  const parseCitationDetailsFromContent = useCallback(
    (
      htmlContent: string,
    ): Map<
      string,
      { number: number; subNumber: number; articleId: string }
    > => {
      const details = new Map<
        string,
        { number: number; subNumber: number; articleId: string }
      >();
      if (!htmlContent) return details;

      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(htmlContent, "text/html");

      parsedDoc.querySelectorAll("[data-citation-id]").forEach((el) => {
        const citationId = el.getAttribute("data-citation-id");
        const number = parseInt(
          el.getAttribute("data-citation-number") || "0",
          10,
        );
        const subNumber = parseInt(
          el.getAttribute("data-sub-number") || "1",
          10,
        );
        const articleId = el.getAttribute("data-article-id") || "";

        if (citationId && number > 0) {
          details.set(citationId, { number, subNumber, articleId });
        }
      });

      return details;
    },
    [],
  );

  // Фильтрация цитат на основе текущего содержимого
  // ВАЖНО: номера берутся из HTML редактора (data-citation-number, data-sub-number),
  // а НЕ из БД. Редактор — единственный источник истины для номеров,
  // потому что updateCitationNumbers нумерует по позиции в документе.
  // БД обновляется позже при sync-citations.
  const visibleCitations = useMemo(() => {
    const citationIdsInContent = parseCitationsFromContent(content);

    // Если нет цитат в контенте, показываем пустой список
    if (citationIdsInContent.size === 0) {
      return [];
    }

    // Парсим актуальные номера из HTML редактора
    const htmlDetails = parseCitationDetailsFromContent(content);

    // Фильтруем цитаты и переопределяем номера из HTML
    return (doc?.citations || [])
      .filter((citation) => citationIdsInContent.has(citation.id))
      .map((citation) => {
        const htmlInfo = htmlDetails.get(citation.id);
        if (htmlInfo) {
          // Используем номера из редактора (авторитетный источник)
          return {
            ...citation,
            inline_number: htmlInfo.number,
            sub_number: htmlInfo.subNumber,
          };
        }
        return citation;
      });
  }, [
    content,
    doc?.citations,
    parseCitationsFromContent,
    parseCitationDetailsFromContent,
  ]);

  // Парсинг таблиц и графиков из HTML контента
  const parseStatisticsFromContent = useCallback(
    (
      htmlContent: string,
    ): {
      tables: Array<{
        id: string;
        title?: string;
        tableData: TableData;
      }>;
      charts: Array<{
        id: string;
        title?: string;
        config: Record<string, unknown>;
        tableData?: TableData;
      }>;
    } => {
      // Защита от undefined/null контента
      if (!htmlContent) {
        return { tables: [], charts: [] };
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      const tables: Array<{
        id: string;
        title?: string;
        tableData: TableData;
      }> = [];
      const charts: Array<{
        id: string;
        title?: string;
        config: Record<string, unknown>;
        tableData?: TableData;
      }> = [];

      // Find tables - only those with valid statistic IDs
      doc
        .querySelectorAll("table[data-statistic-id]")
        .forEach((table, index) => {
          const tableId = table.getAttribute("data-statistic-id");
          if (!tableId) return;

          // Validate UUID
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(tableId)) return;

          const headers: string[] = [];
          const rows: string[][] = [];

          table.querySelectorAll("tr").forEach((tr, rowIdx) => {
            const cells: string[] = [];
            tr.querySelectorAll("th, td").forEach((cell) => {
              cells.push(cell.textContent || "");
            });

            // First row with th cells is treated as headers
            if (rowIdx === 0 && tr.querySelector("th")) {
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
      doc.querySelectorAll("[data-chart-id]").forEach((chartEl) => {
        const chartId = chartEl.getAttribute("data-chart-id");
        const chartDataStr =
          chartEl.getAttribute("data-chart") ||
          chartEl.getAttribute("data-config");

        if (chartId) {
          let config: Record<string, unknown> = {};
          let tableData: TableData | undefined;

          if (chartDataStr) {
            try {
              const parsedUnknown: unknown = JSON.parse(
                chartDataStr.replace(/&#39;/g, "'"),
              );
              if (parsedUnknown && typeof parsedUnknown === "object") {
                const parsed = parsedUnknown as {
                  config?: Record<string, unknown>;
                  tableData?: TableData;
                };
                config =
                  parsed.config || (parsedUnknown as Record<string, unknown>);

                if (
                  parsed.tableData &&
                  Array.isArray(parsed.tableData.headers) &&
                  Array.isArray(parsed.tableData.rows)
                ) {
                  tableData = parsed.tableData;
                }
              }
            } catch {
              // ignore parse errors
            }
          }

          charts.push({
            id: chartId,
            title:
              chartEl.querySelector(".chart-node-title")?.textContent ||
              "График",
            config,
            tableData,
          });
        }
      });

      return { tables, charts };
    },
    [],
  );

  // Автосохранение при изменении контента
  // Синхронизирует цитаты с БД:
  // - Удаляет из БД цитаты, которых больше нет в тексте
  // - Перенумеровывает оставшиеся цитаты для компактности
  const saveDocument = useCallback(
    async (newContent: string) => {
      if (!projectId || !docId) return;
      setSaving(true);
      try {
        // Проверяем, изменились ли цитаты (состав или порядок)
        const oldCitationIds = doc?.content
          ? parseCitationsFromContent(doc.content)
          : new Set<string>();
        const newCitationIds = parseCitationsFromContent(newContent);

        // Получаем упорядоченные массивы для проверки порядка и передачи на сервер
        const oldOrderedIds = doc?.content
          ? parseCitationsOrderedFromContent(doc.content)
          : [];
        const newOrderedIds = parseCitationsOrderedFromContent(newContent);

        // Цитаты изменились если:
        // 1. Изменился состав (добавлены/удалены) ИЛИ
        // 2. Изменился порядок (перетаскивание) - важно для правильной нумерации
        const setChanged =
          oldCitationIds.size !== newCitationIds.size ||
          [...oldCitationIds].some((id) => !newCitationIds.has(id));
        const orderChanged =
          !setChanged &&
          newOrderedIds.length > 0 &&
          (oldOrderedIds.length !== newOrderedIds.length ||
            oldOrderedIds.some((id, i) => id !== newOrderedIds[i]));
        const citationsChanged = setChanged || orderChanged;

        await apiUpdateDocument(projectId, docId, { content: newContent });
        // Keep local doc state in sync so we don't think there are pending edits after save
        setDoc((prev) => (prev ? { ...prev, content: newContent } : prev));

        // Если цитаты изменились (состав или порядок), синхронизируем с БД
        // Это удалит цитаты, которых больше нет в тексте, обновит порядок
        // и перенумерует все цитаты в соответствии с позицией в документе
        if (citationsChanged) {
          try {
            setUpdatingBibliography(true);

            // Синхронизируем цитаты - передаём ID цитат в порядке появления в документе
            // Сервер использует этот порядок для обновления order_index и нумерации
            const syncResult = await apiSyncCitations(
              projectId,
              docId,
              newOrderedIds,
            );

            if (syncResult.document) {
              // Обновляем состояние документа с новыми цитатами
              setDoc(syncResult.document);

              // Если контент документа изменился (перенумерация), обновляем редактор
              if (
                syncResult.document.content &&
                syncResult.document.content !== newContent
              ) {
                if (editorRef.current) {
                  editorRef.current.forceSetContent(
                    syncResult.document.content,
                  );
                }
                setContent(syncResult.document.content);
                setDocumentStats(
                  calculateDocumentStats(syncResult.document.content),
                );
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
            .filter((t) => t.id && Array.isArray(t.tableData?.headers))
            .map(async (t) => {
              try {
                const td = t.tableData;
                const headers = td.headers || [];
                const cols = Math.max(
                  headers.length,
                  ...(td.rows || []).map((r) => r.length),
                );
                const labelColumn = 0;
                const dataColumns = Array.from(
                  { length: cols },
                  (_, i) => i,
                ).filter((i) => i !== labelColumn);
                const xColumn = dataColumns[0] ?? 0;
                const yColumn = dataColumns[1] ?? dataColumns[0] ?? 0;

                const existingStat = statistics.find((s) => s.id === t.id);
                const baseConfig = (existingStat?.config || {}) as Record<
                  string,
                  unknown
                >;
                const chartType =
                  typeof baseConfig.type === "string"
                    ? baseConfig.type
                    : existingStat?.chart_type || "bar";

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
                console.warn(
                  "Failed to update statistic from document table",
                  t.id,
                  updateErr,
                );
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

        setLastSavedAt(new Date());
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [
      projectId,
      docId,
      doc?.content,
      parseStatisticsFromContent,
      parseCitationsFromContent,
      parseCitationsOrderedFromContent,
      parseFilesFromContent,
      statistics,
    ],
  );

  // ========== Document Versioning Functions ==========

  // Load document versions
  const loadVersions = useCallback(async () => {
    if (!projectId || !docId) return;
    setLoadingVersions(true);
    try {
      const res = await apiGetDocumentVersions(projectId, docId);
      setVersions(res.versions || []);
    } catch (err) {
      console.error("Error loading versions:", err);
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, [projectId, docId]);

  // Create a manual version
  const createManualVersion = useCallback(async () => {
    if (!projectId || !docId) return;
    setCreatingVersion(true);
    try {
      await apiCreateDocumentVersion(
        projectId,
        docId,
        versionNote || "Ручное сохранение версии",
        "manual",
      );
      setVersionNote("");
      await loadVersions();
    } catch (err) {
      console.error("Error creating version:", err);
    } finally {
      setCreatingVersion(false);
    }
  }, [projectId, docId, versionNote, loadVersions]);

  // Restore a specific version
  const restoreVersion = useCallback(
    async (versionId: string) => {
      if (!projectId || !docId) return;

      if (
        !confirm(
          "Восстановить эту версию документа? Текущие изменения будут сохранены как отдельная версия.",
        )
      ) {
        return;
      }

      setRestoringVersion(versionId);
      try {
        const res = await apiRestoreDocumentVersion(
          projectId,
          docId,
          versionId,
        );
        if (res.success) {
          // Update editor content
          if (editorRef.current) {
            editorRef.current.forceSetContent(res.restoredContent);
          }
          setContent(res.restoredContent);
          setDocumentStats(calculateDocumentStats(res.restoredContent));
          setTitle(res.restoredTitle);
          setDoc((prev) =>
            prev
              ? {
                  ...prev,
                  content: res.restoredContent,
                  title: res.restoredTitle,
                }
              : prev,
          );

          // Reload versions to show the new auto-version created before restore
          await loadVersions();
        }
      } catch (err) {
        console.error("Error restoring version:", err);
        alert("Ошибка восстановления версии");
      } finally {
        setRestoringVersion(null);
      }
    },
    [projectId, docId, loadVersions],
  );

  // Trigger auto-version check (called periodically or on significant changes)
  const triggerAutoVersion = useCallback(async () => {
    if (!projectId || !docId || !content) return;
    try {
      const res = await apiTriggerAutoVersion(projectId, docId, content);
      if (res.created) {
        console.log("Auto-version created:", res.reason);
        // Optionally refresh versions list
      }
    } catch (err) {
      // Silently fail - auto-versioning shouldn't interrupt the user
      console.warn("Auto-version check failed:", err);
    }
  }, [projectId, docId, content]);

  // Load versions when history panel is opened
  useEffect(() => {
    if (showVersionHistory) {
      loadVersions();
    }
  }, [showVersionHistory, loadVersions]);

  // Periodic auto-version check (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(
      () => {
        triggerAutoVersion();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [triggerAutoVersion]);

  // Create exit version when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to create an exit version (best effort)
      if (projectId && docId && content) {
        // Use sendBeacon for reliability on page unload
        navigator.sendBeacon(
          `/api/projects/${projectId}/documents/${docId}/versions`,
          new Blob(
            [
              JSON.stringify({
                versionType: "exit",
                versionNote: "Автосохранение при выходе",
              }),
            ],
            { type: "application/json" },
          ),
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [projectId, docId, content]);

  // Build table HTML from statistic data (used to refresh document tables from Statistics)
  const buildTableHtmlFromStatistic = useCallback(
    (tableData: TableData, statisticId?: string | null) => {
      const escapeHtml = (value: string): string =>
        value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");

      const cols = Math.max(
        tableData.headers?.length || 0,
        ...(tableData.rows || []).map((r) => r.length),
      );
      let html = '<table class="tiptap-table"';
      if (statisticId) {
        html += ` data-statistic-id="${escapeHtml(statisticId)}"`;
      }
      html += ">";

      html += "<colgroup>";
      for (let c = 0; c < cols; c++) {
        html += "<col />";
      }
      html += "</colgroup>";

      const safeHeaders =
        tableData.headers ||
        Array.from({ length: cols }, (_, i) => `Колонка ${i + 1}`);
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        const text = safeHeaders[c] ?? "";
        html += `<th><p>${escapeHtml(text)}</p></th>`;
      }
      html += "</tr>";

      (tableData.rows || []).forEach((row) => {
        html += "<tr>";
        for (let c = 0; c < cols; c++) {
          const text = row[c] ?? "";
          html += `<td><p>${escapeHtml(text)}</p></td>`;
        }
        html += "</tr>";
      });

      html += "</table>";
      return html;
    },
    [],
  );

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

      const tables = Array.from(
        docDom.querySelectorAll("table[data-statistic-id]"),
      ) as HTMLElement[];

      // Find chart nodes by data-chart-id attribute (used in TipTap ChartNode)
      const chartNodes = Array.from(
        docDom.querySelectorAll("[data-chart-id]"),
      ) as HTMLElement[];

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const tableIds = Array.from(
        new Set(
          tables
            .map((el) => el.getAttribute("data-statistic-id"))
            .filter((id): id is string => !!id && uuidRegex.test(id)),
        ),
      );

      const chartIds = Array.from(
        new Set(
          chartNodes
            .map((el) => el.getAttribute("data-chart-id"))
            .filter((id): id is string => !!id && uuidRegex.test(id)),
        ),
      );

      const allIds = [...tableIds, ...chartIds];
      if (allIds.length === 0) return;

      const statMap = new Map<string, TableData>();
      const missingIds = new Set<string>();
      await Promise.allSettled(
        tableIds.map(async (id) => {
          try {
            const res = await apiGetStatistic(projectId, id);
            if (res.statistic.table_data) {
              statMap.set(id, res.statistic.table_data as TableData);
            }
          } catch (err) {
            console.warn("[SYNC] Failed to load statistic:", id, err);
            missingIds.add(id);
          }
        }),
      );

      // Determine which statistics were deleted server-side
      const existingIds = new Set<string>();
      try {
        const list = await apiGetStatistics(projectId);
        list.statistics.forEach((s) => existingIds.add(s.id));
      } catch (err) {
        console.warn("[SYNC] Failed to fetch statistics list:", err);
      }

      // Helper to extract cell data from a table element
      const extractTableData = (
        tableEl: HTMLElement,
      ): { headers: string[]; rows: string[][] } => {
        const headers: string[] = [];
        const rows: string[][] = [];
        const trs = tableEl.querySelectorAll("tr");
        trs.forEach((tr, rowIdx) => {
          const cells: string[] = [];
          tr.querySelectorAll("th, td").forEach((cell) => {
            cells.push((cell.textContent || "").trim());
          });
          if (rowIdx === 0 && tr.querySelector("th")) {
            headers.push(...cells);
          } else if (cells.length > 0) {
            rows.push(cells);
          }
        });
        return { headers, rows };
      };

      // Helper to compare table data (ignores formatting, styles, structure)
      const isTableDataEqual = (
        tableEl: HTMLElement,
        statData: TableData,
      ): boolean => {
        const docData = extractTableData(tableEl);
        const statHeaders = statData.headers || [];
        const statRows = statData.rows || [];

        // Compare headers
        if (docData.headers.length !== statHeaders.length) return false;
        for (let i = 0; i < docData.headers.length; i++) {
          if (docData.headers[i] !== (statHeaders[i] || "").trim())
            return false;
        }

        // Compare rows
        if (docData.rows.length !== statRows.length) return false;
        for (let r = 0; r < docData.rows.length; r++) {
          const docRow = docData.rows[r];
          const statRow = statRows[r] || [];
          if (docRow.length !== statRow.length) return false;
          for (let c = 0; c < docRow.length; c++) {
            if (docRow[c] !== (statRow[c] || "").trim()) return false;
          }
        }

        return true;
      };

      let changed = false;
      tables.forEach((tableEl) => {
        const statId = tableEl.getAttribute("data-statistic-id");
        if (!statId) return;
        const data = statMap.get(statId);

        // If statistic was removed or missing, drop the table from the document
        if (
          !data &&
          ((existingIds.size > 0 && !existingIds.has(statId)) ||
            missingIds.has(statId))
        ) {
          tableEl.remove();
          changed = true;
          return;
        }

        if (!data) return;

        // Compare only the DATA, not the HTML structure/styles
        if (!isTableDataEqual(tableEl, data)) {
          const newHtml = buildTableHtmlFromStatistic(data, statId);
          const wrapper = document.createElement("div");
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
        const chartId = chartEl.getAttribute("data-chart-id");
        if (!chartId) return;

        // If chart's statistic was removed, drop the chart from the document
        if (existingIds.size > 0 && !existingIds.has(chartId)) {
          // Find the chart-node-wrapper parent or remove the element directly
          const wrapper = chartEl.closest(".chart-node-wrapper") || chartEl;
          wrapper.remove();
          changed = true;
          console.log("[SYNC] Removed deleted chart from document:", chartId);
        }
      });

      if (changed) {
        const updatedContent = docDom.body.innerHTML;
        // Use forceSetContent to directly update TipTap editor
        if (editorRef.current) {
          editorRef.current.forceSetContent(updatedContent);
        }
        setContent(updatedContent);
        setDocumentStats(calculateDocumentStats(updatedContent));
        setDoc((prev) => (prev ? { ...prev, content: updatedContent } : prev));
        await saveDocument(updatedContent);
      }
    } finally {
      isSyncingStatistics.current = false;
    }
  }, [
    buildTableHtmlFromStatistic,
    content,
    doc?.content,
    projectId,
    saveDocument,
  ]);

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
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
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
      setDoc((prev) => (prev ? { ...prev, title } : prev));
      setLastSavedAt(new Date());
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
      category: file.category as
        | "image"
        | "video"
        | "audio"
        | "document"
        | "other",
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
    if (fileFilter !== "all") {
      files = files.filter((f) => f.category === fileFilter);
    }
    if (fileSearch.trim()) {
      const search = fileSearch.toLowerCase().trim();
      files = files.filter((f) => f.name.toLowerCase().includes(search));
    }
    return files;
  }, [projectFiles, fileFilter, fileSearch]);

  // Вставить статистику в редактор
  async function handleInsertStatistic(stat: ProjectStatistic) {
    if (!stat.table_data || !stat.config || !projectId || !docId) return;

    // ВАЖНО: Проверяем существование статистики на сервере перед импортом
    try {
      await apiGetStatistic(projectId, stat.id);
    } catch (err) {
      // Статистика была удалена — обновляем список и показываем ошибку
      setError("Эта статистика была удалена. Список обновлён.");
      const res = await apiGetStatistics(projectId);
      setStatistics(res.statistics);
      return;
    }

    setShowImportModal(false);

    // Небольшая задержка чтобы редактор успел зарегистрировать функцию
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Используем event system для вставки графика
    // ChartData ожидает { id, config, table_data }
    editorEvents.emit("insertChart", {
      id: stat.id,
      config: stat.config,
      table_data: stat.table_data,
    });

    // Отмечаем статистику как используемую в этом документе (только если ID валидный UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(stat.id)) {
      try {
        await apiMarkStatisticUsedInDocument(projectId, stat.id, docId);
        // Обновляем локальное состояние used_in_documents
        setStatistics((prev) =>
          prev.map((s) =>
            s.id === stat.id
              ? {
                  ...s,
                  used_in_documents: [
                    ...new Set([...(s.used_in_documents || []), docId]),
                  ],
                }
              : s,
          ),
        );
      } catch {
        // Failed to mark statistic as used
      }
    }
  }

  // Открыть модал создания графика из таблицы
  function openChartModal(tableHtml: string) {
    setChartTableHtml(tableHtml);
    setShowChartModal(true);
  }

  // Вставить график из таблицы
  function handleInsertChartFromTable(chartHtml: string, chartId?: string) {
    // Parse the chart data from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(chartHtml, "text/html");
    const chartContainer = doc.querySelector(".chart-container");
    const chartDataStr = chartContainer?.getAttribute("data-chart");

    if (chartDataStr) {
      try {
        const rawData = JSON.parse(chartDataStr.replace(/&#39;/g, "'"));
        // Emit chart insert event
        editorEvents.emit("insertChart", {
          title: rawData.title || "",
          type: rawData.config?.type || "bar",
          data: rawData.config?.data || { labels: [], datasets: [] },
          options: rawData.config,
          statisticId: rawData.chartId || chartId || `chart_${Date.now()}`,
        });
      } catch {
        // Failed to parse chart data
      }
    }
    setShowChartModal(false);
  }

  const handleContentChange = useCallback(
    (html: string) => {
      lastUserEditRef.current = Date.now();
      setContent(html);
      setDocumentStats(calculateDocumentStats(html));

      // Проверяем, изменились ли цитаты в контенте
      const newCitationIds = parseCitationsFromContent(html);
      const oldCitationIds = parseCitationsFromContent(content);

      // Если количество цитат изменилось, планируем обновление
      if (newCitationIds.size !== oldCitationIds.size) {
        // Цитаты изменились - UI обновится автоматически через visibleCitations
        console.log(
          "Citations changed:",
          oldCitationIds.size,
          "->",
          newCitationIds.size,
        );
      }
    },
    [content, parseCitationsFromContent],
  );

  const handleHeadingsChange = useCallback((newHeadings: Heading[]) => {
    setHeadings(newHeadings);
  }, []);

  const handleNavigateHeading = useCallback((headingId: string) => {
    editorRef.current?.scrollToHeading(headingId);
  }, []);

  // Вставить таблицу из статистики
  async function handleInsertTable(stat: ProjectStatistic) {
    if (!stat.table_data || !projectId || !docId) return;

    // ВАЖНО: Проверяем существование статистики на сервере перед импортом
    try {
      await apiGetStatistic(projectId, stat.id);
    } catch (err) {
      // Статистика была удалена — обновляем список и показываем ошибку
      setError("Эта статистика была удалена. Список обновлён.");
      const res = await apiGetStatistics(projectId);
      setStatistics(res.statistics);
      return;
    }

    setShowImportModal(false);

    const tableData = stat.table_data as TableData;

    // Извлекаем заголовки и строки из table_data
    // table_data может быть массивом строк (первая строка = заголовки)
    let headers: string[] = [];
    let rows: string[][] = [];

    if (Array.isArray(tableData) && tableData.length > 0) {
      // Первая строка — заголовки, остальные — данные
      headers = (tableData[0] as unknown[]).map((cell) => String(cell ?? ""));
      rows = (tableData as unknown[][])
        .slice(1)
        .map((row) => (row as unknown[]).map((cell) => String(cell ?? "")));
    } else if (
      tableData &&
      typeof tableData === "object" &&
      "headers" in tableData
    ) {
      // table_data уже в формате { headers, rows }
      const td = tableData as unknown as {
        headers: string[];
        rows: string[][];
      };
      headers = td.headers || [];
      rows = td.rows || [];
    }

    // Emit table insert event с ДАННЫМИ, а не просто размерами
    editorEvents.emit("insertTable", {
      headers,
      rows,
      title: stat.title || undefined,
      statisticId: stat.id,
    });

    // Отмечаем статистику как используемую (только если ID валидный UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(stat.id)) {
      try {
        await apiMarkStatisticUsedInDocument(projectId, stat.id, docId);
        // Обновляем локальное состояние used_in_documents
        setStatistics((prev) =>
          prev.map((s) =>
            s.id === stat.id
              ? {
                  ...s,
                  used_in_documents: [
                    ...new Set([...(s.used_in_documents || []), docId]),
                  ],
                }
              : s,
          ),
        );
      } catch {
        // Failed to mark statistic as used
      }
    }
  }

  const handleLoadStatistic = useCallback(
    async (statId: string) => {
      if (!projectId) return null;

      try {
        const res = await apiGetStatistic(projectId, statId);
        return res.statistic;
      } catch (err) {
        console.error("Failed to load statistic:", err);
        return null;
      }
    },
    [projectId],
  );

  const handleSaveStatistic = useCallback(
    async (
      statId: string | null,
      data: {
        title?: string;
        description?: string;
        config?: Record<string, any>;
        tableData?: TableData;
        dataClassification?: DataClassification;
        chartType?: string;
      },
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

          await apiMarkStatisticUsedInDocument(
            projectId,
            res.statistic.id,
            docId,
          );
          return res.statistic.id;
        }

        const res = await apiCreateStatistic(projectId, {
          type: "table",
          title: data.title || `Таблица ${new Date().toLocaleString("ru-RU")}`,
          description: data.description,
          config: data.config || {},
          tableData: data.tableData,
          dataClassification: data.dataClassification,
          chartType: data.chartType || "bar",
        });

        await apiMarkStatisticUsedInDocument(
          projectId,
          res.statistic.id,
          docId,
        );
        return res.statistic.id;
      } catch (err) {
        console.error("Failed to save statistic:", err);
        setError(getErrorMessage(err));
        return statId;
      }
    },
    [projectId, docId],
  );

  // Автосохранение новой таблицы в Статистику
  const handleTableCreated = useCallback(
    async (tableData: { rows: number; cols: number; data: unknown[][] }) => {
      if (!projectId || !docId) return undefined;

      // Подготовим данные и дефолтную конфигурацию графика, чтобы карточка в статистике сразу была рабочей
      const rawRows = tableData.data || [];
      const headerRow = rawRows[0] || [];
      const maxCols = rawRows.reduce(
        (m, r) => Math.max(m, r?.length || 0),
        headerRow.length,
      );
      const headers = Array.from({ length: maxCols }, (_, idx) => {
        const h = headerRow[idx];
        return h && String(h).trim().length > 0
          ? String(h)
          : `Колонка ${idx + 1}`;
      });

      const rows = rawRows.slice(1).map((row = []) => {
        const padded = Array.from({ length: maxCols }, (_, idx) => {
          const v = row[idx];
          return v === undefined || v === null ? "" : String(v);
        });
        return padded;
      });

      // Выбираем столбцы для графика: первая колонка — подписи, остальные — данные
      const labelColumn = 0;
      const dataColumns =
        maxCols > 1
          ? Array.from({ length: maxCols - 1 }, (_, i) => i + 1)
          : [0];
      const xColumn = maxCols > 1 ? 1 : 0;
      const yColumn = maxCols > 2 ? 2 : dataColumns[0];

      const classification = {
        variableType: "quantitative" as const,
        subType: "continuous" as const,
      };

      try {
        const result = await apiCreateStatistic(projectId, {
          type: "table",
          title: `Таблица ${new Date().toLocaleString("ru-RU")}`,
          description: "Автоматически создана в документе",
          config: {
            type: "bar",
            title: `Таблица ${new Date().toLocaleString("ru-RU")}`,
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

        await apiMarkStatisticUsedInDocument(
          projectId,
          result.statistic.id,
          docId,
        );
        return result.statistic.id;
      } catch (err) {
        console.error("Failed to auto-save table:", err);
        return undefined;
      }
    },
    [projectId, docId],
  );

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

      // Вставить цитату в редактор через event system
      // ВАЖНО: articleId нужен для группировки цитат одного источника
      // subNumber нужен для корректного отображения n#k
      editorEvents.emit("insertCitation", {
        citationId: res.citation.id,
        citationNumber: res.citation.inline_number,
        articleId: article.id,
        subNumber: res.citation.sub_number || 1,
        note: res.citation.note || "",
      });

      // Ждём пока ProseMirror-плагин перенумерует все цитаты (debounce 50ms + запас)
      // и onChange обновит content state
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Получаем актуальный HTML из редактора после перенумерации
      const currentHtml = editorRef.current?.getHTML() || "";

      // Сохраняем контент и синхронизируем цитаты с БД
      // Это обновит order_index и inline_number в БД в соответствии
      // с реальным порядком цитат в документе
      if (currentHtml) {
        await apiUpdateDocument(projectId, docId, { content: currentHtml });
        const orderedIds = parseCitationsOrderedFromContent(currentHtml);
        if (orderedIds.length > 0) {
          const syncResult = await apiSyncCitations(
            projectId,
            docId,
            orderedIds,
          );
          if (syncResult.document) {
            setDoc(syncResult.document);
          }
        } else {
          // Если не удалось извлечь IDs, просто обновляем документ
          const updated = await apiGetDocument(projectId, docId);
          setDoc(updated.document);
        }
      } else {
        const updated = await apiGetDocument(projectId, docId);
        setDoc(updated.document);
      }

      // НЕ закрываем модальное окно - пользователь может добавить ещё цитаты
      // setShowCitationPicker(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Клик по цитате в тексте - скролл к списку литературы
  function handleCitationClick(citationNumber: number, citationId: string) {
    // Находим элемент в списке литературы и скроллим к нему
    const element = document.getElementById(`citation-${citationId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Подсветим ненадолго
      element.classList.add("citation-highlight");
      setTimeout(() => {
        element.classList.remove("citation-highlight");
      }, 2000);
    }
  }

  // Удалить цитату из БД и из редактора
  async function handleRemoveCitation(citationId: string) {
    if (!projectId || !docId) return;

    try {
      // Удаляем из БД
      await apiRemoveCitation(projectId, docId, citationId);

      // Удаляем цитату из редактора (span node)
      // Метод removeCitationById определён в CitationMark extension
      // и экспортирован через TiptapEditorHandle
      if (editorRef.current) {
        editorRef.current.removeCitationById(citationId);
      }

      // Ждём перенумерацию в редакторе (debounce 50ms + запас)
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Сохраняем и синхронизируем для обновления номеров в БД
      const currentHtml = editorRef.current?.getHTML() || "";
      if (currentHtml) {
        await apiUpdateDocument(projectId, docId, { content: currentHtml });
        const orderedIds = parseCitationsOrderedFromContent(currentHtml);
        const syncResult = await apiSyncCitations(projectId, docId, orderedIds);
        if (syncResult.document) {
          setDoc(syncResult.document);
        } else {
          const updated = await apiGetDocument(projectId, docId);
          setDoc(updated.document);
        }
      } else {
        const updated = await apiGetDocument(projectId, docId);
        setDoc(updated.document);
      }
    } catch (err) {
      setError(getErrorMessage(err));
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
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Фильтр статей
  const filteredArticles = searchArticle
    ? articles.filter(
        (a) =>
          a.title_en.toLowerCase().includes(searchArticle.toLowerCase()) ||
          a.title_ru?.toLowerCase().includes(searchArticle.toLowerCase()),
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
      <EditorHeader
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={handleTitleBlur}
        projectName={project?.name || undefined}
        onBackToProject={() => nav(`/projects/${projectId}`)}
        isSaving={saving}
        isUpdatingBibliography={updatingBibliography}
        showVersionHistoryButton
        onToggleVersionHistory={() => setShowVersionHistory((prev) => !prev)}
        isVersionHistoryOpen={showVersionHistory}
      />

      <div className="document-page-main">
        {showVersionHistory && (
          <div className="version-history-panel">
            <div className="version-history-header">
              <h3 className="version-history-title">
                <IconClock className="icon-md" />
                История версий документа
              </h3>
              <button
                className="btn secondary version-history-close-btn"
                onClick={() => setShowVersionHistory(false)}
                type="button"
              >
                <IconClose className="icon-sm" />
              </button>
            </div>

            {/* Create manual version */}
            <div className="version-history-create-row">
              <div className="version-history-note-group">
                <label className="muted version-history-note-label">
                  Комментарий к версии (необязательно)
                </label>
                <input
                  type="text"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="Например: Добавлены графики исследования"
                  className="version-history-note-input"
                />
              </div>
              <button
                className="btn version-history-create-btn"
                onClick={createManualVersion}
                disabled={creatingVersion}
                type="button"
              >
                <IconPlus className="icon-sm version-history-btn-icon" />
                {creatingVersion ? "Сохранение..." : "Сохранить версию"}
              </button>
            </div>

            {/* Versions list */}
            {loadingVersions ? (
              <div className="muted version-history-state">
                Загрузка истории версий...
              </div>
            ) : versions.length === 0 ? (
              <div className="muted version-history-state">
                Нет сохранённых версий. Версии создаются автоматически при
                значительных изменениях или вручную.
              </div>
            ) : (
              <div className="version-history-list">
                {versions.map((v) => {
                  const versionType =
                    v.version_type === "manual"
                      ? "manual"
                      : v.version_type === "exit"
                        ? "exit"
                        : "auto";
                  return (
                    <div key={v.id} className="version-history-item">
                      <div>
                        <div className="version-history-item-header">
                          <span className="version-history-item-number">
                            Версия {v.version_number}
                          </span>
                          <span
                            className={`id-badge version-history-type-badge version-history-type-badge--${versionType}`}
                          >
                            {versionType === "manual"
                              ? "Ручная"
                              : versionType === "exit"
                                ? "При выходе"
                                : "Авто"}
                          </span>
                        </div>
                        <div className="muted version-history-meta-primary">
                          {new Date(v.created_at).toLocaleString("ru-RU")}
                          {v.version_note && <span> — {v.version_note}</span>}
                        </div>
                        <div className="muted version-history-meta-secondary">
                          {v.content_length
                            ? `${Math.round(v.content_length / 1000)}K символов`
                            : ""}
                          {v.created_by_email && ` • ${v.created_by_email}`}
                        </div>
                      </div>
                      <button
                        className="btn secondary version-history-restore-btn"
                        onClick={() => restoreVersion(v.id)}
                        disabled={!!restoringVersion}
                        title="Восстановить эту версию"
                        type="button"
                      >
                        {restoringVersion === v.id ? (
                          "Восстановление..."
                        ) : (
                          <>
                            <IconUndo className="icon-sm version-history-btn-icon" />
                            Восстановить
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="alert document-page-error-alert">{error}</div>
        )}

        <div className="document-editor-layout">
          <EditorLayoutWrapper
            headings={headings}
            onNavigateToHeading={handleNavigateHeading}
            citations={visibleCitations}
            onRemoveCitation={handleRemoveCitation}
            onUpdateCitationNote={handleUpdateCitationNote}
            wordCount={documentStats.wordCount}
            characterCount={documentStats.characterCount}
            pageCount={documentStats.pageCount}
            isSaving={saving}
            lastSaved={lastSavedAt}
            isUpdatingBibliography={updatingBibliography}
          >
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
              onHeadingsChange={handleHeadingsChange}
              showLegacySidebars={false}
            />
          </EditorLayoutWrapper>
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
        <div
          className="modal-backdrop"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="modal-content document-import-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">📥 Импорт из Статистики</h3>
              <button
                className="modal-close"
                onClick={() => setShowImportModal(false)}
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p className="muted document-import-hint">
                Выберите что вставить: таблицу с данными или график
              </p>

              <div className="document-import-scroll">
                {loadingStats ? (
                  <div className="muted">Загрузка...</div>
                ) : statistics.length === 0 ? (
                  <div className="muted document-import-empty">
                    Нет доступных данных.
                    <br />
                    Создайте их в разделе Статистика проекта.
                  </div>
                ) : (
                  <div className="import-stats-list">
                    {statistics.map((stat) => {
                      const chartInfo = stat.chart_type
                        ? CHART_TYPE_INFO[stat.chart_type as ChartType]
                        : null;
                      const tableData = stat.table_data as TableData | null;

                      return (
                        <div
                          key={stat.id}
                          className="import-stat-item-expanded"
                        >
                          <div className="import-stat-header import-stat-header-spaced">
                            <div className="import-stat-title import-stat-title-strong">
                              {stat.title || "Без названия"}
                            </div>
                            {stat.description && (
                              <div className="import-stat-desc muted import-stat-desc-muted">
                                {stat.description}
                              </div>
                            )}
                          </div>

                          <div className="row gap import-stat-content-row">
                            {/* Таблица */}
                            {tableData && (
                              <div className="import-stat-table-card">
                                <div className="import-stat-preview-label">
                                  Таблица ({tableData.rows?.length || 0} строк)
                                </div>
                                <div className="import-stat-table-scroll">
                                  <table className="import-stat-preview-table">
                                    <thead>
                                      <tr>
                                        {tableData.headers?.map((h, i) => (
                                          <th
                                            key={i}
                                            className="import-stat-preview-th"
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {tableData.rows
                                        ?.slice(0, 5)
                                        .map((row, i) => (
                                          <tr key={i}>
                                            {row.map((cell, j) => (
                                              <td
                                                key={j}
                                                className="import-stat-preview-td"
                                              >
                                                {cell}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      {(tableData.rows?.length || 0) > 5 && (
                                        <tr>
                                          <td
                                            colSpan={
                                              tableData.headers?.length || 1
                                            }
                                            className="import-stat-preview-more"
                                          >
                                            ... ещё{" "}
                                            {(tableData.rows?.length || 0) - 5}{" "}
                                            строк
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                <button
                                  className="btn secondary import-stat-action-btn"
                                  onClick={() => handleInsertTable(stat)}
                                  type="button"
                                >
                                  📋 Вставить таблицу
                                </button>
                              </div>
                            )}

                            {/* График */}
                            {stat.config && tableData && (
                              <div className="import-stat-chart-card">
                                <div className="import-stat-preview-label">
                                  {chartInfo?.name || "График"}
                                </div>
                                <div className="import-stat-chart-preview">
                                  <ChartFromTable
                                    tableData={tableData}
                                    config={
                                      stat.config as unknown as ChartConfig
                                    }
                                    height={150}
                                  />
                                </div>
                                <button
                                  className="btn import-stat-action-btn"
                                  onClick={() => handleInsertStatistic(stat)}
                                  type="button"
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
        <div className="modal-backdrop" onClick={() => setShowFileModal(false)}>
          <div
            className="modal-content document-file-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title document-file-modal-title">
                <IconFolder className="w-5 h-5" />
                Вставить файл из проекта
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowFileModal(false)}
                type="button"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              {/* Поиск по названию файла */}
              <div className="document-file-search-wrap">
                <div className="document-file-search-input-wrap">
                  <IconSearch className="w-5 h-5 document-file-search-icon" />
                  <input
                    type="text"
                    placeholder="Поиск по названию файла..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="document-file-search-input"
                  />
                </div>
              </div>

              {/* Фильтр по типу */}
              <div className="row gap document-file-filter-row">
                {(["all", "image", "video", "audio", "document"] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      className={`btn document-file-filter-btn ${fileFilter === cat ? "" : "secondary"}`}
                      onClick={() => setFileFilter(cat)}
                      type="button"
                    >
                      {cat === "all" && (
                        <>
                          <IconFolder size="sm" />
                          Все
                        </>
                      )}
                      {cat === "image" && (
                        <>
                          <IconPhoto size="sm" />
                          Изображения
                        </>
                      )}
                      {cat === "video" && (
                        <>
                          <IconFilm size="sm" />
                          Видео
                        </>
                      )}
                      {cat === "audio" && (
                        <>
                          <IconMusicalNote size="sm" />
                          Аудио
                        </>
                      )}
                      {cat === "document" && (
                        <>
                          <IconDocument size="sm" />
                          Документы
                        </>
                      )}
                    </button>
                  ),
                )}
              </div>

              {loadingFiles ? (
                <div className="document-file-state">
                  <div className="muted">Загрузка файлов...</div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="document-file-state">
                  <IconFolder className="w-12 h-12 document-file-empty-icon" />
                  <div className="muted">
                    {projectFiles.length === 0
                      ? 'Нет загруженных файлов. Загрузите файлы во вкладке "Файлы" проекта.'
                      : fileSearch
                        ? "Файлы не найдены по вашему запросу"
                        : "Нет файлов выбранного типа"}
                  </div>
                </div>
              ) : (
                <div className="document-file-grid">
                  {projectId &&
                    filteredFiles.map((file) => (
                      <FilePickerItem
                        key={file.id}
                        file={file}
                        projectId={projectId}
                        onSelect={() => handleInsertFile(file)}
                      />
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
