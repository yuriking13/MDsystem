import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import {
  apiSearchArticles,
  apiGetArticles,
  apiUpdateArticleStatus,
  apiTranslateArticles,
  apiEnrichArticles,
  apiDetectStatsWithAI,
  apiGetPdfSource,
  getPdfDownloadUrl,
  apiConvertArticleToDocument,
  apiBulkUpdateStatus,
  PUBMED_SEARCH_FIELDS,
  SEARCH_SOURCES,
  type Article,
  type SearchFilters,
  type SearchSource,
  type SearchProgressEvent,
} from "../lib/api";
import AddArticleByDoiModal from "./AddArticleByDoiModal";
import ArticleAISidebar from "./ArticleAISidebar";
import { useToast } from "./Toast";
import ArticleCard from "./ArticleCard";
import { toArticleData } from "../lib/articleAdapter";
import { useProjectContext } from "./AppLayout";
import { useProjectWebSocket } from "../lib/useProjectWebSocket";

type Props = {
  projectId: string;
  canEdit: boolean;
  onCountsChange?: (counts: {
    candidate: number;
    selected: number;
    excluded: number;
    total: number;
  }) => void;
};

const PUBLICATION_TYPES = [
  {
    id: "systematic_review",
    label: "Систематический обзор",
    pubmed: "Systematic Review",
  },
  { id: "meta_analysis", label: "Мета-анализ", pubmed: "Meta-Analysis" },
  { id: "rct", label: "РКИ", pubmed: "Randomized Controlled Trial" },
  {
    id: "clinical_trial",
    label: "Клиническое исследование",
    pubmed: "Clinical Trial",
  },
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

/**
 * Real-time elapsed timer component for search progress
 */
function SearchElapsedTimer({
  startTime,
  isRunning,
}: {
  startTime: number;
  isRunning: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  useEffect(() => {
    if (!isRunning) {
      setElapsed(Date.now() - startTime);
    }
  }, [isRunning, startTime]);

  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    <span>
      {minutes > 0
        ? `${minutes} мин. ${remainingSeconds} сек.`
        : `${seconds} сек.`}
    </span>
  );
}

export default function ArticlesSection({
  projectId,
  canEdit,
  onCountsChange,
}: Props) {
  const toast = useToast();
  const {
    projectInfo,
    articleViewStatus: viewStatus,
    setArticleViewStatus: setViewStatus,
    setArticleCounts: setContextCounts,
  } = useProjectContext();
  const [articles, setArticles] = useState<Article[]>([]);
  const [counts, setCounts] = useState({
    candidate: 0,
    selected: 0,
    excluded: 0,
    deleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Auto-dismiss ok notification after 10 seconds
  useEffect(() => {
    if (!ok) return;
    const timer = setTimeout(() => setOk(null), 10000);
    return () => clearTimeout(timer);
  }, [ok]);

  // Фильтр отображения
  const [showStatsOnly, setShowStatsOnly] = useState(false);
  const [filterPubType, setFilterPubType] = useState<string | null>(null);
  const [filterSourceQuery, setFilterSourceQuery] = useState<string | null>(
    null,
  );
  const [availableSourceQueries, setAvailableSourceQueries] = useState<
    string[]
  >([]);

  // Поиск
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Источники поиска (PubMed, DOAJ, Wiley)
  const [searchSources, setSearchSources] = useState<SearchSource[]>([
    "pubmed",
  ]);

  // Поле поиска PubMed
  const [searchField, setSearchField] = useState<string>("All Fields");

  // Мультипоиск - несколько запросов
  const [multiQueries, setMultiQueries] = useState<
    Array<{ query: string; id: string }>
  >([]);
  const [showMultiSearch, setShowMultiSearch] = useState(false);

  // Период
  const [datePreset, setDatePreset] = useState("5y");
  const [customYearFrom, setCustomYearFrom] = useState<number>(2020);
  const [customYearTo, setCustomYearTo] = useState<number>(
    new Date().getFullYear(),
  );

  // Доступность текста
  const [textAvailability, setTextAvailability] = useState("any");

  // Типы публикаций
  const [pubTypes, setPubTypes] = useState<string[]>([]);
  const [pubTypesLogic, setPubTypesLogic] = useState<"or" | "and">("or");

  // Перевод
  const [translateAfterSearch, setTranslateAfterSearch] = useState(false);

  const [maxResults, setMaxResults] = useState(100);
  const [searching, setSearching] = useState(false);

  // Прогресс поиска (real-time через WebSocket)
  const [searchProgress, setSearchProgress] = useState<{
    stage: string;
    stageLabel: string;
    totalFound?: number;
    collected?: number;
    relevanceKept?: number;
    relevanceRemoved?: number;
    saved?: number;
    translated?: number;
    statsFound?: number;
    elapsedMs: number;
    estimatedTotalMs?: number;
  } | null>(null);
  const searchStartTimeRef = useRef<number>(0);

  // Поиск всех статей
  const [showAllArticlesConfirm, setShowAllArticlesConfirm] = useState(false);
  const [allArticlesCount, setAllArticlesCount] = useState<number | null>(null);
  const [countingArticles, setCountingArticles] = useState(false);

  // Перевод постфактум
  const [translating, setTranslating] = useState(false);
  const [translatingOne, setTranslatingOne] = useState(false);

  // Обогащение Crossref
  const [enriching, setEnriching] = useState(false);

  // AI детекция статистики
  const [detectingStats, setDetectingStats] = useState(false);
  const [aiStatsProgress, setAiStatsProgress] = useState<{
    percent: number;
    analyzed: number;
    found: number;
    total: number;
  } | null>(null);

  // Выбранная статья для просмотра
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  // Конвертация в документ
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingToDoc, setConvertingToDoc] = useState(false);
  const [convertIncludeBibliography, setConvertIncludeBibliography] =
    useState(false);
  const [convertDocTitle, setConvertDocTitle] = useState("");

  // Добавление статьи по DOI
  const [showAddByDoiModal, setShowAddByDoiModal] = useState(false);

  // AI ассистент
  const [showAISidebar, setShowAISidebar] = useState(false);

  // Глобальные настройки отображения
  const [listLang, setListLang] = useState<"ru" | "en">("ru"); // Язык в списке
  const [highlightStats, setHighlightStats] = useState(true); // Подсветка статистики

  // Массовый выбор
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Позиции навигационных стрелок (динамический расчёт)
  const gridRef = useRef<HTMLDivElement>(null);
  const [arrowPositions, setArrowPositions] = useState<{
    left: number;
    right: number;
  } | null>(null);

  // Сортировка
  const [sortBy, setSortBy] = useState<
    "date" | "stats" | "year_desc" | "year_asc"
  >("date");

  // Локальный поиск по названию в базе
  const [localSearch, setLocalSearch] = useState("");

  // Фильтр по периоду годов
  const [yearFromFilter, setYearFromFilter] = useState<number | null>(null);
  const [yearToFilter, setYearToFilter] = useState<number | null>(null);

  // ============ WebSocket for search progress ============
  const handleSearchProgressEvent = useCallback((event: any) => {
    if (event.type !== "search:progress") return;
    const data = event.payload as SearchProgressEvent;

    const elapsed = Date.now() - searchStartTimeRef.current;

    const stageLabels: Record<string, string> = {
      searching: "Отправляем запрос в базы данных...",
      searching_source: `Поиск в ${(data.source || "").toUpperCase()}...`,
      search_complete: `Найдено ${data.collected || 0} статей (${data.totalFound || 0} всего в базах)`,
      relevance_filter: `AI-проверка релевантности: ${data.processed || 0}/${data.total || 0}...`,
      relevance_filter_done: `Проверка завершена: оставлено ${data.kept || 0} из ${data.total || 0} (${data.removed || 0} отфильтровано)`,
      saving: `Сохраняем в базу: ${data.saved || 0}/${data.total || 0}...`,
      saved: `Сохранено ${data.added || 0} статей`,
      enriching: `Обогащение метаданными Crossref...`,
      translating: `Перевод статей: ${data.translated || 0}/${data.total || 0}...`,
      detecting_stats: `Анализ статистики: ${data.analyzed || 0}/${data.total || 0} (найдена в ${data.found || 0})...`,
      complete: data.message || "Готово!",
    };

    // Estimate remaining time based on progress
    let estimatedTotalMs: number | undefined;
    if (
      data.stage === "relevance_filter" &&
      data.processed &&
      data.total &&
      data.processed > 0
    ) {
      const rate = elapsed / data.processed;
      estimatedTotalMs = rate * data.total;
    } else if (
      data.stage === "saving" &&
      data.saved &&
      data.total &&
      data.saved > 0
    ) {
      const rate = elapsed / data.saved;
      estimatedTotalMs = rate * data.total;
    } else if (
      data.stage === "translating" &&
      data.translated &&
      data.total &&
      data.translated > 0
    ) {
      const rate = elapsed / data.translated;
      estimatedTotalMs = rate * data.total;
    }

    setSearchProgress({
      stage: data.stage,
      stageLabel: stageLabels[data.stage] || data.stage,
      totalFound: data.totalFound,
      collected: data.collected,
      relevanceKept: data.kept,
      relevanceRemoved: data.removed,
      saved: data.saved || data.added,
      translated: data.translated,
      statsFound: data.found,
      elapsedMs: elapsed,
      estimatedTotalMs,
    });
  }, []);

  useProjectWebSocket({
    projectId,
    onEvent: handleSearchProgressEvent,
    enabled: searching,
  });

  async function loadArticles() {
    setLoading(true);
    setError(null);
    try {
      const status = viewStatus === "all" ? undefined : viewStatus;
      const res = await apiGetArticles(
        projectId,
        status,
        showStatsOnly || undefined,
        filterSourceQuery || undefined,
      );
      setArticles(res.articles);
      setCounts({
        candidate: res.counts.candidate,
        selected: res.counts.selected,
        excluded: res.counts.excluded,
        deleted: res.counts.deleted || 0,
      });
      // Сохраняем доступные поисковые запросы для фильтра
      if (res.searchQueries) {
        setAvailableSourceQueries(res.searchQueries);
      }
      // Передаём counts наверх для отображения в табах
      const total =
        res.counts.candidate + res.counts.selected + res.counts.excluded;
      // Update context counts for sidebar sub-menu
      setContextCounts({
        candidate: res.counts.candidate,
        selected: res.counts.selected,
        excluded: res.counts.excluded,
        deleted: res.counts.deleted || 0,
        total,
      });
      if (onCountsChange) {
        onCountsChange({
          candidate: res.counts.candidate,
          selected: res.counts.selected,
          excluded: res.counts.excluded,
          total,
        });
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки статей");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles();
  }, [projectId, viewStatus, showStatsOnly, filterSourceQuery]);

  // Динамический расчёт позиций навигационных стрелок
  useEffect(() => {
    function calculateArrowPositions() {
      const grid = gridRef.current;
      if (!grid) return;

      const gridRect = grid.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Находим sidebar toggle button для определения визуальной границы сайдбара
      const sidebarToggle = document.querySelector(".sidebar-collapse-toggle");
      let sidebarVisualRight = 0;

      if (sidebarToggle) {
        const toggleRect = sidebarToggle.getBoundingClientRect();
        sidebarVisualRight = toggleRect.right;
      } else {
        // Fallback: используем sidebar
        const sidebar = document.querySelector(".app-sidebar");
        if (sidebar) {
          sidebarVisualRight = sidebar.getBoundingClientRect().right;
        }
      }

      // Левая стрелка: центр между правым краем toggle button и левым краем карточек
      const leftGapCenter = (sidebarVisualRight + gridRect.left) / 2;

      // Правая стрелка: центр между правым краем карточек и правым краем viewport
      const rightGapCenter = (gridRect.right + viewportWidth) / 2;
      const leftPosition = leftGapCenter;
      const rightPosition = viewportWidth - rightGapCenter;

      document.documentElement.style.setProperty(
        "--articles-nav-arrow-left",
        `${leftPosition}px`,
      );
      document.documentElement.style.setProperty(
        "--articles-nav-arrow-right",
        `${rightPosition}px`,
      );

      setArrowPositions({
        left: leftPosition,
        right: rightPosition,
      });
    }

    // Начальный расчёт
    calculateArrowPositions();

    // Пересчёт при изменении размеров окна
    window.addEventListener("resize", calculateArrowPositions);

    // MutationObserver для отслеживания изменения класса sidebar-collapsed
    const observer = new MutationObserver(() => {
      // Небольшая задержка для завершения анимации сайдбара
      setTimeout(calculateArrowPositions, 200);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // ResizeObserver для отслеживания изменения размера грида
    const resizeObserver = new ResizeObserver(() => {
      calculateArrowPositions();
    });

    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }

    return () => {
      window.removeEventListener("resize", calculateArrowPositions);
      observer.disconnect();
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty(
        "--articles-nav-arrow-left",
      );
      document.documentElement.style.removeProperty(
        "--articles-nav-arrow-right",
      );
    };
  }, []);

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

  // Toggle search source
  function toggleSearchSource(source: SearchSource) {
    setSearchSources((prev) => {
      if (prev.includes(source)) {
        // Don't allow removing last source
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== source);
      } else {
        return [...prev, source];
      }
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    setOk(null);
    searchStartTimeRef.current = Date.now();
    setSearchProgress({
      stage: "init",
      stageLabel: "Инициализация поиска...",
      elapsedMs: 0,
    });

    const { yearFrom, yearTo } = getYearsFromPreset();

    const filters: SearchFilters = {
      yearFrom,
      yearTo,
    };

    // Поле поиска PubMed
    if (searchField && searchField !== "All Fields") {
      filters.searchField = searchField;
    }

    // Доступность текста (only for PubMed)
    if (searchSources.includes("pubmed")) {
      if (textAvailability === "free_full") {
        filters.freeFullTextOnly = true;
      } else if (textAvailability === "full") {
        filters.fullTextOnly = true;
      }
    }

    // Типы публикаций (only for PubMed)
    if (searchSources.includes("pubmed") && pubTypes.length > 0) {
      const pubmedTypes = PUBLICATION_TYPES.filter((pt) =>
        pubTypes.includes(pt.id),
      ).map((pt) => pt.pubmed);
      filters.publicationTypes = pubmedTypes;
      filters.publicationTypesLogic = pubTypesLogic;
    }

    // Перевод
    filters.translate = translateAfterSearch;

    try {
      const res = await apiSearchArticles(
        projectId,
        searchQuery.trim(),
        filters,
        maxResults,
        searchSources,
      );
      setOk(res.message);
      setShowSearch(false);
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка поиска");
    } finally {
      setSearching(false);
      // Keep progress visible for 3 seconds after completion
      setTimeout(() => setSearchProgress(null), 3000);
    }
  }

  // Мультипоиск - добавить новый запрос
  function addMultiQuery() {
    if (!searchQuery.trim()) return;
    setMultiQueries((prev) => [
      ...prev,
      { query: searchQuery.trim(), id: crypto.randomUUID() },
    ]);
    setSearchQuery("");
  }

  function removeMultiQuery(id: string) {
    setMultiQueries((prev) => prev.filter((q) => q.id !== id));
  }

  // Выполнить мультипоиск
  async function handleMultiSearch(e: React.FormEvent) {
    e.preventDefault();

    const allQueries = [...multiQueries.map((q) => q.query)];
    if (searchQuery.trim()) {
      allQueries.push(searchQuery.trim());
    }

    if (allQueries.length === 0) return;

    setSearching(true);
    setError(null);
    setOk(null);

    const { yearFrom, yearTo } = getYearsFromPreset();

    const filters: SearchFilters = {
      yearFrom,
      yearTo,
    };

    // Поле поиска PubMed
    if (searchField && searchField !== "All Fields") {
      filters.searchField = searchField;
    }

    if (searchSources.includes("pubmed")) {
      if (textAvailability === "free_full") {
        filters.freeFullTextOnly = true;
      } else if (textAvailability === "full") {
        filters.fullTextOnly = true;
      }
    }

    if (searchSources.includes("pubmed") && pubTypes.length > 0) {
      const pubmedTypes = PUBLICATION_TYPES.filter((pt) =>
        pubTypes.includes(pt.id),
      ).map((pt) => pt.pubmed);
      filters.publicationTypes = pubmedTypes;
      filters.publicationTypesLogic = pubTypesLogic;
    }

    filters.translate = translateAfterSearch;

    const results: string[] = [];
    let totalFound = 0;

    try {
      for (const query of allQueries) {
        const res = await apiSearchArticles(
          projectId,
          query,
          filters,
          maxResults,
          searchSources,
        );
        results.push(`${query}: ${res.message}`);
        totalFound += res.added;
      }

      setOk(
        `Мультипоиск завершён. Найдено: ${totalFound} статей.\n${results.join("\n")}`,
      );
      setShowSearch(false);
      setMultiQueries([]);
      setSearchQuery("");
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка поиска");
    } finally {
      setSearching(false);
    }
  }

  // Поиск всех статей - сначала получаем количество, затем подтверждение
  async function handleSearchAllArticles() {
    if (!searchQuery.trim()) {
      setError("Введите поисковый запрос для поиска всех статей");
      return;
    }

    setCountingArticles(true);
    setError(null);

    const { yearFrom, yearTo } = getYearsFromPreset();

    const filters: SearchFilters = {
      yearFrom,
      yearTo,
    };

    if (searchField && searchField !== "All Fields") {
      filters.searchField = searchField;
    }

    if (searchSources.includes("pubmed")) {
      if (textAvailability === "free_full") {
        filters.freeFullTextOnly = true;
      } else if (textAvailability === "full") {
        filters.fullTextOnly = true;
      }
    }

    if (searchSources.includes("pubmed") && pubTypes.length > 0) {
      const pubmedTypes = PUBLICATION_TYPES.filter((pt) =>
        pubTypes.includes(pt.id),
      ).map((pt) => pt.pubmed);
      filters.publicationTypes = pubmedTypes;
      filters.publicationTypesLogic = pubTypesLogic;
    }

    try {
      // Запрашиваем количество статей (используем специальный endpoint или maxResults: 1 для получения count)
      const res = await apiSearchArticles(
        projectId,
        searchQuery.trim(),
        filters,
        1,
        searchSources,
      );
      const totalCount = res.totalFound || 0;
      setAllArticlesCount(totalCount);
      setShowAllArticlesConfirm(true);
    } catch (err: any) {
      setError(err?.message || "Ошибка получения количества статей");
    } finally {
      setCountingArticles(false);
    }
  }

  // Подтверждение загрузки всех статей
  async function handleConfirmSearchAll() {
    setShowAllArticlesConfirm(false);

    if (!searchQuery.trim() || !allArticlesCount) return;

    setSearching(true);
    setError(null);
    setOk(null);

    const { yearFrom, yearTo } = getYearsFromPreset();

    const filters: SearchFilters = {
      yearFrom,
      yearTo,
    };

    if (searchField && searchField !== "All Fields") {
      filters.searchField = searchField;
    }

    if (searchSources.includes("pubmed")) {
      if (textAvailability === "free_full") {
        filters.freeFullTextOnly = true;
      } else if (textAvailability === "full") {
        filters.fullTextOnly = true;
      }
    }

    if (searchSources.includes("pubmed") && pubTypes.length > 0) {
      const pubmedTypes = PUBLICATION_TYPES.filter((pt) =>
        pubTypes.includes(pt.id),
      ).map((pt) => pt.pubmed);
      filters.publicationTypes = pubmedTypes;
      filters.publicationTypesLogic = pubTypesLogic;
    }

    filters.translate = translateAfterSearch;

    try {
      // Загружаем все статьи используя maxResults = 10000 (практический максимум)
      const res = await apiSearchArticles(
        projectId,
        searchQuery.trim(),
        filters,
        10000,
        searchSources,
      );
      setOk(res.message);
      setShowSearch(false);
      setAllArticlesCount(null);
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка поиска");
    } finally {
      setSearching(false);
    }
  }

  async function handleStatusChange(
    article: Article,
    newStatus: "candidate" | "selected" | "excluded" | "deleted",
  ) {
    // Optimistic update - immediately update UI
    const previousStatus = article.status;
    const previousArticles = [...articles];

    // Update local state immediately
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, status: newStatus } : a)),
    );

    // Update counts optimistically
    setCounts((prev) => ({
      ...prev,
      [previousStatus]: Math.max(
        0,
        prev[previousStatus as keyof typeof prev] - 1,
      ),
      [newStatus]: (prev[newStatus as keyof typeof prev] || 0) + 1,
    }));

    try {
      await apiUpdateArticleStatus(projectId, article.id, newStatus);
      // Show success toast for important status changes
      if (newStatus === "selected") {
        toast.success(
          "Статья включена",
          article.title_en?.slice(0, 50) + "...",
        );
      } else if (newStatus === "excluded") {
        toast.info("Статья исключена");
      }
    } catch (err: any) {
      // Revert on error
      setArticles(previousArticles);
      setCounts((prev) => ({
        ...prev,
        [newStatus]: Math.max(0, prev[newStatus as keyof typeof prev] - 1),
        [previousStatus]: (prev[previousStatus as keyof typeof prev] || 0) + 1,
      }));
      toast.error("Ошибка обновления статуса", err?.message);
    }
  }

  // Массовое изменение статуса с оптимистичным обновлением
  async function handleBulkStatus(
    status: "candidate" | "selected" | "excluded" | "deleted",
  ) {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    const count = ids.length;
    const previousArticles = [...articles];

    // Optimistic update
    setArticles((prev) =>
      prev.map((a) => (selectedIds.has(a.id) ? { ...a, status } : a)),
    );
    setSelectedIds(new Set());

    try {
      // Batch update - API should support this ideally
      await Promise.all(
        ids.map((id) => apiUpdateArticleStatus(projectId, id, status)),
      );

      toast.success(`${count} статей обновлено`, `Статус: ${status}`);
      await loadArticles(); // Reload to sync counts
    } catch (err: any) {
      // Revert on error
      setArticles(previousArticles);
      toast.error("Ошибка массового обновления", err?.message);
    }
  }

  // Массовый перевод выбранных
  async function handleBulkTranslate() {
    if (selectedIds.size === 0) return;
    setTranslating(true);
    setError(null);

    try {
      await apiTranslateArticles(projectId, Array.from(selectedIds), true);
      toast.success("Перевод завершён");
      setSelectedIds(new Set());
      await loadArticles();
    } catch (err: any) {
      toast.error("Ошибка перевода", err?.message);
    } finally {
      setTranslating(false);
    }
  }

  // Обогащение через Crossref
  async function handleEnrich() {
    setEnriching(true);
    setError(null);
    setOk(null);

    try {
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const res = await apiEnrichArticles(projectId, ids);
      setOk(res.message);
      setSelectedIds(new Set());
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка обогащения");
    } finally {
      setEnriching(false);
    }
  }

  // AI детекция статистики
  async function handleAIDetectStats() {
    setDetectingStats(true);
    setError(null);
    setOk(null);
    setAiStatsProgress(null);

    try {
      // Если выбраны статьи - анализируем только их
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const res = await apiDetectStatsWithAI(projectId, ids, {
        onStart: (data) => {
          setAiStatsProgress({
            percent: 0,
            analyzed: 0,
            found: 0,
            total: data.total,
          });
        },
        onProgress: (data) => {
          setAiStatsProgress({
            percent: data.percent,
            analyzed: data.analyzed,
            found: data.found,
            total: data.total,
          });
        },
        onComplete: (data) => {
          setOk(data.message);
          setAiStatsProgress(null);
        },
        onError: (err) => {
          setError(err.message);
          setAiStatsProgress(null);
        },
      });
      setSelectedIds(new Set());
      await loadArticles();
    } catch (err: any) {
      setError(err?.message || "Ошибка AI анализа статистики");
      setAiStatsProgress(null);
    } finally {
      setDetectingStats(false);
    }
  }

  // Выбрать/снять все
  function toggleSelectAll() {
    if (selectedIds.size === filteredArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArticles.map((a) => a.id)));
    }
  }

  // Переключить выбор одной статьи
  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function togglePubType(pt: string) {
    setPubTypes((prev) =>
      prev.includes(pt) ? prev.filter((x) => x !== pt) : [...prev, pt],
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

  // Перевод одной статьи
  async function handleTranslateOne(articleId: string) {
    setTranslatingOne(true);
    setError(null);

    try {
      await apiTranslateArticles(projectId, [articleId], true);
      await loadArticles();
      // Обновить выбранную статью если она открыта
      if (selectedArticle?.id === articleId) {
        const updated = articles.find((a) => a.id === articleId);
        if (updated) setSelectedArticle(updated);
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка перевода");
    } finally {
      setTranslatingOne(false);
    }
  }

  // Конвертация статьи в документ
  function openConvertModal() {
    if (!selectedArticle) return;
    setConvertDocTitle(selectedArticle.title_ru || selectedArticle.title_en);
    setConvertIncludeBibliography(false);
    setShowConvertModal(true);
  }

  async function handleConvertToDocument() {
    if (!selectedArticle) return;

    setConvertingToDoc(true);
    setError(null);

    try {
      const result = await apiConvertArticleToDocument(
        projectId,
        selectedArticle.id,
        {
          includeBibliography: convertIncludeBibliography,
          documentTitle: convertDocTitle || undefined,
        },
      );
      setOk(result.message);
      setShowConvertModal(false);
      setSelectedArticle(null);
    } catch (err: any) {
      setError(err?.message || "Ошибка создания документа");
    } finally {
      setConvertingToDoc(false);
    }
  }

  // Функция подсветки статистики в тексте
  function highlightStatistics(text: string, aiStats?: any): React.ReactNode {
    if (!highlightStats || !text) return text;

    // Паттерны для статистики (EN + RU) - расширенные
    const patterns = [
      // p-value с разной значимостью
      { regex: /[PpРр]\s*[<≤]\s*0[.,]001/g, className: "stat-p001" },
      { regex: /[PpРр]\s*[<≤]\s*0[.,]01(?!\d)/g, className: "stat-p01" },
      { regex: /[PpРр]\s*[<≤]\s*0[.,]05(?!\d)/g, className: "stat-p05" },
      { regex: /[PpРр]\s*[=]\s*0[.,]\d+/g, className: "stat-pval" },
      { regex: /[PpРр]\s*[>]\s*0[.,]05/g, className: "stat-pval" },
      // p= в скобках: (p=0.0268)
      {
        regex: /\(\s*[PpРр]\s*[=<>≤≥]\s*0[.,]\d+\s*\)/g,
        className: "stat-pval",
      },
      // CI / ДИ (доверительный интервал) - все форматы
      {
        regex: /95\s*%?\s*(?:CI|ДИ)[:\s]*\(?[\d.,]+[\s–\-−—to]+[\d.,]+\)?/gi,
        className: "stat-ci",
      },
      {
        regex: /(?:CI|ДИ)[:\s]+\(?[\d.,]+[\s–\-−—to]+[\d.,]+\)?/gi,
        className: "stat-ci",
      },
      // CI в скобках после значения: (0.778-0.985)
      {
        regex: /\(\s*[\d.,]+\s*[-–−—to]+\s*[\d.,]+\s*\)/g,
        className: "stat-ci",
      },
      // I² (гетерогенность)
      { regex: /I[²2]\s*[=:]\s*[\d.,]+\s*%?/gi, className: "stat-ci" },
      // OR, RR, HR - все форматы включая с пробелами и скобками
      {
        regex: /\b(?:a?OR|a?RR|a?HR|SMD|ОШ|ОР|NNT|NNH)\s*[=:]\s*[\d.,]+/gi,
        className: "stat-ratio",
      },
      {
        regex: /\(\s*(?:a?OR|a?RR|a?HR|SMD)\s*[=:]\s*[\d.,]+/gi,
        className: "stat-ratio",
      },
      // Хи-квадрат, F-статистика, t-test
      { regex: /[χχ²X²]\s*[=:]\s*[\d.,]+/gi, className: "stat-ratio" },
      {
        regex: /\bF\s*\(\s*\d+\s*,\s*\d+\s*\)\s*[=:]\s*[\d.,]+/gi,
        className: "stat-ratio",
      },
      {
        regex: /\bt\s*\(\s*\d+\s*\)\s*[=:]\s*[\d.,]+/gi,
        className: "stat-ratio",
      },
      // Корреляция
      { regex: /\b[rR]\s*[=:]\s*[-−]?0[.,]\d+/g, className: "stat-ratio" },
      // Шкалы качества
      { regex: /\b(?:NOS|AHRQ|GRADE)[:\s]+[\d.,]+/gi, className: "stat-n" },
      // Размер выборки - разные форматы
      { regex: /\b[nN]\s*[=]\s*[\d,\s]+/g, className: "stat-n" },
      {
        regex: /\d+\s+(?:patients|subjects|participants|cases)/gi,
        className: "stat-n",
      },
      // Mean ± SD
      { regex: /\d+[.,]\d*\s*[±]\s*\d+[.,]?\d*/g, className: "stat-ratio" },
    ];

    // Применяем все паттерны
    const replacements: Array<{
      start: number;
      end: number;
      match: string;
      className: string;
      source: "regex" | "ai";
    }> = [];

    for (const { regex, className } of patterns) {
      let match;
      const r = new RegExp(regex.source, regex.flags);
      while ((match = r.exec(text)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          match: match[0],
          className,
          source: "regex",
        });
      }
    }

    // Добавляем результаты AI-анализа (из stats_json.ai)
    if (aiStats?.ai?.stats && Array.isArray(aiStats.ai.stats)) {
      for (const stat of aiStats.ai.stats) {
        if (!stat.text) continue;

        // Ищем текст статистики в абстракте
        const statText = stat.text;
        let idx = text.indexOf(statText);

        // Если точное совпадение не найдено, пробуем нечёткий поиск
        if (idx === -1) {
          // Убираем лишние пробелы и ищем снова
          const normalizedStat = statText.replace(/\s+/g, " ").trim();
          const normalizedText = text.replace(/\s+/g, " ");
          const normalizedIdx = normalizedText.indexOf(normalizedStat);
          if (normalizedIdx !== -1) {
            // Находим соответствующую позицию в оригинальном тексте
            let origIdx = 0;
            let normIdx = 0;
            while (normIdx < normalizedIdx && origIdx < text.length) {
              if (
                text[origIdx] === " " &&
                (origIdx === 0 || text[origIdx - 1] === " ")
              ) {
                origIdx++;
              } else {
                origIdx++;
                normIdx++;
              }
            }
            idx = origIdx;
          }
        }

        if (idx !== -1) {
          // Пропускаем not-significant статистику - она не важна для подсветки
          if (stat.significance === "not-significant") {
            continue;
          }

          // Определяем CSS класс по значимости (только для реальных p-values)
          let className = "stat-ai"; // базовый класс для AI-найденной статистики
          if (stat.significance === "high") {
            className = "stat-p001"; // зелёный - высокая значимость (p < 0.001)
          } else if (stat.significance === "medium") {
            className = "stat-p01"; // жёлтый - средняя (p < 0.01)
          } else if (stat.significance === "low") {
            className = "stat-p05"; // оранжевый - низкая (p < 0.05)
          } else if (stat.type === "confidence-interval") {
            className = "stat-ci";
          } else if (stat.type === "effect-size") {
            className = "stat-ratio";
          } else if (
            stat.type === "p-value" ||
            stat.type === "test-statistic"
          ) {
            className = "stat-pval";
          }

          replacements.push({
            start: idx,
            end: idx + statText.length,
            match: statText,
            className,
            source: "ai",
          });
        }
      }
    }

    // Сортируем по позиции и удаляем пересечения (приоритет regex над AI для избежания дублей)
    replacements.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      // При одинаковой позиции - приоритет regex
      return a.source === "regex" ? -1 : 1;
    });

    const filtered: typeof replacements = [];
    for (const r of replacements) {
      const last = filtered[filtered.length - 1];
      if (!last || r.start >= last.end) {
        filtered.push(r);
      }
    }

    // Собираем результат
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;
    for (const r of filtered) {
      if (r.start > lastEnd) {
        parts.push(text.slice(lastEnd, r.start));
      }
      parts.push(
        <span
          key={r.start}
          className={r.className}
          title={r.source === "ai" ? "Найдено AI" : undefined}
        >
          {r.match}
        </span>,
      );
      lastEnd = r.end;
    }
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }

    return parts.length > 0 ? parts : text;
  }

  const total = counts.candidate + counts.selected + counts.excluded; // deleted не включаем в общий счёт

  // Подсчёт непереведённых статей
  const untranslatedCount = articles.filter((a) => !a.title_ru).length;

  // Получить заголовок статьи в зависимости от выбранного языка
  function getTitle(a: Article): string {
    if (listLang === "ru" && a.title_ru) return a.title_ru;
    return a.title_en;
  }

  // Собрать уникальные типы публикаций из текущих статей
  const availablePubTypes = Array.from(
    new Set(articles.flatMap((a) => a.publication_types || [])),
  ).sort();

  // Фильтрация статей по типу публикации
  const filteredByType = filterPubType
    ? articles.filter((a) => a.publication_types?.includes(filterPubType))
    : articles;

  // Фильтрация по локальному поиску (название)
  const filteredBySearch = localSearch.trim()
    ? filteredByType.filter((a) => {
        const query = localSearch.toLowerCase();
        return (
          a.title_en?.toLowerCase().includes(query) ||
          a.title_ru?.toLowerCase().includes(query) ||
          a.authors?.some((auth) => auth.toLowerCase().includes(query))
        );
      })
    : filteredByType;

  // Фильтрация по периоду годов
  const filteredByYear = filteredBySearch.filter((a) => {
    if (yearFromFilter && a.year && a.year < yearFromFilter) return false;
    if (yearToFilter && a.year && a.year > yearToFilter) return false;
    return true;
  });

  // Сортировка
  const filteredArticles = [...filteredByYear].sort((a, b) => {
    if (sortBy === "stats") {
      return (b.stats_quality || 0) - (a.stats_quality || 0);
    }
    if (sortBy === "year_desc") {
      return (b.year || 0) - (a.year || 0);
    }
    if (sortBy === "year_asc") {
      return (a.year || 0) - (b.year || 0);
    }
    // По умолчанию по дате добавления
    return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
  });

  // Current status label for header
  const statusLabels: Record<string, string> = {
    candidate: "Кандидаты",
    selected: "Отобранные",
    excluded: "Исключённые",
    all: "Все",
    deleted: "Корзина",
  };

  return (
    <div className="articles-page">
      {/* Unified Header Toolbar */}
      <div className="articles-header">
        <div className="articles-header-left">
          <h5 className="articles-header-title">
            База статей
            <span className="articles-header-status">
              / {statusLabels[viewStatus] || "Все"}
            </span>
            <span className="articles-header-count">
              ({filteredArticles.length})
            </span>
          </h5>
        </div>
        <div className="articles-header-right">
          {canEdit && (
            <>
              <button
                className="articles-toolbar-btn"
                onClick={() => setShowAddByDoiModal(true)}
                type="button"
                title="Добавить статью по DOI"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                По DOI
              </button>
              <button
                className="articles-toolbar-btn articles-toolbar-btn--ai"
                onClick={() => setShowAISidebar(!showAISidebar)}
                type="button"
                title="AI помощник — подбор статей по параметрам"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {showAISidebar ? "Скрыть AI" : "AI подбор"}
              </button>
              <button
                className="articles-toolbar-btn articles-toolbar-btn--primary liquid-metal"
                onClick={() => setShowSearch(!showSearch)}
                type="button"
              >
                <svg
                  className="w-4 h-4 liquid-metal-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {showSearch ? "Скрыть поиск" : "Поиск статей"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert articles-status-message">{error}</div>}
      {ok && <div className="ok articles-status-message">{ok}</div>}

      {/* Форма поиска */}
      {showSearch && (
        <form
          onSubmit={multiQueries.length > 0 ? handleMultiSearch : handleSearch}
          className="card search-form-card articles-search-form"
        >
          {/* Header */}
          <div className="search-form-header">
            <div className="search-form-title">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="search-form-title-heading">
                Поиск научных статей
              </h3>
            </div>
            <label className="row gap search-multisearch-toggle">
              <input
                type="checkbox"
                checked={showMultiSearch}
                onChange={(e) => setShowMultiSearch(e.target.checked)}
                className="search-checkbox"
              />
              <span className="muted search-multisearch-label">
                Мультипоиск
              </span>
            </label>
          </div>

          {/* Источники поиска */}
          <div className="search-sources-section">
            <div className="search-section-label">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>Источники:</span>
            </div>
            <div className="search-sources-grid">
              {SEARCH_SOURCES.map((source) => (
                <label
                  key={source.value}
                  className={`search-source-option ${searchSources.includes(source.value) ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={searchSources.includes(source.value)}
                    onChange={() => toggleSearchSource(source.value)}
                    className="search-checkbox"
                  />
                  <div className="search-source-content">
                    <span className="search-source-name">{source.label}</span>
                    <span className="search-source-desc">
                      {source.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="stack">
            {/* Мультипоиск - список запросов */}
            {showMultiSearch && multiQueries.length > 0 && (
              <div className="multi-query-list">
                <span className="muted multi-query-list-title">
                  Запросы для мультипоиска:
                </span>
                <div className="multi-query-items">
                  {multiQueries.map((q, idx) => (
                    <div key={q.id} className="row gap multi-query-item">
                      <span className="multi-query-item-text">
                        <span className="muted">{idx + 1}.</span> {q.query}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMultiQuery(q.id)}
                        className="btn secondary multi-query-remove-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="row gap search-query-row">
              <label className="stack search-query-field">
                <span>
                  Поисковый запрос {multiQueries.length > 0 ? "" : "*"}
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='например: "heart failure" AND "machine learning"'
                  required={multiQueries.length === 0}
                />
              </label>

              {/* Поле поиска PubMed */}
              <label className="stack search-field-filter">
                <span>Искать в поле:</span>
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  className="search-field-select"
                >
                  {PUBMED_SEARCH_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>

              {showMultiSearch && (
                <button
                  type="button"
                  onClick={addMultiQuery}
                  disabled={!searchQuery.trim()}
                  className="btn secondary search-add-query-btn"
                  title="Добавить запрос в список"
                >
                  + Добавить
                </button>
              )}
            </div>

            {/* Период публикации */}
            <div>
              <span className="muted">Период публикации:</span>
              <div className="row gap search-option-list">
                {DATE_PRESETS.map((preset) => (
                  <label key={preset.id} className="row gap search-option-item">
                    <input
                      type="radio"
                      name="datePreset"
                      checked={datePreset === preset.id}
                      onChange={() => setDatePreset(preset.id)}
                      className="search-option-input"
                    />
                    <span className="search-option-label">{preset.label}</span>
                  </label>
                ))}
              </div>

              {datePreset === "custom" && (
                <div className="row gap search-custom-years">
                  <label className="stack search-custom-year-field">
                    <span>Год от</span>
                    <input
                      type="number"
                      value={customYearFrom}
                      onChange={(e) =>
                        setCustomYearFrom(Number(e.target.value))
                      }
                      min={1900}
                      max={2100}
                    />
                  </label>
                  <label className="stack search-custom-year-field">
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
              <div className="row gap search-option-list">
                {TEXT_AVAILABILITY.map((opt) => (
                  <label key={opt.id} className="row gap search-option-item">
                    <input
                      type="radio"
                      name="textAvailability"
                      checked={textAvailability === opt.id}
                      onChange={() => setTextAvailability(opt.id)}
                      className="search-option-input"
                    />
                    <span className="search-option-label">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Тип публикации */}
            <div>
              <div className="row gap pub-types-header">
                <span className="muted">Тип публикации:</span>
                {pubTypes.length > 1 && (
                  <div className="row gap pub-types-logic">
                    <label className="row gap search-option-item">
                      <input
                        type="radio"
                        name="pubTypesLogic"
                        checked={pubTypesLogic === "or"}
                        onChange={() => setPubTypesLogic("or")}
                        className="search-option-input"
                      />
                      <span className="search-option-sub-label">ИЛИ</span>
                    </label>
                    <label className="row gap search-option-item">
                      <input
                        type="radio"
                        name="pubTypesLogic"
                        checked={pubTypesLogic === "and"}
                        onChange={() => setPubTypesLogic("and")}
                        className="search-option-input"
                      />
                      <span className="search-option-sub-label">И</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="row gap search-option-list">
                {PUBLICATION_TYPES.map((pt) => (
                  <label key={pt.id} className="row gap search-option-item">
                    <input
                      type="checkbox"
                      checked={pubTypes.includes(pt.id)}
                      onChange={() => togglePubType(pt.id)}
                      className="search-option-input"
                    />
                    <span className="search-option-label">{pt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Дополнительные опции */}
            <div className="row gap search-extra-options">
              <label className="stack search-max-results-field">
                <span>Макс. результатов на источник</span>
                <select
                  value={maxResults}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "all") {
                      handleSearchAllArticles();
                    } else {
                      setMaxResults(Number(val));
                    }
                  }}
                  className="search-max-results-select"
                  title="Лимит применяется к каждому выбранному источнику отдельно"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value="all">Все статьи</option>
                </select>
              </label>

              <label className="row gap search-translate-option">
                <input
                  type="checkbox"
                  checked={translateAfterSearch}
                  onChange={(e) => setTranslateAfterSearch(e.target.checked)}
                  className="search-option-input"
                />
                <span className="search-translate-option-label">
                  <svg
                    className="icon-sm"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                  Перевести заголовки и абстракты (RU)
                </span>
              </label>
            </div>

            <div className="row gap">
              <button
                className="btn search-submit-btn"
                disabled={searching || searchSources.length === 0}
                type="submit"
              >
                {searching
                  ? "Поиск..."
                  : multiQueries.length > 0
                    ? `Мультипоиск (${multiQueries.length + (searchQuery.trim() ? 1 : 0)} запросов)`
                    : `Найти в ${searchSources.map((s) => (s === "pubmed" ? "PubMed" : s === "doaj" ? "DOAJ" : "Wiley")).join(", ")}`}
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  setShowSearch(false);
                  setMultiQueries([]);
                }}
                type="button"
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search Progress Panel */}
      {searching && searchProgress && (
        <div className="search-progress-panel">
          <div className="search-progress-header">
            <div
              className={`search-progress-spinner ${
                searchProgress.stage === "complete"
                  ? "search-progress-spinner--stopped"
                  : ""
              }`}
            />
            <span className="search-progress-stage-label">
              {searchProgress.stageLabel}
            </span>
          </div>

          {/* Progress stages timeline */}
          <div className="search-progress-timeline">
            {searchProgress.totalFound !== undefined && (
              <div className="search-progress-timeline-item">
                <span className="search-progress-check">&#10003;</span>
                <span>
                  Найдено в базах:{" "}
                  <strong className="search-progress-value">
                    {searchProgress.totalFound}
                  </strong>{" "}
                  статей, собрано{" "}
                  <strong className="search-progress-value">
                    {searchProgress.collected || 0}
                  </strong>
                </span>
              </div>
            )}
            {searchProgress.relevanceKept !== undefined && (
              <div className="search-progress-timeline-item">
                <span className="search-progress-check">&#10003;</span>
                <span>
                  AI-проверка: оставлено{" "}
                  <strong className="search-progress-value">
                    {searchProgress.relevanceKept}
                  </strong>
                  , отфильтровано{" "}
                  <strong className="search-progress-value-warning">
                    {searchProgress.relevanceRemoved || 0}
                  </strong>
                </span>
              </div>
            )}
            {searchProgress.saved !== undefined && searchProgress.saved > 0 && (
              <div className="search-progress-timeline-item">
                <span className="search-progress-check">&#10003;</span>
                <span>
                  Сохранено в базу:{" "}
                  <strong className="search-progress-value">
                    {searchProgress.saved}
                  </strong>{" "}
                  статей
                </span>
              </div>
            )}
            {searchProgress.translated !== undefined &&
              searchProgress.translated > 0 && (
                <div className="search-progress-timeline-item">
                  <span className="search-progress-check">&#10003;</span>
                  <span>
                    Переведено:{" "}
                    <strong className="search-progress-value">
                      {searchProgress.translated}
                    </strong>
                  </span>
                </div>
              )}
            {searchProgress.statsFound !== undefined &&
              searchProgress.statsFound > 0 && (
                <div className="search-progress-timeline-item">
                  <span className="search-progress-check">&#10003;</span>
                  <span>
                    Статистика найдена в:{" "}
                    <strong className="search-progress-value">
                      {searchProgress.statsFound}
                    </strong>
                  </span>
                </div>
              )}
          </div>

          {/* Timer */}
          <div className="search-progress-footer">
            <SearchElapsedTimer
              startTime={searchStartTimeRef.current}
              isRunning={searchProgress.stage !== "complete"}
            />
            {searchProgress.estimatedTotalMs &&
              searchProgress.stage !== "complete" && (
                <span>
                  ~
                  {Math.ceil(
                    (searchProgress.estimatedTotalMs -
                      searchProgress.elapsedMs) /
                      1000,
                  )}{" "}
                  сек. осталось
                </span>
              )}
          </div>
        </div>
      )}

      {/* Unified Filters Container */}
      <div className="articles-filters-container">
        {/* Row 1: Search input + Year filters */}
        <div className="articles-filters-row">
          <div className="articles-filter-search">
            <svg
              className="icon-sm"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Поиск по названию/автору..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          <div className="articles-filter-years">
            <span className="muted">Год:</span>
            <input
              type="number"
              placeholder="от"
              value={yearFromFilter || ""}
              onChange={(e) =>
                setYearFromFilter(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              min={1900}
              max={2100}
            />
            <span className="muted">—</span>
            <input
              type="number"
              placeholder="до"
              value={yearToFilter || ""}
              onChange={(e) =>
                setYearToFilter(e.target.value ? Number(e.target.value) : null)
              }
              min={1900}
              max={2100}
            />
          </div>
        </div>

        {/* Row 2: Dropdowns - source queries, sorting, pub types */}
        <div className="articles-filters-row">
          <select
            className="articles-filter-select"
            value={filterSourceQuery || ""}
            onChange={(e) => setFilterSourceQuery(e.target.value || null)}
            title="Фильтр по поисковому запросу"
          >
            <option value="">Все запросы</option>
            {availableSourceQueries.map((q) => (
              <option key={q} value={q} title={q}>
                {q.length > 30 ? q.slice(0, 30) + "..." : q}
              </option>
            ))}
          </select>

          <select
            className="articles-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date">По дате добавления</option>
            <option value="stats">По статистике</option>
            <option value="year_desc">По году ↓ (новые)</option>
            <option value="year_asc">По году ↑ (старые)</option>
          </select>

          <select
            className="articles-filter-select"
            value={filterPubType || ""}
            onChange={(e) => setFilterPubType(e.target.value || null)}
          >
            <option value="">Все типы</option>
            {availablePubTypes.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3: Select all + checkboxes left, Translate + lang toggle right */}
        <div className="articles-filters-row articles-filters-row--options">
          <div className="articles-filter-group">
            {canEdit && (
              <label className="articles-filter-checkbox articles-filter-checkbox--select-all">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size > 0 &&
                    selectedIds.size === filteredArticles.length
                  }
                  onChange={toggleSelectAll}
                />
                <span>
                  {selectedIds.size > 0
                    ? `Выбрано: ${selectedIds.size}`
                    : "Выбрать все"}
                </span>
              </label>
            )}

            <label className="articles-filter-checkbox">
              <input
                type="checkbox"
                checked={showStatsOnly}
                onChange={(e) => setShowStatsOnly(e.target.checked)}
              />
              <svg
                className="icon-sm"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Стат.</span>
            </label>

            <label className="articles-filter-checkbox">
              <input
                type="checkbox"
                checked={highlightStats}
                onChange={(e) => setHighlightStats(e.target.checked)}
              />
              <svg
                className="icon-sm"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              <span>Подсв.</span>
            </label>
          </div>

          <div className="articles-filter-group">
            {canEdit && untranslatedCount > 0 && (
              <button
                className="articles-toolbar-btn"
                onClick={handleTranslate}
                disabled={translating}
                type="button"
                title={`Перевести ${untranslatedCount} статей без перевода`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
                {translating
                  ? "Переводим..."
                  : `Перевести (${untranslatedCount})`}
              </button>
            )}
            <div className="lang-toggle">
              <button
                className={listLang === "ru" ? "active" : ""}
                onClick={() => setListLang("ru")}
                type="button"
                title="Русский (если есть перевод)"
              >
                RU
              </button>
              <button
                className={listLang === "en" ? "active" : ""}
                onClick={() => setListLang("en")}
                type="button"
                title="Английский (оригинал)"
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Панель массовых операций */}
      {canEdit && selectedIds.size > 0 && (
        <div className="bulk-actions">
          <div className="row gap">
            <button
              className="btn secondary bulk-action-btn"
              onClick={() => handleBulkStatus("selected")}
              title="Добавить выбранные в отобранные"
              type="button"
            >
              <svg
                className="icon-sm bulk-action-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Отобрать
            </button>
            <button
              className="btn secondary bulk-action-btn"
              onClick={() => handleBulkStatus("excluded")}
              title="Исключить выбранные"
              type="button"
            >
              <svg
                className="icon-sm bulk-action-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Исключить
            </button>
            <button
              className="btn secondary bulk-action-btn"
              onClick={handleBulkTranslate}
              disabled={translating}
              title="Перевести выбранные"
              type="button"
            >
              <svg
                className="icon-sm bulk-action-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              Перевести
            </button>
            <button
              className="btn secondary bulk-action-btn"
              onClick={handleEnrich}
              disabled={enriching}
              title="Обогатить данные через Crossref (DOI)"
              type="button"
            >
              <svg
                className="icon-sm bulk-action-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Crossref
            </button>
            <button
              className={`btn secondary bulk-action-btn bulk-action-ai-btn ${
                detectingStats && aiStatsProgress
                  ? "bulk-action-ai-btn--with-progress"
                  : ""
              }`}
              onClick={handleAIDetectStats}
              disabled={detectingStats}
              title="AI детекция статистики (OpenRouter)"
              type="button"
            >
              {detectingStats && aiStatsProgress ? (
                <>
                  <span className="spinner-small bulk-action-spinner" />
                  {aiStatsProgress.percent}% ({aiStatsProgress.analyzed}/
                  {aiStatsProgress.total})
                </>
              ) : (
                <>
                  <svg
                    className="icon-sm bulk-action-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  AI Статистика
                </>
              )}
            </button>
            {viewStatus !== "candidate" && viewStatus !== "deleted" && (
              <button
                className="btn secondary bulk-action-btn"
                onClick={() => handleBulkStatus("candidate")}
                title="Вернуть в кандидаты"
                type="button"
              >
                <svg
                  className="icon-sm bulk-action-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                В кандидаты
              </button>
            )}
            {viewStatus !== "deleted" && (
              <button
                className="btn secondary bulk-action-btn"
                onClick={() => handleBulkStatus("deleted")}
                title="Удалить в корзину"
                type="button"
              >
                <svg
                  className="icon-sm bulk-action-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Удалить
              </button>
            )}
            {viewStatus === "deleted" && (
              <button
                className="btn secondary bulk-action-btn"
                onClick={() => handleBulkStatus("candidate")}
                title="Восстановить из корзины"
                type="button"
              >
                <svg
                  className="icon-sm bulk-action-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Восстановить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Таблица статей */}
      {loading ? (
        <div className="muted">Загрузка...</div>
      ) : filteredArticles.length === 0 ? (
        <div className="muted">
          {articles.length === 0
            ? `Нет статей. ${canEdit ? "Используйте поиск чтобы добавить статьи из PubMed." : ""}`
            : "Нет статей соответствующих фильтру."}
        </div>
      ) : (
        <div ref={gridRef} className="articles-grid">
          {filteredArticles.map((a) => (
            <div key={a.id} id={`article-${a.id}`}>
              <ArticleCard
                article={toArticleData(a)}
                isSelected={selectedIds.has(a.id)}
                onSelect={toggleSelect}
                onStatusChange={(id, newStatus) => {
                  const article = articles.find((art) => art.id === id);
                  if (article) {
                    handleStatusChange(article, newStatus);
                  }
                }}
                onOpenDetails={() => setSelectedArticle(a)}
                language={listLang}
                compact={false}
              />
            </div>
          ))}
        </div>
      )}

      {/* Navigation Arrows - rendered via portal to escape overflow container */}
      {arrowPositions &&
        createPortal(
          (() => {
            const statusOrder = [
              "candidate",
              "selected",
              "excluded",
              "all",
              "deleted",
            ];
            const currentIndex = statusOrder.indexOf(viewStatus);
            const prevStatus =
              currentIndex > 0 ? statusOrder[currentIndex - 1] : null;
            const nextStatus =
              currentIndex < statusOrder.length - 1
                ? statusOrder[currentIndex + 1]
                : null;

            return (
              <>
                {prevStatus && (
                  <button
                    className="articles-nav-arrow articles-nav-arrow--left"
                    onClick={() =>
                      setViewStatus(prevStatus as typeof viewStatus)
                    }
                    title={statusLabels[prevStatus]}
                    type="button"
                  >
                    ‹
                  </button>
                )}
                {nextStatus && (
                  <button
                    className="articles-nav-arrow articles-nav-arrow--right"
                    onClick={() =>
                      setViewStatus(nextStatus as typeof viewStatus)
                    }
                    title={statusLabels[nextStatus]}
                    type="button"
                  >
                    ›
                  </button>
                )}
              </>
            );
          })(),
          document.body,
        )}

      {/* ResearchRabbit-style Article Sidebar/Modal */}
      {selectedArticle && (
        <div
          className="rabbit-overlay"
          onClick={() => {
            setSelectedArticle(null);
            setShowOriginal(false);
          }}
        >
          <div className="rabbit-sidebar" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="rabbit-header">
              <div className="rabbit-header-title">
                <svg
                  className="icon-md"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Детали статьи</span>
              </div>
              <div className="rabbit-header-actions">
                {selectedArticle.title_ru && (
                  <button
                    className={`rabbit-lang-btn ${!showOriginal ? "active" : ""}`}
                    onClick={() => setShowOriginal(!showOriginal)}
                    type="button"
                    title={
                      showOriginal ? "Показать перевод" : "Показать оригинал"
                    }
                  >
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    {showOriginal ? "RU" : "EN"}
                  </button>
                )}
                <button
                  className="rabbit-close-btn"
                  onClick={() => {
                    setSelectedArticle(null);
                    setShowOriginal(false);
                  }}
                  type="button"
                >
                  <svg
                    className="icon-md"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="rabbit-content">
              {/* Title Section */}
              <div className="rabbit-title-section">
                <h2 className="rabbit-article-title">
                  {showOriginal || !selectedArticle.title_ru
                    ? selectedArticle.title_en
                    : selectedArticle.title_ru}
                </h2>
                {selectedArticle.title_ru && !showOriginal && (
                  <p className="rabbit-original-title">
                    {selectedArticle.title_en}
                  </p>
                )}
              </div>

              {/* Metadata Card */}
              <div className="rabbit-meta-card">
                {/* Authors */}
                {selectedArticle.authors &&
                  selectedArticle.authors.length > 0 && (
                    <div className="rabbit-meta-row">
                      <svg
                        className="icon-sm"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <div className="rabbit-meta-content">
                        <span className="rabbit-meta-label">Авторы</span>
                        <span className="rabbit-meta-value">
                          {selectedArticle.authors.join(", ")}
                        </span>
                      </div>
                    </div>
                  )}

                {/* Year */}
                {selectedArticle.year && (
                  <div className="rabbit-meta-row">
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div className="rabbit-meta-content">
                      <span className="rabbit-meta-label">Год</span>
                      <span className="rabbit-meta-value">
                        {selectedArticle.year}
                      </span>
                    </div>
                  </div>
                )}

                {/* Journal */}
                {selectedArticle.journal && (
                  <div className="rabbit-meta-row">
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <div className="rabbit-meta-content">
                      <span className="rabbit-meta-label">Журнал</span>
                      <span className="rabbit-meta-value">
                        {selectedArticle.journal}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags / Badges */}
              <div className="rabbit-tags">
                {selectedArticle.publication_types?.map((pt) => (
                  <span key={pt} className="rabbit-tag pub-type">
                    {pt}
                  </span>
                ))}
                {selectedArticle.has_stats && (
                  <span className="rabbit-tag stats">
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Статистика
                  </span>
                )}
                {(selectedArticle.stats_quality ?? 0) > 0 && (
                  <span
                    className={`rabbit-tag stats-q${selectedArticle.stats_quality}`}
                  >
                    p&lt;
                    {selectedArticle.stats_quality === 3
                      ? "0.001"
                      : selectedArticle.stats_quality === 2
                        ? "0.01"
                        : "0.05"}
                  </span>
                )}
                {selectedArticle.title_ru && (
                  <span className="rabbit-tag translated">
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    Переведено
                  </span>
                )}
              </div>

              {/* Links Section */}
              <div className="rabbit-links">
                {selectedArticle.pmid && (
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rabbit-link-btn pubmed"
                  >
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    PubMed
                  </a>
                )}
                {selectedArticle.doi && (
                  <a
                    href={`https://doi.org/${selectedArticle.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rabbit-link-btn doi"
                  >
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    DOI
                  </a>
                )}
                <button
                  className="rabbit-link-btn pdf"
                  onClick={async () => {
                    try {
                      const source = await apiGetPdfSource(
                        projectId,
                        selectedArticle.id,
                      );
                      if (source.directDownload) {
                        window.open(source.url, "_blank");
                      } else {
                        window.open(
                          getPdfDownloadUrl(projectId, selectedArticle.id),
                          "_blank",
                        );
                      }
                    } catch (err: any) {
                      alert(
                        err.message ||
                          "PDF не найден. Попробуйте поискать на сайте журнала.",
                      );
                    }
                  }}
                  type="button"
                >
                  <svg
                    className="icon-sm"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  PDF
                </button>
                {!selectedArticle.title_ru && canEdit && (
                  <button
                    className="rabbit-link-btn translate"
                    onClick={() => handleTranslateOne(selectedArticle.id)}
                    disabled={translatingOne}
                    type="button"
                  >
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    {translatingOne ? "Переводим..." : "Перевести"}
                  </button>
                )}
                {canEdit && (
                  <button
                    className="rabbit-link-btn rabbit-link-btn--document"
                    onClick={openConvertModal}
                    type="button"
                    title="Добавить как документ проекта"
                  >
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Документ
                  </button>
                )}
              </div>

              {/* Abstract Section */}
              <div className="rabbit-abstract-section">
                <div className="rabbit-section-header">
                  <div className="rabbit-section-title">
                    <svg
                      className="icon-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7"
                      />
                    </svg>
                    Абстракт
                  </div>
                  {selectedArticle.has_stats && (
                    <label className="rabbit-highlight-toggle">
                      <input
                        type="checkbox"
                        checked={highlightStats}
                        onChange={(e) => setHighlightStats(e.target.checked)}
                      />
                      <svg
                        className="icon-sm"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                        />
                      </svg>
                      <span>Подсветка</span>
                    </label>
                  )}
                </div>
                <div className="rabbit-abstract-content">
                  {highlightStatistics(
                    showOriginal || !selectedArticle.abstract_ru
                      ? selectedArticle.abstract_en || "Нет абстракта"
                      : selectedArticle.abstract_ru,
                    selectedArticle.stats_json,
                  )}
                </div>

                {selectedArticle.abstract_ru &&
                  !showOriginal &&
                  selectedArticle.abstract_en && (
                    <details className="rabbit-original-abstract">
                      <summary>
                        <svg
                          className="icon-sm"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        Показать оригинал
                      </summary>
                      <div className="rabbit-abstract-original-text">
                        {selectedArticle.abstract_en}
                      </div>
                    </details>
                  )}
              </div>

              {/* IDs Section */}
              <div className="rabbit-ids-section">
                {selectedArticle.pmid && (
                  <div className="rabbit-id-row">
                    <span className="rabbit-id-label">PMID</span>
                    <span className="rabbit-id-value">
                      {selectedArticle.pmid}
                    </span>
                  </div>
                )}
                {selectedArticle.doi && (
                  <div className="rabbit-id-row">
                    <span className="rabbit-id-label">DOI</span>
                    <span className="rabbit-id-value">
                      {selectedArticle.doi}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Convert article to document */}
      {showConvertModal && selectedArticle && (
        <div
          className="rabbit-overlay"
          onClick={() => setShowConvertModal(false)}
        >
          <div
            className="rabbit-sidebar article-convert-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="article-convert-header">
              <svg
                className="icon-lg article-convert-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="article-convert-title">Добавить как документ</h3>
            </div>

            <p className="article-convert-description">
              Статья будет добавлена как новый редактируемый документ проекта.
            </p>

            <label className="stack article-convert-title-field">
              <span>Название документа</span>
              <input
                type="text"
                value={convertDocTitle}
                onChange={(e) => setConvertDocTitle(e.target.value)}
                placeholder="Введите название документа"
              />
            </label>

            {/* Опция импорта библиографии */}
            {selectedArticle.extracted_bibliography && (
              <label className="row gap article-convert-bib-option">
                <input
                  type="checkbox"
                  checked={convertIncludeBibliography}
                  onChange={(e) =>
                    setConvertIncludeBibliography(e.target.checked)
                  }
                  className="article-convert-bib-checkbox"
                />
                <span className="article-convert-bib-label">
                  <svg
                    className="icon-sm"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  Импортировать библиографию из статьи
                </span>
              </label>
            )}

            <div className="muted article-convert-summary">
              <strong>Будет создано:</strong>
              <ul className="article-convert-summary-list">
                <li>Документ с метаданными статьи</li>
                <li>Заготовка для основного текста</li>
                {convertIncludeBibliography && (
                  <li>Цитирования из библиографии статьи</li>
                )}
              </ul>
            </div>

            <div className="row gap">
              <button
                onClick={handleConvertToDocument}
                disabled={convertingToDoc || !convertDocTitle.trim()}
                type="button"
                className="btn article-convert-action-btn"
              >
                {convertingToDoc ? (
                  <>Создаём...</>
                ) : (
                  <>
                    <svg
                      className="icon-sm article-convert-btn-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    Создать документ
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConvertModal(false)}
                type="button"
                className="btn secondary article-convert-action-btn"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm search all articles */}
      {showAllArticlesConfirm && (
        <div
          className="rabbit-overlay"
          onClick={() => setShowAllArticlesConfirm(false)}
        >
          <div
            className="rabbit-sidebar article-search-all-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="article-search-all-header">
              <svg
                className="icon-lg article-search-all-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="article-search-all-title">Загрузка всех статей</h3>
            </div>

            <p className="article-search-all-description">
              По запросу <strong>"{searchQuery}"</strong> найдено примерно{" "}
              <strong>{allArticlesCount?.toLocaleString("ru-RU")}</strong>{" "}
              статей.
            </p>

            <p className="article-search-all-warning">
              Загрузка большого количества статей может занять значительное
              время. Вы уверены, что хотите загрузить все?
            </p>

            <div className="row gap">
              <button
                onClick={handleConfirmSearchAll}
                disabled={searching}
                type="button"
                className="btn article-search-all-action-btn"
              >
                {searching ? (
                  <>Загрузка...</>
                ) : (
                  <>
                    <svg
                      className="icon-sm article-search-all-btn-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Загрузить все
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAllArticlesConfirm(false);
                  setAllArticlesCount(null);
                }}
                type="button"
                className="btn secondary article-search-all-action-btn"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления статьи по DOI */}
      {showAddByDoiModal && (
        <AddArticleByDoiModal
          projectId={projectId}
          onClose={() => setShowAddByDoiModal(false)}
          onSuccess={() => {
            loadArticles();
            setOk("Статья успешно добавлена!");
          }}
        />
      )}

      {/* AI Assistant Sidebar */}
      <ArticleAISidebar
        isOpen={showAISidebar}
        onToggle={() => setShowAISidebar(!showAISidebar)}
        onClose={() => setShowAISidebar(false)}
        projectId={projectId}
        projectName={projectInfo.name || undefined}
        viewStatus={viewStatus}
        candidateCount={counts.candidate}
        onAddToSelected={async (articleIds) => {
          try {
            await apiBulkUpdateStatus(projectId, articleIds, "selected");
            toast.success(
              `${articleIds.length} ${articleIds.length === 1 ? "статья добавлена" : "статей добавлено"} в отобранные`,
            );
            loadArticles();
          } catch (err: any) {
            toast.error(err.message || "Ошибка при изменении статуса");
          }
        }}
        onHighlightArticle={(articleId) => {
          // Scroll to the article in the list
          const el = document.getElementById(`article-${articleId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("article-highlight-flash");
            setTimeout(
              () => el.classList.remove("article-highlight-flash"),
              2000,
            );
          }
        }}
      />
    </div>
  );
}
