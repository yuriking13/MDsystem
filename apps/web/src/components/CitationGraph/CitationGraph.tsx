import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  apiGetCitationGraph,
  apiFetchReferences,
  apiFetchReferencesStatus,
  apiCancelFetchReferences,
  apiImportFromGraph,
  apiGetArticleByPmid,
  apiTranslateText,
  apiGraphAIAssistant,
  apiExportCitationGraph,
  apiGetGraphRecommendations,
  apiSemanticSearch,
  apiGenerateEmbeddings,
  apiGetEmbeddingJob,
  apiCancelEmbeddingJob,
  apiGetEmbeddingStats,
  apiGetMissingArticlesStats,
  apiGetSemanticNeighbors,
  apiAnalyzeMethodologies,
  apiGetSemanticClusters,
  apiCreateSemanticClusters,
  apiDeleteSemanticClusters,
  apiGapAnalysis,
  apiSmartSemanticSearch,
  apiGetArticleSemanticNeighbors,
  type GraphNode,
  type GraphLink,
  type GraphFilterOptions,
  type LevelCounts,
  type ClusterInfo,
  type EmbeddingJobResponse,
  type SearchSuggestion,
  type FoundArticle,
  type GraphArticleForAI,
  type GraphFiltersForAI,
  type ClusterInfoForAI,
  type GapInfoForAI,
  type GraphRecommendation,
  type SemanticSearchResult,
  type EmbeddingStatsResponse,
  type MissingArticlesStatsResponse,
  type MethodologyCluster,
  type SemanticNeighborsResponse,
  type SemanticCluster,
  type GapAnalysisItem,
  type SmartSemanticSearchResult,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  IconInfoCircle,
  IconLinkChain,
  IconGraph,
  IconSparkles,
  IconRefresh,
  IconPlay,
  IconStop,
  IconAdjustments,
  IconFilter,
  IconSearch,
  IconCheckBadge,
  IconQuestionMark,
  IconExternalLink,
  IconPlus,
  IconTranslate,
  IconChartBar,
  IconClose,
  IconDownload,
  IconCheck,
  IconArrowRight,
  IconCircleStack,
  IconEye,
  IconUsers,
  IconLink,
  IconExclamation,
  IconArrowsExpand,
  IconChevronRight,
  IconSend,
  IconCalendar,
  IconTag,
  IconDocumentText,
  IconTrendingUp,
  IconStar,
  IconCheckCircle,
} from "../FlowbiteIcons";
import NodeInfoPanel from "./NodeInfoPanel";
import GraphLegend from "./GraphLegend";
// GraphSidebar removed - controls are in the header
import { formatTime, adjustBrightness, useDebounce } from "./utils";
import type { GraphNodeWithCoords, ClusterArticleDetail } from "../../types";

type Props = {
  projectId: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type FilterType = "all" | "selected" | "excluded";
type DepthType = 1 | 2 | 3;

// Тип для статуса загрузки
type FetchJobStatus = {
  isRunning: boolean;
  progress: number;
  elapsedSeconds: number;
  status?: string;
  totalArticles?: number;
  processedArticles?: number;
  message?: string;
  currentPhase?: string;
  phaseProgress?: string;
  secondsSinceProgress?: number | null;
  isStalled?: boolean;
  cancelReason?: string;
};

export default function CitationGraph({ projectId }: Props) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalNodes: number;
    totalLinks: number;
    levelCounts?: LevelCounts;
    availableReferences?: number;
    availableCiting?: number;
  }>({ totalNodes: 0, totalLinks: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNodeForDisplay, setSelectedNodeForDisplay] =
    useState<GraphNode | null>(null);
  const [fetchingRefs, setFetchingRefs] = useState(false);
  const [refsMessage, setRefsMessage] = useState<string | null>(null);

  // Статус фоновой загрузки
  const [fetchJobStatus, setFetchJobStatus] = useState<FetchJobStatus | null>(
    null,
  );
  const fetchStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Опция загрузки связей только для отобранных
  const [fetchSelectedOnly, setFetchSelectedOnly] = useState(false);

  // Фильтры
  const [filter, setFilter] = useState<FilterType>("all");
  const [availableQueries, setAvailableQueries] = useState<string[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);

  // Режим графа: всегда lite (облегчённый с лимитами)
  // mega режим отключён для стабильности

  // Новые фильтры
  const [depth, setDepth] = useState<DepthType>(1);
  const [yearRange, setYearRange] = useState<{
    min: number | null;
    max: number | null;
  }>({ min: null, max: null });
  // Разделяем значения инпутов и примененные фильтры чтобы не обновлять при каждом символе
  const [yearFromInput, setYearFromInput] = useState<string>("");
  const [yearToInput, setYearToInput] = useState<string>("");
  const [yearFrom, setYearFrom] = useState<number | undefined>(undefined);
  const [yearTo, setYearTo] = useState<number | undefined>(undefined);
  const [statsQuality, setStatsQuality] = useState<number>(0);

  // Подсветка статей с P-value (золотым цветом)
  const [highlightPValue, setHighlightPValue] = useState(false);

  // Фильтр по источнику статей (PubMed, DOAJ, Wiley)
  const [selectedSources, setSelectedSources] = useState<
    ("pubmed" | "doaj" | "wiley")[]
  >([]);

  // Модальное окно "Как это работает"
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Новые настройки графа
  const [sortBy, setSortBy] = useState<
    "citations" | "frequency" | "year" | "default"
  >("citations");
  const [maxNodes, setMaxNodes] = useState<number>(2000);
  const [maxLinksPerNode, setMaxLinksPerNode] = useState<number>(20);
  const [unlimitedNodes, setUnlimitedNodes] = useState(false);
  const [unlimitedLinks, setUnlimitedLinks] = useState(false);
  const [enableClustering, setEnableClustering] = useState(false);
  const [clusterBy, setClusterBy] = useState<"year" | "journal" | "auto">(
    "auto",
  );

  // Информация о лимитах и возможности загрузить больше
  const [currentLimits, setCurrentLimits] = useState<{
    maxLinksPerNode: number;
    maxExtraNodes: number;
  } | null>(null);
  const [canLoadMore, setCanLoadMore] = useState(false);

  // Показать расширенные настройки
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Debounce для параметров которые меняются часто (слайдеры)
  const debouncedMaxNodes = useDebounce(maxNodes, 500);
  const debouncedMaxLinksPerNode = useDebounce(maxLinksPerNode, 500);

  // Статьи с P-value для массового добавления
  const [addingPValueArticles, setAddingPValueArticles] = useState(false);
  const [pValueArticlesCount, setPValueArticlesCount] = useState(0);

  // === НОВЫЕ НАСТРОЙКИ ВИЗУАЛИЗАЦИИ ===
  // Заморозка анимации (экономия ресурсов)
  const [animationPaused, setAnimationPaused] = useState(false);
  // Полноэкранный режим
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Sidebar removed - all controls moved to header
  // Стиль узлов: 'default' | 'gradient' | 'glow'
  const [nodeStyle, setNodeStyle] = useState<"default" | "gradient" | "glow">(
    "gradient",
  );
  // Показывать метки узлов при масштабе
  const [showLabelsOnZoom, setShowLabelsOnZoom] = useState(true);
  // Толщина связей
  const [linkThickness, setLinkThickness] = useState<
    "thin" | "medium" | "thick"
  >("medium");

  // AI Ассистент
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SearchSuggestion[]>([]);
  const [aiPmidsToAdd, setAiPmidsToAdd] = useState<string[]>([]);
  const [aiDoisToAdd, setAiDoisToAdd] = useState<string[]>([]);
  const [aiAddingArticles, setAiAddingArticles] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  // Новые состояния для найденных статей из графа
  const [aiFoundArticleIds, setAiFoundArticleIds] = useState<Set<string>>(
    new Set(),
  );
  const [aiFoundArticles, setAiFoundArticles] = useState<FoundArticle[]>([]);

  // Рекомендации
  const [recommendations, setRecommendations] = useState<GraphRecommendation[]>(
    [],
  );
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  // Выбранные статьи для индивидуального добавления
  const [aiSelectedForAdd, setAiSelectedForAdd] = useState<Set<string>>(
    new Set(),
  );

  // === СЕМАНТИЧЕСКИЙ ПОИСК ===
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<
    SemanticSearchResult[]
  >([]);
  const [semanticSearching, setSemanticSearching] = useState(false);
  const [semanticThreshold, setSemanticThreshold] = useState(0.7);
  const [embeddingStats, setEmbeddingStats] =
    useState<EmbeddingStatsResponse | null>(null);
  const [missingArticlesStats, setMissingArticlesStats] =
    useState<MissingArticlesStatsResponse | null>(null);
  const [importMissingArticles, setImportMissingArticles] = useState(false);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const [embeddingMessage, setEmbeddingMessage] = useState<string | null>(null);
  const [embeddingJob, setEmbeddingJob] = useState<EmbeddingJobResponse | null>(
    null,
  );

  // === СЕМАНТИЧЕСКОЕ ЯДРО (визуализация связей) ===
  const [showSemanticEdges, setShowSemanticEdges] = useState(false);
  const [semanticEdges, setSemanticEdges] = useState<
    Array<{ source: string; target: string; similarity: number }>
  >([]);
  const [semanticEdgeThreshold, setSemanticEdgeThreshold] = useState(0.8);
  const [loadingSemanticEdges, setLoadingSemanticEdges] = useState(false);

  // === СЕМАНТИЧЕСКИЕ КЛАСТЕРЫ ===
  const [semanticClusters, setSemanticClusters] = useState<SemanticCluster[]>(
    [],
  );
  const [loadingSemanticClusters, setLoadingSemanticClusters] = useState(false);
  const [creatingSemanticClusters, setCreatingSemanticClusters] =
    useState(false);
  const [selectedSemanticCluster, setSelectedSemanticCluster] = useState<
    string | null
  >(null);
  const [showSemanticClustersPanel, setShowSemanticClustersPanel] =
    useState(false);
  const [semanticClusterSettings, setSemanticClusterSettings] = useState({
    numClusters: 5,
    minClusterSize: 3,
    similarityThreshold: 0.6,
    generateNames: true,
  });
  // Детали кластера (модальное окно)
  const [clusterDetailModal, setClusterDetailModal] = useState<{
    cluster: SemanticCluster;
    articles: Array<{
      id: string;
      title: string;
      year: number | null;
      authors: string | null;
      status?: string;
    }>;
  } | null>(null);
  const [loadingClusterDetails, setLoadingClusterDetails] = useState(false);
  // Выбранные статьи в кластере для массовых действий
  const [selectedClusterArticles, setSelectedClusterArticles] = useState<
    Set<string>
  >(new Set());
  // Состояние добавления статей из кластера
  const [addingFromCluster, setAddingFromCluster] = useState(false);

  // === GAP ANALYSIS ===
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);
  const [gapAnalysisResults, setGapAnalysisResults] = useState<
    GapAnalysisItem[]
  >([]);
  const [loadingGapAnalysis, setLoadingGapAnalysis] = useState(false);
  const [gapYearFrom, setGapYearFrom] = useState<number | undefined>(undefined);
  const [gapYearTo, setGapYearTo] = useState<number | undefined>(undefined);
  const [gapLimit, setGapLimit] = useState<number>(50);

  // === КЛАСТЕРИЗАЦИЯ МЕТОДОЛОГИЙ ===
  const [showMethodologyClusters, setShowMethodologyClusters] = useState(false);
  const [methodologyClusters, setMethodologyClusters] = useState<
    MethodologyCluster[]
  >([]);
  const [analyzingMethodologies, setAnalyzingMethodologies] = useState(false);
  const [methodologyFilter, setMethodologyFilter] = useState<string | null>(
    null,
  );

  // Глобальный язык для всех узлов графа
  const [globalLang, setGlobalLang] = useState<"en" | "ru">("en");

  // Состояние для отслеживания текущей темы (для перерисовки графа при смене)
  const [isLightTheme, setIsLightTheme] = useState(() =>
    document.body.classList.contains("light-theme"),
  );

  // Отслеживаем изменения темы через интервал (более стабильно чем MutationObserver)
  useEffect(() => {
    const checkTheme = () => {
      const newIsLight = document.body.classList.contains("light-theme");
      if (newIsLight !== isLightTheme) {
        setIsLightTheme(newIsLight);
      }
    };
    const interval = setInterval(checkTheme, 200);
    return () => clearInterval(interval);
  }, [isLightTheme]);

  // Предвычисленные цвета для текущей темы (включая цвета узлов)
  const graphColors = useMemo(() => {
    // Пастельные цвета для светлой темы (новая палитра)
    const pastelColors = {
      citing: "#FC9DBF", // розовый
      selected: "#C6DDCD", // мятный
      excluded: "#FABAAE", // коралловый
      candidatePubmed: "#ACDBEB", // голубой
      candidateDoaj: "#FFEDC7", // кремовый
      candidateWiley: "#E2D3E8", // лавандовый
      reference: "#F9D7B2", // персиковый
      related: "#C7DBDA", // серо-мятный
      aiFound: "#D086C5", // фиолетово-розовый
      pvalue: "#FBD6E6", // светло-розовый
      default: "#E2D3E8", // лавандовый (нейтральный)
    };

    // Яркие цвета для тёмной темы
    const vibrantColors = {
      citing: "#ec4899", // pink
      selected: "#22c55e", // bright green
      excluded: "#ef4444", // red
      candidatePubmed: "#3b82f6", // blue
      candidateDoaj: "#eab308", // yellow
      candidateWiley: "#8b5cf6", // violet
      reference: "#f97316", // orange
      related: "#06b6d4", // cyan
      aiFound: "#00ffff", // bright cyan
      pvalue: "#fbbf24", // golden
      default: "#6b7280", // gray
    };

    const nodeColors = isLightTheme ? pastelColors : vibrantColors;

    return {
      bg: isLightTheme ? "#f8fafc" : "#0b0f19",
      bgFullscreen: isLightTheme ? "#f1f5f9" : "#050810",
      linkColor: isLightTheme
        ? "rgba(148, 163, 184, 0.4)"
        : "rgba(100, 130, 180, 0.25)",
      strokeColor: isLightTheme
        ? "rgba(100, 116, 139, 0.2)"
        : "rgba(255, 255, 255, 0.15)",
      clusterStrokeColor: isLightTheme
        ? "rgba(100, 116, 139, 0.35)"
        : "rgba(255, 255, 255, 0.3)",
      textColor: isLightTheme
        ? "rgba(30, 41, 59, 0.8)"
        : "rgba(255, 255, 255, 0.7)",
      shadowAlpha: isLightTheme ? "40" : "60",
      // Цвета узлов
      ...nodeColors,
    };
  }, [isLightTheme]);

  const containerRef = useRef<HTMLDivElement>(null);
  // ForceGraph2D ref - тип any необходим из-за отсутствия типов в библиотеке
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // === ФИЛЬТРАЦИЯ ДАННЫХ ГРАФА ПО МЕТОДОЛОГИИ ===
  const filteredGraphData = useMemo(() => {
    if (!data) return null;
    if (!methodologyFilter || methodologyClusters.length === 0) return data;

    // Найти выбранный кластер
    const selectedCluster = methodologyClusters.find(
      (c) => c.type === methodologyFilter,
    );
    if (!selectedCluster || !selectedCluster.articleIds) return data;

    // Фильтруем узлы по ID статей из кластера
    const articleIdSet = new Set(selectedCluster.articleIds);
    const filteredNodes = data.nodes.filter((node) =>
      articleIdSet.has(node.id),
    );
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    // Фильтруем связи - только между отфильтрованными узлами
    const filteredLinks = data.links.filter(
      (link) =>
        filteredNodeIds.has(link.source as string) &&
        filteredNodeIds.has(link.target as string),
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [data, methodologyFilter, methodologyClusters]);

  // Фильтрация по семантическому кластеру
  const semanticFilteredGraphData = useMemo(() => {
    const baseData = filteredGraphData;
    if (!baseData) return null;
    if (!selectedSemanticCluster || semanticClusters.length === 0)
      return baseData;

    const selectedCluster = semanticClusters.find(
      (c) => c.id === selectedSemanticCluster,
    );
    if (!selectedCluster || !selectedCluster.articleIds) return baseData;

    const articleIdSet = new Set(selectedCluster.articleIds);
    const filteredNodes = baseData.nodes.filter((node) =>
      articleIdSet.has(node.id),
    );
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredLinks = baseData.links.filter(
      (link) =>
        filteredNodeIds.has(link.source as string) &&
        filteredNodeIds.has(link.target as string),
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [filteredGraphData, selectedSemanticCluster, semanticClusters]);

  // Граф с добавленными семантическими связями
  const graphDataWithSemanticEdges = useMemo(() => {
    const baseData = semanticFilteredGraphData;
    if (!baseData) return null;
    if (!showSemanticEdges || semanticEdges.length === 0) return baseData;

    // Создаём Set существующих связей для проверки дубликатов
    const existingLinks = new Set(
      baseData.links.map((l) => `${l.source}-${l.target}`),
    );
    const nodeIds = new Set(baseData.nodes.map((n) => n.id));

    // Добавляем семантические связи (только между существующими узлами)
    const semanticLinks = semanticEdges
      .filter(
        (edge) =>
          nodeIds.has(edge.source) &&
          nodeIds.has(edge.target) &&
          !existingLinks.has(`${edge.source}-${edge.target}`) &&
          !existingLinks.has(`${edge.target}-${edge.source}`),
      )
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        isSemantic: true,
        similarity: edge.similarity,
      }));

    return {
      nodes: baseData.nodes,
      links: [...baseData.links, ...semanticLinks],
    };
  }, [semanticFilteredGraphData, showSemanticEdges, semanticEdges]);

  // === ФУНКЦИИ УПРАВЛЕНИЯ ГРАФОМ ===

  // Заморозка/разморозка анимации
  const toggleAnimation = useCallback(() => {
    if (graphRef.current) {
      if (animationPaused) {
        graphRef.current.resumeAnimation?.();
        graphRef.current.d3ReheatSimulation?.();
      } else {
        graphRef.current.pauseAnimation?.();
      }
    }
    setAnimationPaused(!animationPaused);
  }, [animationPaused]);

  // Полноэкранный режим
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Слушаем события fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Экспорт графа
  const handleExport = async (
    format: "json" | "graphml" | "cytoscape" | "gexf",
  ) => {
    try {
      const blob = await apiExportCitationGraph(projectId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `citation-graph-${projectId}.${format === "cytoscape" ? "cytoscape.json" : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert(`Ошибка экспорта: ${getErrorMessage(err)}`);
    }
  };

  // Загрузка рекомендаций
  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const result = await apiGetGraphRecommendations(projectId);
      setRecommendations(result.recommendations);
      setShowRecommendations(true);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      alert(`Ошибка загрузки рекомендаций: ${getErrorMessage(err)}`);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // === СЕМАНТИЧЕСКИЙ ПОИСК ===

  // Загрузка статистики embeddings
  const loadEmbeddingStats = async () => {
    try {
      const stats = await apiGetEmbeddingStats(projectId);
      setEmbeddingStats(stats);
    } catch (err) {
      console.error("Failed to load embedding stats:", err);
    }
  };

  // Загрузка статистики недостающих статей
  const loadMissingArticlesStats = async () => {
    try {
      const stats = await apiGetMissingArticlesStats(projectId);
      setMissingArticlesStats(stats);
    } catch (err) {
      console.error("Failed to load missing articles stats:", err);
    }
  };

  // Генерация embeddings для статей - асинхронная обработка
  const handleGenerateEmbeddings = async () => {
    setGeneratingEmbeddings(true);
    setEmbeddingMessage(null);

    try {
      const result = await apiGenerateEmbeddings(projectId, {
        importMissingArticles,
      });

      if (result.status === "completed" && result.total === 0) {
        setEmbeddingMessage("✓ Все статьи уже имеют embeddings!");
        setGeneratingEmbeddings(false);
        return;
      }

      setEmbeddingJob(result);
      setEmbeddingMessage(
        importMissingArticles
          ? `Импорт недостающих статей и генерация embeddings для ${result.total} статей...`
          : `Запущена генерация embeddings для ${result.total} статей...`,
      );

      // Если job уже был, показываем прогресс
      if (result.jobId && result.status !== "completed") {
        pollEmbeddingJob(result.jobId);
      }
    } catch (err) {
      console.error("Failed to start embeddings generation:", err);
      setEmbeddingMessage(`Ошибка: ${getErrorMessage(err)}`);
      setGeneratingEmbeddings(false);
    }
  };

  // Polling для статуса job
  const pollEmbeddingJob = async (jobId: string) => {
    try {
      const job = await apiGetEmbeddingJob(projectId, jobId);
      setEmbeddingJob(job);

      const percent =
        job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

      if (job.status === "running" || job.status === "pending") {
        // Проверяем, идёт ли фаза импорта (по errorMessage)
        if (job.errorMessage?.startsWith("[Import]")) {
          // Парсим информацию об импорте: "[Import] PubMed: imported=50, skipped=2, errors=0"
          const match = job.errorMessage.match(/imported=(\d+)/);
          const imported = match ? parseInt(match[1], 10) : 0;
          setEmbeddingMessage(
            `Импорт цитирующих статей: ${imported} импортировано...`,
          );
        } else if (job.total === 0 && job.processed === 0) {
          setEmbeddingMessage("Подготовка к обработке...");
        } else {
          setEmbeddingMessage(
            `Генерация embeddings: ${job.processed}/${job.total} (${percent}%)...`,
          );
        }
        // Продолжаем polling каждые 2 секунды
        setTimeout(() => pollEmbeddingJob(jobId), 2000);
      } else if (job.status === "completed") {
        setEmbeddingMessage(
          `✓ Готово! Обработано ${job.processed} статей${job.errors > 0 ? `, ошибок: ${job.errors}` : ""}`,
        );
        setGeneratingEmbeddings(false);
        setImportMissingArticles(false); // Сбрасываем чекбокс
        await loadEmbeddingStats();
        await loadMissingArticlesStats();
      } else if (job.status === "failed" || job.status === "timeout") {
        setEmbeddingMessage(
          `Ошибка: ${job.errorMessage || "Неизвестная ошибка"}. Обработано: ${job.processed}`,
        );
        setGeneratingEmbeddings(false);
        await loadEmbeddingStats();
        await loadMissingArticlesStats();
      } else if (job.status === "cancelled") {
        setEmbeddingMessage(
          `Отменено. Обработано: ${job.processed} из ${job.total}`,
        );
        setGeneratingEmbeddings(false);
        await loadEmbeddingStats();
        await loadMissingArticlesStats();
      }
    } catch (err) {
      console.error("Failed to poll embedding job:", err);
      setEmbeddingMessage(`Ошибка получения статуса: ${getErrorMessage(err)}`);
      setGeneratingEmbeddings(false);
    }
  };

  // Отмена генерации embeddings
  const handleCancelEmbeddings = async () => {
    if (!embeddingJob?.jobId) return;

    try {
      await apiCancelEmbeddingJob(projectId, embeddingJob.jobId);
      setEmbeddingMessage("Отмена...");
    } catch (err) {
      console.error("Failed to cancel embedding job:", err);
      setEmbeddingMessage(`Ошибка отмены: ${getErrorMessage(err)}`);
    }
  };

  // Семантический поиск
  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;

    setSemanticSearching(true);
    try {
      const result = await apiSemanticSearch(
        projectId,
        semanticQuery,
        20,
        semanticThreshold,
      );
      setSemanticResults(result.results);
    } catch (err) {
      console.error("Semantic search failed:", err);
      alert(`Ошибка поиска: ${getErrorMessage(err)}`);
    } finally {
      setSemanticSearching(false);
    }
  };

  // Загрузка семантических связей для визуализации ядра
  const loadSemanticEdges = async () => {
    setLoadingSemanticEdges(true);
    try {
      const result = await apiGetSemanticNeighbors(
        projectId,
        semanticEdgeThreshold,
      );
      setSemanticEdges(result.edges);
    } catch (err) {
      console.error("Failed to load semantic edges:", err);
      alert(`Ошибка загрузки семантических связей: ${getErrorMessage(err)}`);
    } finally {
      setLoadingSemanticEdges(false);
    }
  };

  // Подсветить статью на графе по результату семантического поиска
  const highlightSemanticResult = (articleId: string) => {
    if (!data) return;
    const node = data.nodes.find((n) => n.id === articleId) as GraphNode & {
      x?: number;
      y?: number;
    };
    if (
      node &&
      graphRef.current &&
      node.x !== undefined &&
      node.y !== undefined
    ) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(2, 1000);
      setSelectedNodeForDisplay(node);
    }
  };

  // === СЕМАНТИЧЕСКИЕ КЛАСТЕРЫ ===

  // Загрузка существующих кластеров
  const loadSemanticClusters = async () => {
    setLoadingSemanticClusters(true);
    try {
      const result = await apiGetSemanticClusters(projectId);
      setSemanticClusters(result.clusters);
    } catch (err) {
      console.error("Failed to load semantic clusters:", err);
    } finally {
      setLoadingSemanticClusters(false);
    }
  };

  // Создание семантических кластеров
  const handleCreateSemanticClusters = async () => {
    // Проверяем наличие embeddings
    if (!embeddingStats || embeddingStats.withEmbeddings < 10) {
      alert(
        `Недостаточно статей с embeddings для создания кластеров.\n\n` +
          `Для построения семантических кластеров необходимо:\n` +
          `1. Открыть панель "Сем." (семантический поиск)\n` +
          `2. Нажать кнопку "Создать embeddings"\n` +
          `3. Дождаться завершения генерации\n\n` +
          `Сейчас embeddings: ${embeddingStats?.withEmbeddings || 0} из ${embeddingStats?.totalArticles || 0} статей`,
      );
      return;
    }

    setCreatingSemanticClusters(true);
    try {
      const result = await apiCreateSemanticClusters(
        projectId,
        semanticClusterSettings,
      );
      setSemanticClusters(result.clusters);
      setShowSemanticClustersPanel(true);
    } catch (err) {
      console.error("Failed to create semantic clusters:", err);
      if (
        getErrorMessage(err)?.includes("Not enough articles with embeddings")
      ) {
        alert(
          `Недостаточно статей с embeddings.\n\n` +
            `Пожалуйста, сначала создайте embeddings:\n` +
            `1. Нажмите кнопку "Сем." для открытия панели семантического поиска\n` +
            `2. Нажмите "Создать embeddings" и дождитесь завершения`,
        );
      } else {
        alert(`Ошибка создания кластеров: ${getErrorMessage(err)}`);
      }
    } finally {
      setCreatingSemanticClusters(false);
    }
  };

  // Открыть детали кластера
  const openClusterDetails = async (cluster: SemanticCluster) => {
    setLoadingClusterDetails(true);
    setSelectedClusterArticles(new Set()); // Сбрасываем выбор при открытии
    try {
      // Получаем информацию о статьях кластера из данных графа
      const articles = cluster.articleIds
        .map((id) => {
          const node = data?.nodes.find((n) => n.id === id);
          if (node) {
            // Приоритет: title_ru > title > label (label обычно "Author (Year)")
            const title =
              node.title_ru || node.title || node.label || "Без названия";
            return {
              id: node.id,
              title: title,
              year: node.year || null,
              authors: node.authors || null,
              status: node.status || "candidate",
              pmid: node.pmid || null,
              doi: node.doi || null,
            };
          }
          return null;
        })
        .filter(Boolean) as Array<{
        id: string;
        title: string;
        year: number | null;
        authors: string | null;
        status: string;
        pmid: string | null;
        doi: string | null;
      }>;

      // Сортируем: центральная статья первая
      articles.sort((a, b) => {
        if (a.id === cluster.centralArticleId) return -1;
        if (b.id === cluster.centralArticleId) return 1;
        return 0;
      });

      setClusterDetailModal({ cluster, articles });
    } catch (err) {
      console.error("Failed to load cluster details:", err);
      alert(`Ошибка загрузки деталей кластера: ${getErrorMessage(err)}`);
    } finally {
      setLoadingClusterDetails(false);
    }
  };

  // Переключить выбор статьи в кластере
  const toggleClusterArticleSelection = (articleId: string) => {
    setSelectedClusterArticles((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  // Выбрать все статьи кластера
  const selectAllClusterArticles = () => {
    if (!clusterDetailModal) return;
    const allIds = clusterDetailModal.articles.map((a: any) => a.id);
    setSelectedClusterArticles(new Set(allIds));
  };

  // Снять выбор со всех статей
  const deselectAllClusterArticles = () => {
    setSelectedClusterArticles(new Set());
  };

  // Добавить выбранные статьи из кластера в отобранные/кандидаты
  const handleAddClusterArticles = async (status: "selected" | "candidate") => {
    if (!clusterDetailModal || selectedClusterArticles.size === 0) return;

    setAddingFromCluster(true);
    try {
      // Собираем PMIDs и DOIs из выбранных статей
      const selectedArticles = clusterDetailModal.articles.filter((a: any) =>
        selectedClusterArticles.has(a.id),
      );
      const pmids = selectedArticles
        .filter((a: any) => a.pmid)
        .map((a: any) => a.pmid);
      const dois = selectedArticles
        .filter((a: any) => !a.pmid && a.doi)
        .map((a: any) => a.doi);

      const res = await apiImportFromGraph(projectId, {
        pmids,
        dois,
        status,
      });

      const statusLabel = status === "selected" ? "Отобранные" : "Кандидаты";
      setImportMessage(
        `✅ Добавлено ${res.added || selectedClusterArticles.size} статей в ${statusLabel}`,
      );
      setTimeout(() => setImportMessage(null), 5000);

      // Сбрасываем выбор
      setSelectedClusterArticles(new Set());

      // Перезагружаем граф
      setTimeout(() => {
        loadGraph(getGraphOptions());
      }, 500);
    } catch (err) {
      console.error("Failed to add cluster articles:", err);
      alert(`Ошибка добавления статей: ${getErrorMessage(err)}`);
    } finally {
      setAddingFromCluster(false);
    }
  };

  // Удаление кластеров
  const handleDeleteSemanticClusters = async () => {
    if (!confirm("Удалить все семантические кластеры?")) return;
    try {
      await apiDeleteSemanticClusters(projectId);
      setSemanticClusters([]);
      setSelectedSemanticCluster(null);
    } catch (err) {
      console.error("Failed to delete semantic clusters:", err);
      alert(`Ошибка удаления кластеров: ${getErrorMessage(err)}`);
    }
  };

  // Фильтрация по семантическому кластеру
  const filterBySemanticCluster = (clusterId: string | null) => {
    setSelectedSemanticCluster(clusterId);
  };

  // Получить цвет узла по кластеру
  const getNodeClusterColor = useCallback(
    (nodeId: string): string | null => {
      for (const cluster of semanticClusters) {
        if (cluster.articleIds.includes(nodeId)) {
          return cluster.color;
        }
      }
      return null;
    },
    [semanticClusters],
  );

  // === GAP ANALYSIS ===

  const handleGapAnalysis = async () => {
    setLoadingGapAnalysis(true);
    try {
      const result = await apiGapAnalysis(
        projectId,
        0.7,
        gapLimit,
        gapYearFrom,
        gapYearTo,
      );
      setGapAnalysisResults(result.gaps);
      setShowGapAnalysis(true);
    } catch (err) {
      console.error("Gap analysis failed:", err);
      alert(`Ошибка анализа пробелов: ${getErrorMessage(err)}`);
    } finally {
      setLoadingGapAnalysis(false);
    }
  };

  // === КЛАСТЕРИЗАЦИЯ МЕТОДОЛОГИЙ ===

  const handleAnalyzeMethodologies = async () => {
    setAnalyzingMethodologies(true);
    try {
      const result = await apiAnalyzeMethodologies(projectId);
      setMethodologyClusters(result.clusters);
      setShowMethodologyClusters(true);
    } catch (err) {
      console.error("Failed to analyze methodologies:", err);
      alert(`Ошибка анализа: ${getErrorMessage(err)}`);
    } finally {
      setAnalyzingMethodologies(false);
    }
  };

  // Фильтровать граф по методологии
  const filterByMethodology = (clusterType: string | null) => {
    setMethodologyFilter(clusterType);
    // Подсветка узлов принадлежащих к кластеру будет в nodeCanvasObject
  };

  // Вспомогательная функция для создания опций графа с учетом режима "без ограничений"
  const getGraphOptions = useCallback((): GraphFilterOptions => {
    const options: GraphFilterOptions = {
      filter,
      depth,
      sortBy,
      maxTotalNodes: unlimitedNodes ? 999999 : debouncedMaxNodes,
      maxLinksPerNode: unlimitedLinks ? 999999 : debouncedMaxLinksPerNode,
      enableClustering,
      clusterBy,
    };
    if (selectedQueries.length > 0) {
      options.sourceQueries = selectedQueries;
    }
    if (yearFrom !== undefined) {
      options.yearFrom = yearFrom;
    }
    if (yearTo !== undefined) {
      options.yearTo = yearTo;
    }
    if (statsQuality > 0) {
      options.statsQuality = statsQuality;
    }
    if (selectedSources.length > 0) {
      options.sources = selectedSources;
    }
    return options;
  }, [
    filter,
    depth,
    sortBy,
    unlimitedNodes,
    unlimitedLinks,
    debouncedMaxNodes,
    debouncedMaxLinksPerNode,
    enableClustering,
    clusterBy,
    selectedQueries,
    yearFrom,
    yearTo,
    statsQuality,
    selectedSources,
  ]);

  const loadGraph = useCallback(
    async (options?: GraphFilterOptions) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetCitationGraph(projectId, options);
        setData({
          nodes: res.nodes,
          links: res.links,
        });
        setStats(res.stats);
        if (res.availableQueries) {
          setAvailableQueries(res.availableQueries);
        }
        if (res.yearRange) {
          setYearRange(res.yearRange);
        }
        // Обновляем информацию о лимитах
        if (res.limits) {
          setCurrentLimits(res.limits);
          // Проверяем, можно ли загрузить больше
          const totalAvailable =
            (res.stats.availableReferences || 0) +
            (res.stats.availableCiting || 0);
          const currentExtra = res.nodes.filter(
            (n) => n.graphLevel !== 1,
          ).length;
          setCanLoadMore(
            currentExtra < totalAvailable &&
              currentExtra >= res.limits.maxExtraNodes * 0.9,
          );
        }

        // Подсчитываем статьи с P-value (внешние, не в проекте)
        const externalWithPValue = res.nodes.filter(
          (n) =>
            n.graphLevel !== 1 && // Не в проекте
            (n.statsQuality || 0) > 0, // Есть P-value
        ).length;
        setPValueArticlesCount(externalWithPValue);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  // Перезагрузка при изменении фильтров (с debounce для слайдеров)
  useEffect(() => {
    loadGraph(getGraphOptions());
  }, [loadGraph, getGraphOptions]);

  // Проверка статуса загрузки при монтировании
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await apiFetchReferencesStatus(projectId);
        if (
          status.hasJob &&
          (status.status === "running" || status.status === "pending")
        ) {
          setFetchJobStatus({
            isRunning: true,
            progress: status.progress || 0,
            elapsedSeconds: status.elapsedSeconds || 0,
            status: status.status,
            totalArticles: status.totalArticles,
            processedArticles: status.processedArticles,
            currentPhase: status.currentPhase,
            phaseProgress: status.phaseProgress,
            secondsSinceProgress: status.secondsSinceProgress,
          });
          startStatusPolling();
        }
      } catch {
        // Игнорируем ошибки проверки статуса
      }
    };
    checkStatus();

    return () => {
      if (fetchStatusIntervalRef.current) {
        clearInterval(fetchStatusIntervalRef.current);
      }
    };
  }, [projectId]);

  const startStatusPolling = () => {
    if (fetchStatusIntervalRef.current) {
      clearInterval(fetchStatusIntervalRef.current);
    }

    fetchStatusIntervalRef.current = setInterval(async () => {
      try {
        const status = await apiFetchReferencesStatus(projectId);

        if (
          !status.hasJob ||
          status.status === "completed" ||
          status.status === "failed" ||
          status.status === "cancelled"
        ) {
          // Загрузка завершена или отменена
          if (fetchStatusIntervalRef.current) {
            clearInterval(fetchStatusIntervalRef.current);
            fetchStatusIntervalRef.current = null;
          }

          setFetchJobStatus(null);
          setFetchingRefs(false);

          if (status.status === "cancelled") {
            // Показываем сообщение об отмене с причиной
            const reasonText =
              status.cancelReason === "stalled"
                ? "⚠️ Загрузка отменена автоматически: нет прогресса более 60 сек. Сервер PubMed не отвечает. Попробуйте позже."
                : status.cancelReason === "timeout"
                  ? "⚠️ Загрузка отменена: превышено максимальное время (30 мин). Попробуйте загрузить меньше статей."
                  : "⚠️ Загрузка отменена. Вы можете запустить её снова.";
            setRefsMessage(reasonText);
            setTimeout(() => setRefsMessage(null), 10000);
          } else if (status.status === "completed") {
            setRefsMessage("✅ Загрузка связей завершена! Граф обновляется...");
            // Небольшая задержка перед обновлением графа, чтобы БД успела записать данные
            setTimeout(async () => {
              try {
                // Принудительно перезагружаем граф с текущими фильтрами
                await loadGraph(getGraphOptions());
                setRefsMessage("✅ Граф успешно обновлён!");
                // Автоматически скрываем уведомление через 5 секунд
                setTimeout(() => setRefsMessage(null), 5000);
              } catch (refreshErr) {
                console.error("Error refreshing graph:", refreshErr);
                setRefsMessage(
                  "✅ Загрузка связей завершена! Обновите страницу для просмотра графа.",
                );
                setTimeout(() => setRefsMessage(null), 7000);
              }
            }, 1000);
          } else if (status.status === "failed") {
            setRefsMessage(
              `❌ Ошибка: ${status.errorMessage || "Неизвестная ошибка"}`,
            );
            // Автоматически скрываем уведомление об ошибке через 10 секунд
            setTimeout(() => setRefsMessage(null), 10000);
          }
        } else {
          // Обновляем прогресс с новыми полями
          setFetchJobStatus({
            isRunning: true,
            progress: status.progress || 0,
            elapsedSeconds: status.elapsedSeconds || 0,
            status: status.status,
            totalArticles: status.totalArticles,
            processedArticles: status.processedArticles,
            currentPhase: status.currentPhase,
            phaseProgress: status.phaseProgress,
            secondsSinceProgress: status.secondsSinceProgress,
          });
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 2000); // Каждые 2 секунды
  };

  // Функция отмены загрузки
  const handleCancelFetch = async () => {
    try {
      await apiCancelFetchReferences(projectId);
      setFetchJobStatus(null);
      setFetchingRefs(false);
      setRefsMessage("⚠️ Загрузка отменена. Вы можете запустить её снова.");
      setTimeout(() => setRefsMessage(null), 5000);
    } catch (err) {
      console.error("Error cancelling fetch:", err);
    }
  };

  const handleFetchReferences = async () => {
    setFetchingRefs(true);
    setRefsMessage(null);

    // Сразу показываем прогресс-бар
    setFetchJobStatus({
      isRunning: true,
      progress: 0,
      elapsedSeconds: 0,
      totalArticles: 0,
      processedArticles: 0,
      message: "Запуск загрузки...",
    });

    try {
      // Передаём опцию selectedOnly если выбран чекбокс
      const res = await apiFetchReferences(
        projectId,
        fetchSelectedOnly ? { selectedOnly: true } : undefined,
      );

      if (res.jobId) {
        // Фоновая загрузка запущена - обновляем данные
        setFetchJobStatus({
          isRunning: true,
          progress: 0,
          elapsedSeconds: 0,
          totalArticles: res.totalArticles,
          processedArticles: 0,
          message: res.message,
        });
        // Показываем сообщение о статьях без PMID если есть (теперь они обрабатываются через Crossref)
        if (res.articlesWithoutPmid && res.articlesWithoutPmid > 0) {
          setRefsMessage(`crossref:${res.articlesWithoutPmid}`);
        }
        startStatusPolling();
      } else {
        setFetchJobStatus(null);
        setRefsMessage(res.message || "Загрузка не требуется");
        setTimeout(() => setRefsMessage(null), 5000);
        setFetchingRefs(false);
      }
    } catch (err) {
      setFetchJobStatus(null);
      setRefsMessage(getErrorMessage(err));
      setTimeout(() => setRefsMessage(null), 7000);
      setFetchingRefs(false);
    }
  };

  // Resize observer - dynamically calculate graph dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        // В fullscreen режиме используем window dimensions
        if (isFullscreen) {
          const aiPanelWidth = showAIAssistant ? 280 : 0;
          setDimensions({
            width: Math.max(window.innerWidth - aiPanelWidth, 400),
            height: Math.max(window.innerHeight - 150, 300),
          });
        } else {
          const rect = containerRef.current.getBoundingClientRect();
          // Subtract AI panel width (280px) when open, and headers height
          const aiPanelWidth = showAIAssistant ? 280 : 0;
          setDimensions({
            width: Math.max(rect.width - aiPanelWidth, 400),
            height: Math.max(rect.height - 150, 300),
          });
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    // Use ResizeObserver for more accurate container size tracking
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", updateSize);
      resizeObserver.disconnect();
    };
  }, [showAIAssistant, isFullscreen]);

  // Настройка сил графа после загрузки данных
  useEffect(() => {
    if (!graphRef.current || !data) return;

    // Увеличиваем силу отталкивания для разреженного графа
    const fg = graphRef.current;
    if (fg.d3Force) {
      // Настраиваем силу отталкивания (charge)
      const charge = fg.d3Force("charge");
      if (charge) {
        charge.strength(-400).distanceMax(600);
      }

      // Настраиваем расстояние связей
      const link = fg.d3Force("link");
      if (link) {
        link.distance(120);
      }

      // Ослабляем центральную силу
      const center = fg.d3Force("center");
      if (center) {
        // Можно настроить если нужно
      }

      // Перезапускаем симуляцию
      fg.d3ReheatSimulation();
    }
  }, [data]);

  const nodeColor = useCallback(
    (node: GraphNodeWithCoords) => {
      const status = node.status;
      const level = node.graphLevel ?? 1;
      const statsQ = node.statsQuality || 0;
      const source = node.source || "pubmed";

      // Используем предвычисленные цвета из graphColors (пастельные для светлой темы)
      const colors = graphColors;

      // Подсветка найденных AI статей
      if (aiFoundArticleIds.has(node.id)) {
        return colors.aiFound;
      }

      // Если включена подсветка P-value и статья имеет P-value
      if (highlightPValue && statsQ > 0) {
        return colors.pvalue;
      }

      // Уровень 0 (citing - статьи, которые цитируют наши)
      if (level === 0) {
        return colors.citing;
      }

      // Уровень 1 (найденные статьи) - стандартные цвета по статусу
      if (level === 1) {
        if (status === "selected") return colors.selected;
        if (status === "excluded") return colors.excluded;
        // Кандидаты - разные цвета по источнику
        if (source === "doaj") return colors.candidateDoaj;
        if (source === "wiley") return colors.candidateWiley;
        return colors.candidatePubmed;
      }

      // Уровень 2 (references - статьи, на которые ссылаются)
      if (level === 2) {
        return colors.reference;
      }

      // Уровень 3 (статьи, которые тоже ссылаются на level 2)
      if (level === 3) {
        return colors.related;
      }

      return colors.default;
    },
    [highlightPValue, aiFoundArticleIds, graphColors],
  );

  const nodeLabel = useCallback(
    (node: GraphNodeWithCoords) => {
      const citedByCount = node.citedByCount || 0;
      const level = node.graphLevel ?? 1;
      const statsQ = node.statsQuality || 0;

      let levelText = "";
      if (level === 0) levelText = " [Цитирует]";
      else if (level === 2) levelText = " [Ссылка]";
      else if (level === 3) levelText = " [Связанная]";

      let statsText = "";
      if (statsQ > 0) statsText = ` • P-value: ${"★".repeat(statsQ)}`;

      // Показываем название если есть (с учётом языка)
      const title =
        globalLang === "ru" && node.title_ru ? node.title_ru : node.title;
      // Для placeholder узлов без title показываем PMID/DOI
      let displayTitle = "";
      if (title) {
        displayTitle = `\n📄 ${title.substring(0, 120)}${title.length > 120 ? "..." : ""}`;
      } else if (node.pmid && node.id?.startsWith("pmid:")) {
        displayTitle = `\n🔗 PMID: ${node.pmid} (загрузите данные)`;
      } else if (node.doi) {
        displayTitle = `\n🔗 DOI: ${node.doi}`;
      }

      // Показываем авторов для внешних статей (level !== 1)
      let authorsText = "";
      if (level !== 1 && node.authors) {
        const authorsStr =
          typeof node.authors === "string"
            ? node.authors
            : Array.isArray(node.authors)
              ? node.authors.join(", ")
              : "";
        if (authorsStr) {
          authorsText = `\n👤 ${authorsStr.substring(0, 80)}${authorsStr.length > 80 ? "..." : ""}`;
        }
      }

      // Добавляем год и журнал если есть
      let metaInfo = "";
      if (node.year) {
        metaInfo += `\n📅 ${node.year}`;
        if (node.journal) {
          metaInfo += ` • ${node.journal.substring(0, 40)}${node.journal.length > 40 ? "..." : ""}`;
        }
      }

      return `${node.label}${levelText}${citedByCount > 0 ? ` (${citedByCount} цит.)` : ""}${statsText}${displayTitle}${authorsText}${metaInfo}`;
    },
    [globalLang],
  );

  // Размер узла зависит от количества цитирований - как в ResearchRabbit
  const nodeVal = useCallback(
    (node: GraphNodeWithCoords) => {
      const citedByCount = node.citedByCount || 0;
      const level = node.graphLevel ?? 1;
      const statsQ = node.statsQuality || 0;

      // Логарифмическая шкала - УВЕЛИЧЕННЫЕ размеры для видимости
      // Минимальный размер 12, максимальный ~80 для самых цитируемых
      let baseSize: number;
      if (citedByCount === 0) {
        baseSize = 12;
      } else if (citedByCount <= 10) {
        baseSize = 12 + citedByCount * 1.5; // 12-27
      } else if (citedByCount <= 100) {
        baseSize = 27 + Math.log10(citedByCount) * 12; // 27-51
      } else if (citedByCount <= 1000) {
        baseSize = 51 + Math.log10(citedByCount) * 8; // 51-75
      } else {
        baseSize = 75 + Math.log10(citedByCount) * 3; // 75-85+
      }

      // Уровень 1 (наши статьи) крупнее для выделения
      if (level === 1) baseSize *= 1.4;

      // AI-найденные статьи крупнее для выделения
      if (aiFoundArticleIds.has(node.id)) baseSize *= 1.5;

      // Бонус за качество статистики
      const statsBonus = statsQ > 0 ? 0.15 * statsQ : 0;

      return baseSize * (1 + statsBonus);
    },
    [aiFoundArticleIds],
  );

  // Обработчики фильтров
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  const handleQueryToggle = (query: string) => {
    setSelectedQueries((prev) => {
      if (prev.includes(query)) {
        return prev.filter((q) => q !== query);
      } else {
        return [...prev, query];
      }
    });
  };

  const handleClearQueries = () => {
    setSelectedQueries([]);
  };

  const handleSourceToggle = (source: "pubmed" | "doaj" | "wiley") => {
    setSelectedSources((prev) => {
      if (prev.includes(source)) {
        return prev.filter((s) => s !== source);
      } else {
        return [...prev, source];
      }
    });
  };

  const handleClearSources = () => {
    setSelectedSources([]);
  };

  // Прогрессивная загрузка - увеличить лимиты
  const handleLoadMore = () => {
    const newMaxNodes = Math.min(maxNodes + 1000, 5000);
    const newMaxLinks = Math.min(maxLinksPerNode + 10, 100);
    setMaxNodes(newMaxNodes);
    setMaxLinksPerNode(newMaxLinks);
  };

  // AI Ассистент - отправить сообщение
  const handleAISend = async () => {
    if (!aiMessage.trim() || aiLoading) return;

    const userMessage = aiMessage.trim();
    setAiMessage("");
    setAiLoading(true);
    setAiError(null);

    // Добавляем сообщение пользователя в историю
    setAiHistory((prev) => [...prev, { role: "user", content: userMessage }]);

    // Показываем статус отправки
    const externalCount = (data?.nodes || []).filter(
      (n) => (n.graphLevel ?? 1) !== 1,
    ).length;
    console.log(
      `[AI] Starting search. External articles available: ${externalCount}`,
    );

    try {
      // Собираем статьи из графа (только внешние - level 0, 2, 3)
      // graphLevel: 0 = citing, 1 = в проекте, 2 = references, 3 = related
      const allNodes = data?.nodes || [];

      // Отладка - подсчёт по уровням
      const levelCounts: Record<string, number> = {};
      for (const n of allNodes) {
        const level = String(n.graphLevel ?? "undefined");
        levelCounts[level] = (levelCounts[level] || 0) + 1;
      }
      console.log(`[AI] Graph nodes by level:`, levelCounts);

      // Фильтруем внешние статьи (level 0, 2, 3)
      const externalNodes = allNodes.filter((n) => {
        const level = n.graphLevel ?? 1; // undefined считаем как level 1 (в проекте)
        return level !== 1; // Исключаем статьи проекта (level 1)
      });

      console.log(`[AI] External nodes count: ${externalNodes.length}`);

      // Фильтруем только статьи с реальными данными (не placeholder)
      // Placeholder узлы имеют title типа "PMID:12345" без реальных метаданных
      const articlesWithData = externalNodes.filter((n) => {
        // Есть реальное название (не просто PMID:xxx или DOI:xxx)
        const hasRealTitle =
          n.title &&
          !n.title.startsWith("PMID:") &&
          !n.title.startsWith("DOI:");
        // Или есть год публикации
        const hasYear = n.year !== null && n.year !== undefined;
        // Или есть аннотация
        const hasAbstract = n.abstract && n.abstract.length > 50;

        return hasRealTitle || hasYear || hasAbstract;
      });

      console.log(
        `[AI] Articles with real data: ${articlesWithData.length} (from ${externalNodes.length} external)`,
      );

      // Сортируем по цитированиям
      const sortedArticles = [...articlesWithData].sort(
        (a, b) => (b.citedByCount || 0) - (a.citedByCount || 0),
      );

      // Передаём ВСЕ статьи с данными (без лимита)
      const graphArticles: GraphArticleForAI[] = sortedArticles.map((n) => ({
        id: n.id,
        title: n.title || undefined,
        abstract: n.abstract?.substring(0, 800), // Ограничиваем размер аннотации для payload
        year: n.year,
        journal: n.journal,
        authors: n.authors?.substring(0, 300),
        pmid: n.pmid,
        doi: n.doi,
        citedByCount: n.citedByCount,
        graphLevel: n.graphLevel,
        source: n.source, // Источник статьи (pubmed, doaj, wiley)
        status: n.status, // Статус в проекте
      }));

      // Формируем информацию о текущих фильтрах для AI
      const currentFilters: GraphFiltersForAI = {
        filter: filter,
        depth: depth,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        yearFrom: yearFrom,
        yearTo: yearTo,
        statsQuality: statsQuality > 0 ? statsQuality : undefined,
      };

      console.log(
        `[AI] Sending ${graphArticles.length} articles to AI (with real data)`,
      );
      console.log(
        `[AI DEBUG] Total: ${allNodes.length}, External: ${externalNodes.length}, With data: ${articlesWithData.length}`,
      );
      console.log(`[AI DEBUG] Level counts:`, levelCounts);

      if (graphArticles.length > 0) {
        console.log(
          `[AI] Sample article:`,
          JSON.stringify(graphArticles[0]).substring(0, 400),
        );
        const payloadSize = JSON.stringify({
          message: userMessage,
          graphArticles,
          context: { articleCount: stats.totalNodes, yearRange },
        }).length;
        console.log(
          `[AI DEBUG] Payload size: ${(payloadSize / 1024).toFixed(1)} KB`,
        );
      } else {
        // Нет статей с данными
        let errorMsg = "";
        if (externalNodes.length === 0) {
          errorMsg =
            depth < 2
              ? "Для поиска выберите глубину графа «+Ссылки» или «+Цитирующие»."
              : 'Нажмите кнопку "Связи" для загрузки ссылок из PubMed.';
        } else {
          // Есть внешние статьи, но без данных (placeholder)
          errorMsg = `В графе ${externalNodes.length} внешних статей, но у них нет метаданных (только PMID). Нужно загрузить их данные из PubMed. Это происходит автоматически при следующей загрузке связей.`;
        }
        setAiHistory((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${errorMsg}` },
        ]);
        setAiLoading(false);
        return;
      }

      // Подготавливаем информацию о кластерах для AI
      const clustersForAI: ClusterInfoForAI[] = semanticClusters.map((c) => ({
        id: c.id,
        name: c.name,
        articleCount: c.articleCount,
        centralArticleTitle: c.centralArticleTitle || undefined,
        articleIds: c.articleIds,
      }));

      // Подготавливаем информацию о gaps для AI
      // GapAnalysisItem содержит: article1, article2, similarity, reason
      const gapsForAI: GapInfoForAI[] = gapAnalysisResults.map((g) => ({
        type: "missing_link",
        description: `${g.article1.title} ↔ ${g.article2.title}: ${g.reason}`,
        severity:
          g.similarity > 0.85 ? "high" : g.similarity > 0.75 ? "medium" : "low",
        period:
          g.article1.year && g.article2.year
            ? `${Math.min(g.article1.year, g.article2.year)}-${Math.max(g.article1.year, g.article2.year)}`
            : undefined,
        articleCount: 2,
      }));

      const res = await apiGraphAIAssistant(
        projectId,
        userMessage,
        graphArticles,
        {
          articleCount: stats.totalNodes,
          yearRange: yearRange,
        },
        currentFilters,
        clustersForAI.length > 0 ? clustersForAI : undefined,
        gapsForAI.length > 0 ? gapsForAI : undefined,
      );

      if (res.ok) {
        setAiResponse(res.response);

        // Отладка: показываем что получил сервер
        const debug = (res as any)._debug;
        if (debug) {
          console.log(
            `[AI DEBUG] Server received: ${debug.receivedArticles} articles, external: ${debug.externalArticles}, for AI: ${debug.articlesForAICount}`,
          );
        }

        // Новые поля для найденных статей
        setAiFoundArticleIds(new Set(res.foundArticleIds || []));
        setAiFoundArticles(res.foundArticles || []);

        // Старые поля (для совместимости)
        setAiSuggestions(res.searchSuggestions || []);
        setAiPmidsToAdd(res.pmidsToAdd || []);
        setAiDoisToAdd(res.doisToAdd || []);

        // Добавляем ответ в историю
        const foundCount = res.foundArticleIds?.length || 0;
        let historyMsg = res.response;
        if (foundCount > 0) {
          historyMsg += `\n\n📊 Найдено статей: ${foundCount}`;
        }
        // Добавляем отладку если статей 0
        if (debug && debug.receivedArticles === 0) {
          historyMsg += `\n\n⚠️ [DEBUG] Сервер получил 0 статей. Проверьте консоль браузера.`;
        }
        setAiHistory((prev) => [
          ...prev,
          { role: "assistant", content: historyMsg },
        ]);
      } else {
        setAiError(res.error || "Ошибка AI");
        setAiHistory((prev) => [
          ...prev,
          { role: "assistant", content: `❌ ${res.error || "Ошибка"}` },
        ]);
      }
    } catch (err) {
      setAiError(getErrorMessage(err));
      setAiHistory((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${getErrorMessage(err)}` },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // AI Ассистент - добавить найденные статьи из графа
  const handleAIAddArticles = async (
    status: "candidate" | "selected" = "candidate",
  ) => {
    if (aiFoundArticles.length === 0) return;

    setAiAddingArticles(true);
    try {
      // Собираем PMIDs и DOIs из найденных статей
      const pmids = aiFoundArticles.filter((a) => a.pmid).map((a) => a.pmid!);
      const dois = aiFoundArticles
        .filter((a) => !a.pmid && a.doi)
        .map((a) => a.doi!);

      const res = await apiImportFromGraph(projectId, {
        pmids,
        dois,
        status,
      });

      const statusLabel = status === "selected" ? "Отобранные" : "Кандидаты";
      setImportMessage(
        `✅ AI добавил ${res.added || aiFoundArticles.length} статей в ${statusLabel}`,
      );
      // Автоматически скрываем уведомление через 5 секунд
      setTimeout(() => setImportMessage(null), 5000);

      // Очищаем найденные статьи
      setAiFoundArticleIds(new Set());
      setAiFoundArticles([]);

      // Перезагружаем граф
      setTimeout(() => {
        loadGraph(getGraphOptions());
      }, 500);
    } catch (err) {
      setImportMessage(`❌ Ошибка: ${getErrorMessage(err)}`);
      // Автоматически скрываем уведомление об ошибке через 7 секунд
      setTimeout(() => setImportMessage(null), 7000);
    } finally {
      setAiAddingArticles(false);
    }
  };

  // Сбросить подсветку найденных статей
  const handleAIClearHighlight = () => {
    setAiFoundArticleIds(new Set());
    setAiFoundArticles([]);
    setAiSelectedForAdd(new Set());
  };

  // Переключить выбор статьи для добавления
  const toggleArticleSelection = (articleId: string) => {
    setAiSelectedForAdd((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  // Выбрать/снять все статьи
  const toggleSelectAll = () => {
    if (aiSelectedForAdd.size === aiFoundArticles.length) {
      setAiSelectedForAdd(new Set());
    } else {
      setAiSelectedForAdd(new Set(aiFoundArticles.map((a) => a.id)));
    }
  };

  // Добавить выбранные статьи (или все если ничего не выбрано)
  const handleAIAddSelectedArticles = async (
    status: "candidate" | "selected" = "candidate",
  ) => {
    const articlesToAdd =
      aiSelectedForAdd.size > 0
        ? aiFoundArticles.filter((a) => aiSelectedForAdd.has(a.id))
        : aiFoundArticles;

    if (articlesToAdd.length === 0) return;

    setAiAddingArticles(true);
    try {
      const pmids = articlesToAdd.filter((a) => a.pmid).map((a) => a.pmid!);
      const dois = articlesToAdd
        .filter((a) => !a.pmid && a.doi)
        .map((a) => a.doi!);

      const res = await apiImportFromGraph(projectId, { pmids, dois, status });

      const statusLabel = status === "selected" ? "Отобранные" : "Кандидаты";
      setImportMessage(
        `✅ Добавлено ${res.added || articlesToAdd.length} статей в ${statusLabel}`,
      );
      setTimeout(() => setImportMessage(null), 5000);

      // Убираем добавленные статьи из списка
      const addedIds = new Set(articlesToAdd.map((a) => a.id));
      setAiFoundArticles((prev) => prev.filter((a) => !addedIds.has(a.id)));
      setAiFoundArticleIds((prev) => {
        const newSet = new Set(prev);
        addedIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
      setAiSelectedForAdd(new Set());

      // Перезагружаем граф
      setTimeout(() => {
        loadGraph(getGraphOptions());
      }, 500);
    } catch (err) {
      setImportMessage(`❌ Ошибка: ${getErrorMessage(err)}`);
      setTimeout(() => setImportMessage(null), 7000);
    } finally {
      setAiAddingArticles(false);
    }
  };

  // Добавить все статьи с P-value в проект
  const handleAddAllWithPValue = async () => {
    if (!data) return;

    setAddingPValueArticles(true);
    setImportMessage(null);

    try {
      // Собираем все внешние статьи с P-value
      const articlesToAdd = data.nodes.filter(
        (n) =>
          n.graphLevel !== 1 && // Не в проекте
          (n.statsQuality || 0) > 0 && // Есть P-value
          (n.pmid || n.doi), // Есть идентификатор
      );

      if (articlesToAdd.length === 0) {
        setImportMessage("Нет статей с P-value для добавления");
        setTimeout(() => setImportMessage(null), 5000);
        setAddingPValueArticles(false);
        return;
      }

      const pmids = articlesToAdd.filter((n) => n.pmid).map((n) => n.pmid!);
      const dois = articlesToAdd
        .filter((n) => !n.pmid && n.doi)
        .map((n) => n.doi!);

      const res = await apiImportFromGraph(projectId, {
        pmids,
        dois,
        status: "candidate",
      });

      setImportMessage(
        `✅ Добавлено ${res.added || articlesToAdd.length} статей с P-value в Кандидаты`,
      );
      // Автоматически скрываем уведомление через 5 секунд
      setTimeout(() => setImportMessage(null), 5000);

      // Перезагружаем граф
      setTimeout(() => {
        loadGraph(getGraphOptions());
      }, 500);
    } catch (err) {
      setImportMessage(`❌ Ошибка: ${getErrorMessage(err)}`);
      // Автоматически скрываем уведомление об ошибке через 7 секунд
      setTimeout(() => setImportMessage(null), 7000);
    } finally {
      setAddingPValueArticles(false);
    }
  };

  if (loading) {
    return (
      <div className="graph-container">
        <div className="muted" style={{ padding: 40, textAlign: "center" }}>
          <div
            className="loading-spinner"
            style={{ margin: "0 auto 16px", width: 32, height: 32 }}
          />
          Загрузка графа цитирований...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-container">
        <div className="alert" style={{ margin: 20 }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`graph-container graph-fixed-height ${isFullscreen ? "graph-fullscreen" : ""}`}
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "row",
        height: isFullscreen ? "100vh" : "calc(100vh - 48px)",
        minHeight: "600px",
        width: isFullscreen ? "100vw" : "100%",
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : "auto",
        left: isFullscreen ? 0 : "auto",
        zIndex: isFullscreen ? 9999 : "auto",
      }}
    >
      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Compact Header Panel with Dropdowns - horizontal layout */}
        <div className="graph-header-filters">
          {/* Title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginRight: 8,
            }}
          >
            <IconGraph size="md" className="text-accent" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Граф</span>
          </div>

          {/* Depth Dropdown */}
          <select
            value={depth}
            onChange={(e) =>
              setDepth(parseInt(e.target.value, 10) as DepthType)
            }
            className="graph-compact-select"
          >
            <option value={1}>Проект</option>
            <option value={2}>+Ссылки</option>
            <option value={3}>+Цитирующие</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as FilterType)}
            className="graph-compact-select"
          >
            <option value="all">Все статусы</option>
            <option value="selected">Отобранные</option>
            <option value="excluded">Исключённые</option>
          </select>

          {/* Source Dropdown */}
          <select
            value={selectedSources.length === 0 ? "all" : selectedSources[0]}
            onChange={(e) => {
              if (e.target.value === "all") {
                handleClearSources();
              } else {
                setSelectedSources([
                  e.target.value as "pubmed" | "doaj" | "wiley",
                ]);
              }
            }}
            className="graph-compact-select"
          >
            <option value="all">Все источники</option>
            <option value="pubmed">PubMed</option>
            <option value="doaj">DOAJ</option>
            <option value="wiley">Wiley</option>
          </select>

          {/* Year Range */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="number"
              placeholder="Год от"
              value={yearFromInput}
              onChange={(e) => setYearFromInput(e.target.value)}
              onBlur={() => {
                const val = yearFromInput
                  ? parseInt(yearFromInput, 10)
                  : undefined;
                if (val !== yearFrom) setYearFrom(val);
              }}
              className="graph-compact-input"
              style={{ width: 70 }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
            <input
              type="number"
              placeholder="До"
              value={yearToInput}
              onChange={(e) => setYearToInput(e.target.value)}
              onBlur={() => {
                const val = yearToInput ? parseInt(yearToInput, 10) : undefined;
                if (val !== yearTo) setYearTo(val);
              }}
              className="graph-compact-input"
              style={{ width: 60 }}
            />
          </div>

          {/* P-value */}
          <select
            value={statsQuality}
            onChange={(e) => setStatsQuality(parseInt(e.target.value, 10))}
            className="graph-compact-select"
          >
            <option value={0}>P-value: все</option>
            <option value={1}>≥ Упомянут</option>
            <option value={2}>≥ Значимые</option>
            <option value={3}>Строгие</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="graph-compact-select"
          >
            <option value="citations">По цитированиям</option>
            <option value="frequency">По частоте</option>
            <option value="year">По году</option>
            <option value="default">Без сортировки</option>
          </select>

          {/* Lang Toggle */}
          <div className="lang-toggle" style={{ padding: 0 }}>
            <button
              className={globalLang === "en" ? "active" : ""}
              onClick={() => setGlobalLang("en")}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              EN
            </button>
            <button
              className={globalLang === "ru" ? "active" : ""}
              onClick={() => setGlobalLang("ru")}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              RU
            </button>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Actions */}
          <button
            className="btn secondary"
            style={{
              padding: "5px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
            }}
            onClick={handleFetchReferences}
            disabled={fetchingRefs || !!fetchJobStatus?.isRunning}
          >
            <IconRefresh
              size="sm"
              className={fetchingRefs ? "animate-spin" : ""}
            />
            <span style={{ marginLeft: 4 }}>
              {fetchingRefs ? "..." : "Связи"}
            </span>
          </button>

          {/* Рекомендации */}
          <button
            className="btn secondary"
            style={{
              padding: "5px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={loadRecommendations}
            disabled={loadingRecommendations}
            title="Рекомендации по улучшению графа"
          >
            <IconSparkles size="sm" />
            {recommendations.length > 0 && (
              <span
                style={{
                  background: "var(--accent)",
                  color: "white",
                  borderRadius: 10,
                  padding: "1px 5px",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                {recommendations.length}
              </span>
            )}
          </button>

          {/* Семантический поиск */}
          <button
            className={showSemanticSearch ? "btn primary" : "btn secondary"}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => {
              setShowSemanticSearch(!showSemanticSearch);
              if (!showSemanticSearch) {
                loadEmbeddingStats();
                loadMissingArticlesStats();
              }
            }}
            title="Семантический поиск по статьям"
          >
            <IconSearch size="sm" />
            <span>Сем.</span>
          </button>

          {/* Анализ методологий */}
          <button
            className={
              showMethodologyClusters ? "btn primary" : "btn secondary"
            }
            style={{
              padding: "5px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => {
              if (
                !showMethodologyClusters &&
                methodologyClusters.length === 0
              ) {
                handleAnalyzeMethodologies();
              } else {
                setShowMethodologyClusters(!showMethodologyClusters);
              }
            }}
            disabled={analyzingMethodologies}
            title="Анализ методологий исследований"
          >
            <IconChartBar size="sm" />
            <span>{analyzingMethodologies ? "..." : "Метод."}</span>
          </button>

          {/* Семантические кластеры */}
          <button
            className={
              showSemanticClustersPanel ? "btn primary" : "btn secondary"
            }
            style={{
              padding: "5px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => {
              if (!showSemanticClustersPanel && semanticClusters.length === 0) {
                loadSemanticClusters();
              }
              setShowSemanticClustersPanel(!showSemanticClustersPanel);
            }}
            disabled={loadingSemanticClusters}
            title="Семантические кластеры статей"
          >
            <IconGraph size="sm" />
            <span>{loadingSemanticClusters ? "..." : "Кластеры"}</span>
            {semanticClusters.length > 0 && (
              <span
                style={{
                  background: "var(--accent-secondary)",
                  color: "white",
                  borderRadius: 10,
                  padding: "1px 5px",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                {semanticClusters.length}
              </span>
            )}
          </button>

          {/* Gap Analysis */}
          <button
            className={showGapAnalysis ? "btn primary" : "btn secondary"}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => {
              if (!showGapAnalysis && gapAnalysisResults.length === 0) {
                handleGapAnalysis();
              } else {
                setShowGapAnalysis(!showGapAnalysis);
              }
            }}
            disabled={loadingGapAnalysis}
            title="Анализ пропущенных связей"
          >
            <IconLinkChain size="sm" />
            <span>{loadingGapAnalysis ? "..." : "Gaps"}</span>
            {gapAnalysisResults.length > 0 && (
              <span
                style={{
                  background: "#f59e0b",
                  color: "white",
                  borderRadius: 10,
                  padding: "1px 5px",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                {gapAnalysisResults.length}
              </span>
            )}
          </button>

          {/* Экспорт */}
          <div className="dropdown" style={{ position: "relative" }}>
            <button
              className="graph-compact-btn"
              title="Экспорт графа"
              onClick={(e) => {
                const menu = e.currentTarget.nextElementSibling as HTMLElement;
                if (menu)
                  menu.style.display =
                    menu.style.display === "none" ? "block" : "none";
              }}
            >
              <IconDownload size="sm" />
            </button>
            <div
              style={{
                display: "none",
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 4,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-glass)",
                borderRadius: 8,
                padding: 4,
                minWidth: 140,
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <button
                onClick={() => handleExport("json")}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 10px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 12,
                  borderRadius: 4,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                JSON
              </button>
              <button
                onClick={() => handleExport("graphml")}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 10px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 12,
                  borderRadius: 4,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                GraphML
              </button>
              <button
                onClick={() => handleExport("cytoscape")}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 10px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 12,
                  borderRadius: 4,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                Cytoscape
              </button>
              <button
                onClick={() => handleExport("gexf")}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 10px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 12,
                  borderRadius: 4,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                GEXF (Gephi)
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="graph-compact-btn"
            title="Настройки"
          >
            <IconAdjustments size="sm" />
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="graph-compact-btn"
            title="Как работает"
          >
            <IconQuestionMark size="sm" />
          </button>

          <button
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className={
              showAIAssistant ? "graph-compact-btn-active" : "graph-compact-btn"
            }
            title="AI Ассистент"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <IconSparkles size="sm" />
            AI
          </button>
        </div>

        {/* Advanced Settings Panel */}
        {showAdvancedSettings && (
          <div
            className="graph-filters"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              padding: "12px 20px",
              borderBottom: "1px solid var(--border-glass)",
              alignItems: "center",
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05))",
            }}
          >
            {/* Max Nodes Slider */}
            <div className="graph-filter-group">
              <div className="graph-filter-label">
                <IconUsers size="sm" />
                <span>
                  Узлов: <strong>{unlimitedNodes ? "∞" : maxNodes}</strong>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={maxNodes}
                onChange={(e) => {
                  setMaxNodes(parseInt(e.target.value, 10));
                  setUnlimitedNodes(false);
                }}
                disabled={unlimitedNodes}
                style={{
                  width: 120,
                  cursor: unlimitedNodes ? "not-allowed" : "pointer",
                  opacity: unlimitedNodes ? 0.5 : 1,
                }}
                title="Максимальное количество узлов в графе"
              />
              <button
                onClick={() => setUnlimitedNodes(!unlimitedNodes)}
                className={unlimitedNodes ? "btn primary" : "btn secondary"}
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  marginLeft: 8,
                  whiteSpace: "nowrap",
                }}
                title="Без ограничений"
              >
                ∞
              </button>
            </div>

            {/* Max Links Per Node */}
            <div className="graph-filter-group">
              <div className="graph-filter-label">
                <IconLink size="sm" />
                <span>
                  Связей/узел:{" "}
                  <strong>{unlimitedLinks ? "∞" : maxLinksPerNode}</strong>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5000}
                step={10}
                value={maxLinksPerNode}
                onChange={(e) => {
                  setMaxLinksPerNode(parseInt(e.target.value, 10));
                  setUnlimitedLinks(false);
                }}
                disabled={unlimitedLinks}
                style={{
                  width: 120,
                  cursor: unlimitedLinks ? "not-allowed" : "pointer",
                  opacity: unlimitedLinks ? 0.5 : 1,
                }}
                title="Максимум связей на каждый узел"
              />
              <button
                onClick={() => setUnlimitedLinks(!unlimitedLinks)}
                className={unlimitedLinks ? "btn primary" : "btn secondary"}
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  marginLeft: 8,
                  whiteSpace: "nowrap",
                }}
                title="Без ограничений"
              >
                ∞
              </button>
            </div>

            {/* Clustering Toggle */}
            <div className="graph-filter-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={enableClustering}
                  onChange={(e) => setEnableClustering(e.target.checked)}
                  className="search-checkbox"
                />
                <span>Кластеризация</span>
              </label>
              {enableClustering && (
                <select
                  value={clusterBy}
                  onChange={(e) =>
                    setClusterBy(e.target.value as typeof clusterBy)
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    border: "1px solid var(--border-glass)",
                    borderRadius: 6,
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="auto">Авто</option>
                  <option value="year">По годам</option>
                  <option value="journal">По журналам</option>
                </select>
              )}
            </div>

            {/* Load More Button */}
            {canLoadMore && !unlimitedNodes && maxNodes < 5000 && (
              <button
                className="btn secondary"
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={handleLoadMore}
                title="Загрузить больше связанных статей"
              >
                <IconPlus
                  size="sm"
                  className="icon-sm"
                  style={{ marginRight: 4 }}
                />
                Загрузить больше (+1000)
              </button>
            )}

            {/* Current Limits Info */}
            {currentLimits && !unlimitedNodes && !unlimitedLinks && (
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Текущие лимиты: {currentLimits.maxExtraNodes} узлов,{" "}
                {currentLimits.maxLinksPerNode} связей/узел
              </div>
            )}
            {(unlimitedNodes || unlimitedLinks) && (
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--text-success)",
                  fontWeight: 600,
                }}
              >
                ∞ Без ограничений{" "}
                {unlimitedNodes && unlimitedLinks
                  ? ""
                  : unlimitedNodes
                    ? "(узлы)"
                    : "(связи)"}
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {fetchJobStatus?.isRunning && (
          <div
            style={{
              padding: "16px 20px",
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))",
              borderBottom: "1px solid var(--border-glass)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div className="loading-spinner" />
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--text-primary)",
                  }}
                >
                  Загрузка связей (PubMed + Crossref)...
                </span>
                {fetchJobStatus.currentPhase && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {fetchJobStatus.currentPhase}
                    {fetchJobStatus.phaseProgress &&
                      ` — ${fetchJobStatus.phaseProgress}`}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {formatTime(fetchJobStatus.elapsedSeconds)}
              </span>
              <button
                onClick={handleCancelFetch}
                className="btn secondary"
                style={{ padding: "4px 8px", fontSize: 11 }}
                title="Отменить загрузку"
              >
                ✕ Отмена
              </button>
            </div>

            <div
              className="progress-bar-animated"
              style={{
                height: 6,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${fetchJobStatus.progress}%`,
                  background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span>
                Статей: {fetchJobStatus.processedArticles || 0} /{" "}
                {fetchJobStatus.totalArticles || "?"}
              </span>
              <span>{fetchJobStatus.progress}% завершено</span>
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <IconInfoCircle size="sm" />
              <span>
                Загрузка выполняется в фоне. Граф обновится автоматически.
                {fetchJobStatus.secondsSinceProgress != null &&
                  fetchJobStatus.secondsSinceProgress > 30 && (
                    <span style={{ color: "#f97316" }}>
                      {" "}
                      (нет обновлений {fetchJobStatus.secondsSinceProgress} сек
                      — возможно, сервер PubMed медленно отвечает)
                    </span>
                  )}
              </span>
            </div>
          </div>
        )}

        {refsMessage && (
          <div
            className="info"
            style={{
              margin: "8px 20px",
              padding: 12,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(59, 130, 246, 0.15)",
              borderRadius: 8,
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            {refsMessage.startsWith("crossref:") ? (
              <>
                <IconLinkChain size="sm" className="text-blue-400" />
                <span>
                  <strong>{refsMessage.replace("crossref:", "")}</strong> статей
                  без PMID — связи загружаются из Crossref по DOI
                </span>
              </>
            ) : (
              <>
                <IconInfoCircle size="sm" className="text-blue-400" />
                <span>{refsMessage}</span>
              </>
            )}
          </div>
        )}

        {importMessage && (
          <div
            className="ok"
            style={{ margin: "8px 20px", padding: 12, fontSize: 13 }}
          >
            {importMessage}
          </div>
        )}

        {/* Semantic Search Panel */}
        {showSemanticSearch && (
          <div
            className="graph-filters"
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid var(--border-glass)",
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05))",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <IconSearch size="sm" />
                <span style={{ fontWeight: 600 }}>Семантический поиск</span>
                {embeddingStats && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    ({embeddingStats.withEmbeddings}/
                    {embeddingStats.totalArticles} статей с embeddings,
                    {embeddingStats.completionRate.toFixed(0)}%)
                  </span>
                )}
              </div>

              {embeddingStats && embeddingStats.withoutEmbeddings > 0 && (
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Кнопка генерации */}
                  <button
                    className="btn secondary"
                    style={{ fontSize: 11, padding: "4px 10px" }}
                    onClick={handleGenerateEmbeddings}
                    disabled={generatingEmbeddings}
                  >
                    {generatingEmbeddings
                      ? importMissingArticles
                        ? "Импорт и генерация..."
                        : "Генерация..."
                      : `Создать embeddings (${embeddingStats.withoutEmbeddings})`}
                  </button>

                  {/* Чекбокс импорта - компактный, справа от кнопки */}
                  {missingArticlesStats &&
                    missingArticlesStats.totalMissing > 0 && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          color: importMissingArticles
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                          cursor: generatingEmbeddings
                            ? "not-allowed"
                            : "pointer",
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: importMissingArticles
                            ? "rgba(16, 185, 129, 0.1)"
                            : "transparent",
                          border: `1px solid ${importMissingArticles ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)"}`,
                          transition: "all 0.2s",
                        }}
                        title={`Импортировать топ-${missingArticlesStats.importLimit || 1000} цитирующих статей из PubMed (всего доступно: ${(missingArticlesStats.totalAvailable || missingArticlesStats.totalMissing).toLocaleString()}). Ранжируются по частоте цитирования ваших статей. Ретракции исключаются.`}
                      >
                        <input
                          type="checkbox"
                          checked={importMissingArticles}
                          onChange={(e) =>
                            setImportMissingArticles(e.target.checked)
                          }
                          disabled={generatingEmbeddings}
                          style={{ cursor: "inherit", margin: 0 }}
                        />
                        <span>
                          +{missingArticlesStats.totalMissing.toLocaleString()}{" "}
                          цитирующих
                          {missingArticlesStats.totalAvailable &&
                            missingArticlesStats.totalAvailable >
                              missingArticlesStats.totalMissing && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "var(--text-muted)",
                                  marginLeft: 3,
                                }}
                              >
                                из{" "}
                                {missingArticlesStats.totalAvailable.toLocaleString()}
                              </span>
                            )}
                        </span>
                      </label>
                    )}
                  {generatingEmbeddings && embeddingJob?.jobId && (
                    <button
                      className="btn"
                      style={{
                        fontSize: 11,
                        padding: "4px 8px",
                        background: "var(--bg-error)",
                        color: "white",
                      }}
                      onClick={handleCancelEmbeddings}
                    >
                      Отменить
                    </button>
                  )}
                  {embeddingMessage && (
                    <span
                      style={{
                        fontSize: 11,
                        color: embeddingMessage.startsWith("✓")
                          ? "#10b981"
                          : embeddingMessage.startsWith("Ошибка")
                            ? "#ef4444"
                            : "var(--text-muted)",
                      }}
                    >
                      {embeddingMessage}
                    </span>
                  )}
                  {generatingEmbeddings && embeddingJob && (
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        background: "var(--bg-tertiary)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${embeddingJob.total > 0 ? Math.round((embeddingJob.processed / embeddingJob.total) * 100) : 0}%`,
                          background:
                            "linear-gradient(90deg, #10b981, #3b82f6)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
                placeholder="Введите запрос для поиска похожих статей..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-glass)",
                  background: "var(--bg-primary)",
                  color: "inherit",
                  fontSize: 13,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Порог:
                </label>
                <input
                  type="range"
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  value={semanticThreshold}
                  onChange={(e) =>
                    setSemanticThreshold(parseFloat(e.target.value))
                  }
                  style={{ width: 60 }}
                />
                <span style={{ fontSize: 11, minWidth: 30 }}>
                  {semanticThreshold.toFixed(2)}
                </span>
              </div>
              <button
                className="btn primary"
                onClick={handleSemanticSearch}
                disabled={semanticSearching || !semanticQuery.trim()}
                style={{ padding: "8px 16px" }}
              >
                {semanticSearching ? "..." : "Найти"}
              </button>
            </div>

            {semanticResults.length > 0 && (
              <div style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                  }}
                >
                  Найдено {semanticResults.length} похожих статей:
                </div>
                {semanticResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => highlightSemanticResult(result.id)}
                    style={{
                      padding: "6px 8px",
                      marginBottom: 4,
                      background: "var(--bg-secondary)",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {result.titleEn || result.title}
                    </span>
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "2px 6px",
                        background: `rgba(16, 185, 129, ${result.similarity})`,
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {(result.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Визуализация семантического ядра */}
            {embeddingStats && embeddingStats.withEmbeddings > 10 && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      🔗 Семантическое ядро
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      (связи по смыслу)
                    </span>
                  </div>
                  <label className="toggle-switch" style={{ fontSize: 11 }}>
                    <input
                      type="checkbox"
                      checked={showSemanticEdges}
                      onChange={(e) => {
                        setShowSemanticEdges(e.target.checked);
                        if (e.target.checked && semanticEdges.length === 0) {
                          loadSemanticEdges();
                        }
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                {showSemanticEdges && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <label
                        style={{ fontSize: 11, color: "var(--text-muted)" }}
                      >
                        Порог схожести:
                      </label>
                      <input
                        type="range"
                        min={0.6}
                        max={0.95}
                        step={0.05}
                        value={semanticEdgeThreshold}
                        onChange={(e) =>
                          setSemanticEdgeThreshold(parseFloat(e.target.value))
                        }
                        style={{ width: 80 }}
                      />
                      <span style={{ fontSize: 11, minWidth: 35 }}>
                        {(semanticEdgeThreshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <button
                      className="btn secondary"
                      style={{ fontSize: 11, padding: "4px 12px" }}
                      onClick={loadSemanticEdges}
                      disabled={loadingSemanticEdges}
                    >
                      {loadingSemanticEdges ? "Загрузка..." : "Обновить"}
                    </button>
                    {semanticEdges.length > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--accent-secondary)",
                        }}
                      >
                        {semanticEdges.length} связей
                      </span>
                    )}
                  </div>
                )}

                {showSemanticEdges && semanticEdges.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      background: "rgba(236, 72, 153, 0.1)",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: "rgba(236, 72, 153, 0.8)" }}>
                      — — —
                    </span>{" "}
                    Пунктирные розовые линии = семантическая близость (статьи
                    про похожие темы, но без прямого цитирования)
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Methodology Clusters Panel */}
        {showMethodologyClusters && methodologyClusters.length > 0 && (
          <div
            className="graph-filters"
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid var(--border-glass)",
              background:
                "linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(236, 72, 153, 0.05))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <IconChartBar size="sm" />
              <span style={{ fontWeight: 600 }}>
                Кластеризация по методологиям
              </span>
              <button
                className="btn secondary"
                style={{ fontSize: 10, padding: "2px 6px", marginLeft: "auto" }}
                onClick={() => filterByMethodology(null)}
              >
                Сбросить фильтр
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {methodologyClusters
                .filter((c) => c.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((cluster) => (
                  <button
                    key={cluster.type}
                    onClick={() =>
                      filterByMethodology(
                        methodologyFilter === cluster.type
                          ? null
                          : cluster.type,
                      )
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border:
                        methodologyFilter === cluster.type
                          ? "2px solid var(--accent)"
                          : "1px solid var(--border-glass)",
                      background:
                        methodologyFilter === cluster.type
                          ? "var(--accent)"
                          : "var(--bg-secondary)",
                      color:
                        methodologyFilter === cluster.type
                          ? "white"
                          : "inherit",
                      cursor: "pointer",
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{cluster.name}</span>
                    <span
                      style={{
                        background:
                          methodologyFilter === cluster.type
                            ? "rgba(255,255,255,0.2)"
                            : "var(--bg-tertiary)",
                        padding: "1px 5px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {cluster.count}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                      ({cluster.percentage.toFixed(0)}%)
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Semantic Clusters Panel */}
        {showSemanticClustersPanel && (
          <div
            className="graph-filters"
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid var(--border-glass)",
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(34, 197, 94, 0.05))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <IconGraph size="sm" />
              <span style={{ fontWeight: 600 }}>🔮 Семантические кластеры</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                (группировка по смыслу)
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {semanticClusters.length > 0 && (
                  <button
                    className="btn secondary"
                    style={{ fontSize: 10, padding: "2px 6px" }}
                    onClick={() => filterBySemanticCluster(null)}
                  >
                    Сбросить
                  </button>
                )}
                <button
                  className="btn secondary"
                  style={{ fontSize: 10, padding: "2px 6px" }}
                  onClick={handleCreateSemanticClusters}
                  disabled={creatingSemanticClusters}
                >
                  {creatingSemanticClusters
                    ? "Создание..."
                    : semanticClusters.length > 0
                      ? "Пересоздать"
                      : "Создать кластеры"}
                </button>
                {semanticClusters.length > 0 && (
                  <button
                    className="btn secondary"
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      color: "#ef4444",
                    }}
                    onClick={handleDeleteSemanticClusters}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>

            {/* Настройки кластеризации */}
            {semanticClusters.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  marginBottom: 12,
                  padding: 12,
                  background: "var(--bg-secondary)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Кластеров:
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={semanticClusterSettings.numClusters}
                    onChange={(e) =>
                      setSemanticClusterSettings((s) => ({
                        ...s,
                        numClusters: parseInt(e.target.value) || 5,
                      }))
                    }
                    style={{
                      width: 50,
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: "1px solid var(--border-glass)",
                      background: "var(--bg-primary)",
                      color: "inherit",
                      fontSize: 11,
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Мин. размер:
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={semanticClusterSettings.minClusterSize}
                    onChange={(e) =>
                      setSemanticClusterSettings((s) => ({
                        ...s,
                        minClusterSize: parseInt(e.target.value) || 3,
                      }))
                    }
                    style={{
                      width: 50,
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: "1px solid var(--border-glass)",
                      background: "var(--bg-primary)",
                      color: "inherit",
                      fontSize: 11,
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Порог схожести:
                  </label>
                  <input
                    type="range"
                    min={0.4}
                    max={0.8}
                    step={0.05}
                    value={semanticClusterSettings.similarityThreshold}
                    onChange={(e) =>
                      setSemanticClusterSettings((s) => ({
                        ...s,
                        similarityThreshold: parseFloat(e.target.value),
                      }))
                    }
                    style={{ width: 60 }}
                  />
                  <span style={{ fontSize: 11 }}>
                    {(
                      semanticClusterSettings.similarityThreshold * 100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={semanticClusterSettings.generateNames}
                    onChange={(e) =>
                      setSemanticClusterSettings((s) => ({
                        ...s,
                        generateNames: e.target.checked,
                      }))
                    }
                  />
                  AI-названия
                </label>
              </div>
            )}

            {/* Список кластеров */}
            {semanticClusters.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {semanticClusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    onClick={() =>
                      filterBySemanticCluster(
                        selectedSemanticCluster === cluster.id
                          ? null
                          : cluster.id,
                      )
                    }
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openClusterDetails(cluster);
                    }}
                    title="Клик: фильтр | Двойной клик: детали"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border:
                        selectedSemanticCluster === cluster.id
                          ? `2px solid ${cluster.color}`
                          : "1px solid var(--border-glass)",
                      background:
                        selectedSemanticCluster === cluster.id
                          ? cluster.color
                          : "var(--bg-secondary)",
                      color:
                        selectedSemanticCluster === cluster.id
                          ? "white"
                          : "inherit",
                      cursor: "pointer",
                      fontSize: 11,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 4,
                      minWidth: 150,
                      position: "relative",
                    }}
                  >
                    {/* Кнопка деталей */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openClusterDetails(cluster);
                      }}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: "none",
                        background:
                          selectedSemanticCluster === cluster.id
                            ? "rgba(255,255,255,0.2)"
                            : "var(--bg-tertiary)",
                        color: "inherit",
                        cursor: "pointer",
                        fontSize: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Подробнее о кластере"
                    >
                      ⓘ
                    </button>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        paddingRight: 20,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: cluster.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cluster.name}
                      </span>
                      <span
                        style={{
                          background:
                            selectedSemanticCluster === cluster.id
                              ? "rgba(255,255,255,0.2)"
                              : cluster.color + "30",
                          color:
                            selectedSemanticCluster === cluster.id
                              ? "white"
                              : cluster.color,
                          padding: "2px 6px",
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {cluster.articleCount}
                      </span>
                    </div>
                    {cluster.centralArticleTitle && (
                      <div
                        style={{
                          fontSize: 9,
                          color:
                            selectedSemanticCluster === cluster.id
                              ? "rgba(255,255,255,0.8)"
                              : "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          width: "100%",
                        }}
                        title={cluster.centralArticleTitle}
                      >
                        ⭐ {cluster.centralArticleTitle.slice(0, 40)}...
                      </div>
                    )}
                    {cluster.keywords.length > 0 && (
                      <div
                        style={{
                          fontSize: 9,
                          color:
                            selectedSemanticCluster === cluster.id
                              ? "rgba(255,255,255,0.7)"
                              : "var(--text-muted)",
                        }}
                      >
                        {cluster.keywords.slice(0, 3).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Подсказка про embeddings */}
            {semanticClusters.length === 0 && !creatingSemanticClusters && (
              <div
                style={{
                  textAlign: "center",
                  padding: 16,
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                {embeddingStats && embeddingStats.withEmbeddings < 10 ? (
                  <>
                    <div style={{ marginBottom: 8, color: "#f59e0b" }}>
                      ⚠️ Недостаточно embeddings для кластеризации
                    </div>
                    <div>
                      Сначала создайте embeddings в панели "Сем." (семантический
                      поиск).
                      <br />
                      Сейчас: {embeddingStats.withEmbeddings} из{" "}
                      {embeddingStats.totalArticles} статей
                    </div>
                  </>
                ) : (
                  <>
                    Нажмите "Создать кластеры" для автоматической группировки
                    статей по семантической близости
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gap Analysis Panel */}
        {showGapAnalysis && (
          <div
            className="graph-filters"
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-glass)",
              background:
                "linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.05))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconLinkChain size="sm" />
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  🔍 Анализ пробелов
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  (похожие статьи без цитирований)
                </span>
              </div>

              {/* Фильтры - компактная версия */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginLeft: "auto",
                  background: "var(--bg-secondary)",
                  padding: "6px 10px",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Годы:
                </span>
                <select
                  value={gapYearFrom || ""}
                  onChange={(e) =>
                    setGapYearFrom(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: 12,
                    borderRadius: 4,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "inherit",
                    cursor: "pointer",
                    minWidth: 70,
                  }}
                >
                  <option value="">с...</option>
                  {Array.from(
                    { length: new Date().getFullYear() - 1950 + 1 },
                    (_, i) => 1950 + i,
                  )
                    .reverse()
                    .map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                </select>
                <span style={{ color: "var(--text-muted)" }}>—</span>
                <select
                  value={gapYearTo || ""}
                  onChange={(e) =>
                    setGapYearTo(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: 12,
                    borderRadius: 4,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "inherit",
                    cursor: "pointer",
                    minWidth: 70,
                  }}
                >
                  <option value="">по...</option>
                  {Array.from(
                    { length: new Date().getFullYear() - 1950 + 1 },
                    (_, i) => 1950 + i,
                  )
                    .reverse()
                    .map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                </select>

                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginLeft: 4,
                  }}
                >
                  Лимит:
                </span>
                <select
                  value={gapLimit}
                  onChange={(e) => setGapLimit(parseInt(e.target.value, 10))}
                  style={{
                    padding: "4px 8px",
                    fontSize: 12,
                    borderRadius: 4,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "inherit",
                    cursor: "pointer",
                    minWidth: 55,
                  }}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={200}>200</option>
                </select>
              </div>

              <button
                onClick={handleGapAnalysis}
                disabled={loadingGapAnalysis}
                style={{
                  fontSize: 12,
                  padding: "6px 16px",
                  background: loadingGapAnalysis
                    ? "var(--bg-tertiary)"
                    : "linear-gradient(135deg, #f59e0b, #ef4444)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: loadingGapAnalysis ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: loadingGapAnalysis
                    ? "none"
                    : "0 2px 8px rgba(245, 158, 11, 0.3)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {loadingGapAnalysis ? "⏳ Поиск..." : "🔍 Найти пробелы"}
              </button>
            </div>

            {gapAnalysisResults.length > 0 ? (
              <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 12 }}>
                {gapAnalysisResults.map((gap, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 10,
                      marginBottom: 8,
                      background: "var(--bg-secondary)",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          background: `rgba(245, 158, 11, ${gap.similarity})`,
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontWeight: 600,
                          fontSize: 10,
                        }}
                      >
                        {(gap.similarity * 100).toFixed(0)}% схожесть
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: "var(--text-muted)",
                          maxWidth: "60%",
                        }}
                      >
                        {gap.reason}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div
                        style={{ flex: 1, cursor: "pointer" }}
                        onClick={() => highlightSemanticResult(gap.article1.id)}
                      >
                        <div
                          style={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {gap.article1.title?.slice(0, 50)}...
                        </div>
                        <div
                          style={{ fontSize: 9, color: "var(--text-muted)" }}
                        >
                          {gap.article1.year || "N/A"}
                        </div>
                      </div>
                      <div style={{ color: "#f59e0b", padding: "0 8px" }}>
                        ↔
                      </div>
                      <div
                        style={{ flex: 1, cursor: "pointer" }}
                        onClick={() => highlightSemanticResult(gap.article2.id)}
                      >
                        <div
                          style={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {gap.article2.title?.slice(0, 50)}...
                        </div>
                        <div
                          style={{ fontSize: 9, color: "var(--text-muted)" }}
                        >
                          {gap.article2.year || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: 16,
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                {loadingGapAnalysis
                  ? "Анализируем связи..."
                  : "Не найдено статей с высокой схожестью без цитирований"}
              </div>
            )}
          </div>
        )}

        {/* Stats Bar */}
        <div className="graph-stats-bar">
          <div className="graph-stat-item">
            <IconChartBar size="sm" />
            <span>Узлов:</span>
            <span className="graph-stat-value">{stats.totalNodes}</span>
          </div>
          <div className="graph-stat-item">
            <IconLink size="sm" />
            <span>Связей:</span>
            <span className="graph-stat-value" style={{ color: "#10b981" }}>
              {stats.totalLinks}
            </span>
          </div>
          {stats.levelCounts && (
            <>
              {depth >= 3 &&
                stats.levelCounts.level0 !== undefined &&
                stats.levelCounts.level0 > 0 && (
                  <div className="graph-stat-item">
                    <span
                      className="legend-dot"
                      style={{ background: "#ec4899" }}
                    ></span>
                    <span>Цитируют:</span>
                    <span style={{ color: "#ec4899", fontWeight: 600 }}>
                      {stats.levelCounts.level0}
                    </span>
                  </div>
                )}
              <div className="graph-stat-item">
                <span
                  className="legend-dot"
                  style={{ background: "#3b82f6" }}
                ></span>
                <span>В проекте:</span>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>
                  {stats.levelCounts.level1}
                </span>
              </div>
              {depth >= 2 && (
                <div className="graph-stat-item">
                  <span
                    className="legend-dot"
                    style={{ background: "#f97316" }}
                  ></span>
                  <span>Ссылки:</span>
                  <span style={{ color: "#f97316", fontWeight: 600 }}>
                    {stats.levelCounts.level2}
                  </span>
                </div>
              )}
              {depth >= 3 &&
                stats.levelCounts.level3 !== undefined &&
                stats.levelCounts.level3 > 0 && (
                  <div className="graph-stat-item">
                    <span
                      className="legend-dot"
                      style={{ background: "#06b6d4" }}
                    ></span>
                    <span>Связанные:</span>
                    <span style={{ color: "#06b6d4", fontWeight: 600 }}>
                      {stats.levelCounts.level3}
                    </span>
                  </div>
                )}
            </>
          )}

          {/* P-value статьи - кнопка добавления */}
          {pValueArticlesCount > 0 && (
            <div className="graph-stat-item" style={{ marginLeft: "auto" }}>
              <span
                className="legend-dot"
                style={{ background: "#fbbf24" }}
              ></span>
              <span>С P-value:</span>
              <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                {pValueArticlesCount}
              </span>
              <button
                className="btn secondary"
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  marginLeft: 8,
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  border: "none",
                  color: "#1e293b",
                  fontWeight: 600,
                }}
                onClick={handleAddAllWithPValue}
                disabled={addingPValueArticles}
                title="Добавить все статьи с P-value в проект как кандидаты"
              >
                {addingPValueArticles ? "Добавляю..." : "+ Добавить все"}
              </button>
            </div>
          )}
        </div>

        {/* Warning if no references */}
        {depth >= 2 &&
          stats.availableReferences === 0 &&
          stats.availableCiting === 0 && (
            <div
              style={{
                padding: "12px 20px",
                background: "rgba(251, 191, 36, 0.1)",
                borderBottom: "1px solid var(--border-glass)",
                fontSize: 12,
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconExclamation size="sm" />
              Данные о ссылках не загружены. Нажмите "Обновить связи" для
              загрузки.
            </div>
          )}

        {/* Legend - New Component */}
        <GraphLegend
          nodeTypes={[
            ...(aiFoundArticleIds.size > 0
              ? [
                  {
                    id: "ai-found",
                    label: `AI найдено: ${aiFoundArticleIds.size}`,
                    color: "#00ffff",
                    description: "Статьи найденные AI-ассистентом",
                  },
                ]
              : []),
            ...(highlightPValue
              ? [
                  {
                    id: "pvalue",
                    label: "P-value",
                    color: "#fbbf24",
                    description: "Статьи со значимым P-value",
                  },
                ]
              : []),
            ...(depth >= 3
              ? [
                  {
                    id: "citing",
                    label: "Цитирующие",
                    color: "#ec4899",
                    description: "Статьи цитирующие статьи из базы",
                  },
                ]
              : []),
            {
              id: "selected",
              label: "Отобранные",
              color: "#22c55e",
              description: "Включённые в обзор статьи",
            },
            {
              id: "pubmed",
              label: "PubMed",
              color: "#3b82f6",
              description: "Кандидаты из PubMed",
            },
            {
              id: "doaj",
              label: "DOAJ",
              color: "#eab308",
              description: "Кандидаты из DOAJ",
            },
            {
              id: "wiley",
              label: "Wiley",
              color: "#8b5cf6",
              description: "Кандидаты из Wiley",
            },
            {
              id: "excluded",
              label: "Исключённые",
              color: "#ef4444",
              description: "Исключённые из обзора",
            },
            ...(depth >= 2
              ? [
                  {
                    id: "references",
                    label: "Ссылки",
                    color: "#f97316",
                    description: "Ссылки из статей проекта",
                  },
                ]
              : []),
            ...(depth >= 3
              ? [
                  {
                    id: "related",
                    label: "Связанные",
                    color: "#06b6d4",
                    description: "Связанные по цитированиям",
                  },
                ]
              : []),
          ]}
          orientation="horizontal"
          showCounts={false}
          compact={true}
          className="mx-4 my-2"
        />

        {/* Main Area: Graph + AI Panel side by side */}
        <div
          style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
        >
          {/* Graph Area */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              position: "relative",
              minHeight: 0,
            }}
          >
            {!data || data.nodes.length === 0 ? (
              <div
                className="muted"
                style={{ padding: 60, textAlign: "center" }}
              >
                <IconChartBar size="lg" className="icon-lg" />
                <p>Нет данных для графа с текущими фильтрами.</p>
              </div>
            ) : (
              <div style={{ width: "100%", height: "100%" }}>
                <ForceGraph2D
                  ref={graphRef}
                  graphData={
                    graphDataWithSemanticEdges || filteredGraphData || data
                  }
                  width={dimensions.width}
                  height={dimensions.height}
                  nodeColor={nodeColor}
                  nodeLabel={nodeLabel}
                  nodeVal={nodeVal}
                  nodeRelSize={6}
                  nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
                    // Проверка на валидность координат (могут быть undefined при инициализации)
                    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
                      return; // Пропускаем отрисовку пока координаты не определены
                    }

                    // Размер узла на основе citedByCount (логарифмическая шкала)
                    const citedByCount = node.citedByCount || 0;
                    const level = node.graphLevel ?? 1;

                    // Базовый размер зависит от цитирований - аккуратнее
                    let baseSize: number;
                    if (citedByCount === 0) {
                      baseSize = 3; // Минимальный размер
                    } else if (citedByCount <= 10) {
                      baseSize = 3 + citedByCount * 0.6; // 3-9
                    } else if (citedByCount <= 100) {
                      baseSize = 9 + Math.log10(citedByCount) * 4; // 9-17
                    } else if (citedByCount <= 1000) {
                      baseSize = 17 + Math.log10(citedByCount) * 3; // 17-26
                    } else {
                      baseSize = 26 + Math.log10(citedByCount) * 2.5; // 26-36
                    }

                    // Статьи проекта (level 1) немного крупнее
                    if (level === 1) baseSize *= 1.1;

                    const size = baseSize;
                    const isAIFound = aiFoundArticleIds.has(node.id);

                    // Цвет узла: приоритет - семантический кластер, иначе стандартный
                    const clusterColor = getNodeClusterColor(node.id);
                    const color = clusterColor || nodeColor(node);

                    // === Аккуратный, академичный стиль ===
                    // Только легкое свечение для AI-найденных
                    if (isAIFound) {
                      ctx.shadowColor = isLightTheme
                        ? "rgba(0, 180, 220, 0.5)"
                        : "rgba(0, 212, 255, 0.6)";
                      ctx.shadowBlur = 12;
                    } else if (clusterColor) {
                      // Легкое свечение для кластеризованных узлов
                      ctx.shadowColor = clusterColor + graphColors.shadowAlpha;
                      ctx.shadowBlur = isLightTheme ? 4 : 6;
                    } else if (citedByCount > 200) {
                      // Очень тонкое свечение для самых цитируемых
                      ctx.shadowColor = isLightTheme
                        ? "rgba(100, 150, 200, 0.2)"
                        : "rgba(100, 150, 200, 0.3)";
                      ctx.shadowBlur = isLightTheme ? 3 : 4;
                    }

                    // Простая чистая заливка
                    ctx.fillStyle = color;

                    // Рисуем узел
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                    ctx.fill();

                    // Сбрасываем свечение
                    ctx.shadowBlur = 0;

                    // Одна тонкая обводка для всех узлов (академичный вид)
                    ctx.strokeStyle = clusterColor
                      ? graphColors.clusterStrokeColor
                      : graphColors.strokeColor;
                    ctx.lineWidth = clusterColor ? 1.2 : 0.8;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                    ctx.stroke();

                    // Обводка для AI-найденных (заметнее, но не кричащо)
                    if (isAIFound) {
                      ctx.strokeStyle = "rgba(0, 212, 255, 0.6)";
                      ctx.lineWidth = 1.5;
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                      ctx.stroke();
                    }

                    // Звёздочка для центральных статей кластеров
                    const isCentralArticle = semanticClusters.some(
                      (c) => c.centralArticleId === node.id,
                    );
                    if (isCentralArticle) {
                      ctx.fillStyle = "#fbbf24";
                      ctx.font = `${Math.max(8, size * 0.8)}px sans-serif`;
                      ctx.textAlign = "center";
                      ctx.textBaseline = "middle";
                      ctx.fillText("⭐", node.x, node.y - size - 4);
                    }

                    // Метки для крупных узлов при масштабе
                    if (
                      showLabelsOnZoom &&
                      globalScale > 1.5 &&
                      citedByCount > 50
                    ) {
                      const label = node.label || "";
                      const fontSize = Math.max(9, 11 / globalScale);
                      ctx.font = `${fontSize}px Inter, sans-serif`;
                      ctx.fillStyle = graphColors.textColor;
                      ctx.textAlign = "center";
                      ctx.textBaseline = "top";
                      ctx.fillText(label, node.x, node.y + size + 4);
                    }
                  }}
                  linkColor={(link: any) => {
                    return link.isSemantic
                      ? `rgba(236, 72, 153, ${0.3 + (link.similarity - semanticEdgeThreshold) * 2})` // Розовый для семантических
                      : graphColors.linkColor; // Из предвычисленных цветов
                  }}
                  linkWidth={(link: any) =>
                    link.isSemantic
                      ? 1.5 + (link.similarity - semanticEdgeThreshold) * 3 // Толще для высокой схожести
                      : linkThickness === "thin"
                        ? 0.5
                        : linkThickness === "thick"
                          ? 1.5
                          : 0.8
                  }
                  linkLineDash={(link: any) =>
                    link.isSemantic ? [4, 4] : null
                  } // Пунктир для семантических
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={0.95}
                  backgroundColor={
                    isFullscreen ? graphColors.bgFullscreen : graphColors.bg
                  }
                  d3AlphaDecay={animationPaused ? 1 : 0.02}
                  d3VelocityDecay={0.35}
                  cooldownTicks={animationPaused ? 0 : 150}
                  warmupTicks={animationPaused ? 0 : 80}
                  d3AlphaMin={0.001}
                  onEngineStop={() => {}}
                  onNodeHover={(node: any) => setHoveredNode(node)}
                  onNodeClick={(node: any, event: any) => {
                    if (event?.altKey) {
                      if (node.doi) {
                        window.open(`https://doi.org/${node.doi}`, "_blank");
                      } else if (node.pmid) {
                        window.open(
                          `https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`,
                          "_blank",
                        );
                      }
                      return;
                    }
                    setSelectedNodeForDisplay(
                      selectedNodeForDisplay?.id === node.id ? null : node,
                    );
                  }}
                />

                {/* Floating controls overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    display: "flex",
                    gap: 8,
                    zIndex: 10,
                  }}
                >
                  {/* Animation toggle */}
                  <button
                    onClick={toggleAnimation}
                    className={`graph-floating-btn ${animationPaused ? "active" : ""}`}
                    title={
                      animationPaused
                        ? "Возобновить анимацию"
                        : "Заморозить граф"
                    }
                  >
                    {animationPaused ? (
                      <IconPlay size="sm" />
                    ) : (
                      <IconStop size="sm" />
                    )}
                  </button>

                  {/* Fullscreen toggle */}
                  <button
                    onClick={toggleFullscreen}
                    className="graph-floating-btn"
                    title={
                      isFullscreen
                        ? "Выйти из полноэкранного режима"
                        : "Полный экран"
                    }
                  >
                    {isFullscreen ? (
                      <IconClose size="sm" />
                    ) : (
                      <IconArrowsExpand size="sm" />
                    )}
                  </button>

                  {/* Style toggle */}
                  <button
                    onClick={() =>
                      setNodeStyle((s) =>
                        s === "default"
                          ? "gradient"
                          : s === "gradient"
                            ? "glow"
                            : "default",
                      )
                    }
                    className="graph-floating-btn"
                    title={`Стиль: ${nodeStyle}`}
                  >
                    <IconAdjustments size="sm" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Assistant Panel - Side by side with graph */}
          {showAIAssistant && (
            <div className="ai-panel-sidebar">
              {/* AI Panel Header */}
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border-glass)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background:
                    "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1))",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconSparkles size="md" className="text-purple-400" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    AI Ассистент
                  </span>
                </div>
                <button
                  onClick={() => setShowAIAssistant(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Свернуть"
                >
                  <IconChevronRight size="sm" />
                </button>
              </div>

              {/* Chat History */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {aiHistory.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      padding: 16,
                      fontSize: 12,
                    }}
                  >
                    <IconSearch
                      size="lg"
                      className="icon-lg"
                      style={{
                        margin: "0 auto 12px",
                        opacity: 0.5,
                      }}
                    />
                    <p style={{ marginBottom: 8, fontWeight: 500 }}>
                      Поиск в графе
                    </p>
                    <p style={{ fontSize: 11, marginBottom: 10, opacity: 0.9 }}>
                      AI найдёт статьи среди ссылок и цитирующих работ
                    </p>
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        textAlign: "left",
                        paddingLeft: 12,
                      }}
                    >
                      <p style={{ fontStyle: "italic", marginBottom: 4 }}>
                        💡 «Найди мета-анализы»
                      </p>
                      <p style={{ fontStyle: "italic", marginBottom: 4 }}>
                        💡 «РКИ за последние 5 лет»
                      </p>
                      {semanticClusters.length > 0 && (
                        <p style={{ fontStyle: "italic", marginBottom: 4 }}>
                          💡 «Статьи из кластера про...»
                        </p>
                      )}
                      {gapAnalysisResults.length > 0 && (
                        <p style={{ fontStyle: "italic" }}>
                          💡 «Статьи для закрытия gap...»
                        </p>
                      )}
                      {semanticClusters.length === 0 &&
                        gapAnalysisResults.length === 0 && (
                          <p style={{ fontStyle: "italic" }}>
                            💡 «Статьи про лечение»
                          </p>
                        )}
                    </div>
                    {depth < 2 && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "8px 10px",
                          background: "rgba(251, 191, 36, 0.15)",
                          borderRadius: 6,
                          fontSize: 10,
                          color: "#fbbf24",
                        }}
                      >
                        ⚠️ Для поиска нужно загрузить связи: выберите «+Ссылки»
                        или «+Цитирующие»
                      </div>
                    )}
                  </div>
                )}

                {aiHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background:
                        msg.role === "user"
                          ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                          : "var(--bg-secondary)",
                      color:
                        msg.role === "user" ? "white" : "var(--text-primary)",
                      alignSelf:
                        msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "90%",
                      fontSize: 12,
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                ))}

                {aiLoading && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--bg-secondary)",
                      alignSelf: "flex-start",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      className="loading-spinner"
                      style={{ width: 14, height: 14 }}
                    />
                    <span
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      Думаю...
                    </span>
                  </div>
                )}

                {/* Found Articles from Graph */}
                {aiFoundArticles.length > 0 && (
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(0, 255, 255, 0.1)",
                      borderRadius: 10,
                      border: "1px solid rgba(0, 255, 255, 0.3)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 12,
                          color: "#00ffff",
                        }}
                      >
                        🔍 Найдено: {aiFoundArticles.length}
                        {aiSelectedForAdd.size > 0 && (
                          <span style={{ color: "#4ade80", marginLeft: 6 }}>
                            (выбрано: {aiSelectedForAdd.size})
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={toggleSelectAll}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "none",
                            background:
                              aiSelectedForAdd.size === aiFoundArticles.length
                                ? "rgba(74, 222, 128, 0.3)"
                                : "rgba(255,255,255,0.1)",
                            color:
                              aiSelectedForAdd.size === aiFoundArticles.length
                                ? "#4ade80"
                                : "var(--text-secondary)",
                            fontSize: 10,
                            cursor: "pointer",
                          }}
                          title={
                            aiSelectedForAdd.size === aiFoundArticles.length
                              ? "Снять все"
                              : "Выбрать все"
                          }
                        >
                          {aiSelectedForAdd.size === aiFoundArticles.length
                            ? "☑ Все"
                            : "☐ Все"}
                        </button>
                        <button
                          onClick={handleAIClearHighlight}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "none",
                            background: "rgba(255,255,255,0.1)",
                            color: "var(--text-secondary)",
                            fontSize: 10,
                            cursor: "pointer",
                          }}
                          title="Сбросить подсветку"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Article List (scrollable) */}
                    <div
                      style={{
                        maxHeight: 200,
                        overflowY: "auto",
                        marginBottom: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {aiFoundArticles.slice(0, 20).map((article, idx) => {
                        const isSelected = aiSelectedForAdd.has(article.id);
                        return (
                          <div
                            key={article.id}
                            onClick={() => toggleArticleSelection(article.id)}
                            style={{
                              padding: "8px 10px",
                              background: isSelected
                                ? "rgba(74, 222, 128, 0.15)"
                                : "var(--bg-primary)",
                              borderRadius: 6,
                              borderLeft: `3px solid ${isSelected ? "#4ade80" : "#00ffff"}`,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 14,
                                  color: isSelected
                                    ? "#4ade80"
                                    : "var(--text-secondary)",
                                  flexShrink: 0,
                                  marginTop: 1,
                                }}
                              >
                                {isSelected ? "☑" : "☐"}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    fontSize: 11,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {idx + 1}.{" "}
                                  {article.title?.substring(0, 70) ||
                                    article.id}
                                  {article.title && article.title.length > 70
                                    ? "..."
                                    : ""}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "var(--text-secondary)",
                                    marginTop: 4,
                                    display: "flex",
                                    gap: 8,
                                  }}
                                >
                                  {article.year && (
                                    <span>📅 {article.year}</span>
                                  )}
                                  {article.citedByCount ? (
                                    <span>📊 {article.citedByCount} цит.</span>
                                  ) : null}
                                </div>
                                {article.reason && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: "#00ffff",
                                      marginTop: 4,
                                      fontStyle: "italic",
                                    }}
                                  >
                                    💡 {article.reason.substring(0, 80)}
                                    {article.reason.length > 80 ? "..." : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {aiFoundArticles.length > 20 && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            textAlign: "center",
                            padding: 4,
                          }}
                        >
                          ... и ещё {aiFoundArticles.length - 20} статей
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleAIAddSelectedArticles("candidate")}
                        disabled={aiAddingArticles}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: aiAddingArticles
                            ? "var(--bg-secondary)"
                            : "linear-gradient(135deg, #3b82f6, #2563eb)",
                          color: "white",
                          fontWeight: 600,
                          fontSize: 11,
                          cursor: aiAddingArticles ? "not-allowed" : "pointer",
                        }}
                        title={
                          aiSelectedForAdd.size > 0
                            ? `Добавить ${aiSelectedForAdd.size} выбранных в Кандидаты`
                            : `Добавить все ${aiFoundArticles.length} в Кандидаты`
                        }
                      >
                        {aiAddingArticles
                          ? "..."
                          : aiSelectedForAdd.size > 0
                            ? `+ ${aiSelectedForAdd.size} в Кандидаты`
                            : "+ Все в Кандидаты"}
                      </button>
                      <button
                        onClick={() => handleAIAddSelectedArticles("selected")}
                        disabled={aiAddingArticles}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: aiAddingArticles
                            ? "var(--bg-secondary)"
                            : "linear-gradient(135deg, #22c55e, #16a34a)",
                          color: "white",
                          fontWeight: 600,
                          fontSize: 11,
                          cursor: aiAddingArticles ? "not-allowed" : "pointer",
                        }}
                        title={
                          aiSelectedForAdd.size > 0
                            ? `Добавить ${aiSelectedForAdd.size} выбранных в Отобранные`
                            : `Добавить все ${aiFoundArticles.length} в Отобранные`
                        }
                      >
                        {aiAddingArticles
                          ? "..."
                          : aiSelectedForAdd.size > 0
                            ? `+ ${aiSelectedForAdd.size} в Отобранные`
                            : "+ Все в Отобранные"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div
                style={{
                  padding: 12,
                  borderTop: "1px solid var(--border-glass)",
                  background: "var(--bg-secondary)",
                  flexShrink: 0,
                }}
              >
                {aiError && (
                  <div
                    style={{
                      marginBottom: 8,
                      padding: "8px 10px",
                      background: "rgba(239, 68, 68, 0.1)",
                      borderRadius: 6,
                      fontSize: 11,
                      color: "#ef4444",
                    }}
                  >
                    {aiError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleAISend()
                    }
                    placeholder="Искать в графе..."
                    disabled={aiLoading}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border-glass)",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                    }}
                  />
                  <button
                    onClick={handleAISend}
                    disabled={aiLoading || !aiMessage.trim()}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: aiLoading
                        ? "var(--bg-secondary)"
                        : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                      color: "white",
                      cursor: aiLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    <IconSend size="sm" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Node Info Modal Popup */}
        {selectedNodeForDisplay && (
          <div
            className="node-info-modal-overlay"
            onClick={() => setSelectedNodeForDisplay(null)}
          >
            <div
              className="node-info-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="node-info-modal-close"
                onClick={() => setSelectedNodeForDisplay(null)}
              >
                <IconClose size="md" />
              </button>
              <NodeInfoPanel
                node={selectedNodeForDisplay}
                projectId={projectId}
                onRefresh={() => loadGraph(getGraphOptions())}
                globalLang={globalLang}
              />
            </div>
          </div>
        )}

        {/* Recommendations Modal */}
        {showRecommendations && (
          <div
            className="node-info-modal-overlay"
            onClick={() => setShowRecommendations(false)}
          >
            <div
              className="node-info-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 700 }}
            >
              <button
                className="node-info-modal-close"
                onClick={() => setShowRecommendations(false)}
              >
                <IconClose size="md" />
              </button>

              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 20,
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ color: "#f59e0b" }}>
                  <IconSparkles size="md" />
                </span>
                Рекомендации по улучшению графа
              </h3>

              {recommendations.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ opacity: 0.5, marginBottom: 12 }}>
                    <IconCheckBadge size="lg" />
                  </div>
                  <p>Отлично! Граф в хорошем состоянии, рекомендаций нет.</p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        background:
                          rec.priority === "high"
                            ? "rgba(239, 68, 68, 0.1)"
                            : rec.priority === "medium"
                              ? "rgba(249, 115, 22, 0.1)"
                              : "rgba(59, 130, 246, 0.1)",
                        border: `1px solid ${
                          rec.priority === "high"
                            ? "rgba(239, 68, 68, 0.3)"
                            : rec.priority === "medium"
                              ? "rgba(249, 115, 22, 0.3)"
                              : "rgba(59, 130, 246, 0.3)"
                        }`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            background:
                              rec.priority === "high"
                                ? "#ef4444"
                                : rec.priority === "medium"
                                  ? "#f97316"
                                  : "#3b82f6",
                            color: "white",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            flexShrink: 0,
                          }}
                        >
                          {rec.priority === "high"
                            ? "Важно"
                            : rec.priority === "medium"
                              ? "Средне"
                              : "Низко"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            {rec.title}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--text-muted)",
                              marginBottom: 10,
                            }}
                          >
                            {rec.description}
                          </div>
                          {rec.action &&
                            rec.action.type === "fetch_references" && (
                              <button
                                className="btn secondary"
                                style={{ fontSize: 12, padding: "6px 12px" }}
                                onClick={() => {
                                  setShowRecommendations(false);
                                  handleFetchReferences();
                                }}
                              >
                                <IconRefresh size="sm" />
                                <span style={{ marginLeft: 6 }}>
                                  Загрузить ссылки ({rec.action.count})
                                </span>
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cluster Detail Modal */}
        {clusterDetailModal && (
          <div
            className="node-info-modal-overlay"
            onClick={() => setClusterDetailModal(null)}
          >
            <div
              className="node-info-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 700,
                maxHeight: "80vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                className="node-info-modal-close"
                onClick={() => setClusterDetailModal(null)}
              >
                <IconClose size="md" />
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: clusterDetailModal.cluster.color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    {clusterDetailModal.cluster.name}
                  </h3>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {clusterDetailModal.cluster.articleCount} статей в кластере
                  </div>
                </div>
              </div>

              {/* Keywords */}
              {clusterDetailModal.cluster.keywords.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    Ключевые слова:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {clusterDetailModal.cluster.keywords.map(
                      (kw: string, i: number) => (
                        <span
                          key={i}
                          style={{
                            background: clusterDetailModal.cluster.color + "20",
                            color: clusterDetailModal.cluster.color,
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {kw}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Central Article */}
              {clusterDetailModal.cluster.centralArticleTitle && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    background: "var(--bg-tertiary)",
                    borderRadius: 8,
                    borderLeft: `4px solid ${clusterDetailModal.cluster.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    ⭐ Центральная статья кластера:
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {clusterDetailModal.cluster.centralArticleTitle}
                  </div>
                </div>
              )}

              {/* Articles List */}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Все статьи кластера:</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={selectAllClusterArticles}
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      borderRadius: 4,
                      border: "1px solid var(--border-glass)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    Выбрать все
                  </button>
                  {selectedClusterArticles.size > 0 && (
                    <button
                      onClick={deselectAllClusterArticles}
                      style={{
                        padding: "4px 8px",
                        fontSize: 11,
                        borderRadius: 4,
                        border: "1px solid var(--border-glass)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      Снять выбор ({selectedClusterArticles.size})
                    </button>
                  )}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  border: "1px solid var(--border-glass)",
                  borderRadius: 8,
                }}
              >
                {loadingClusterDetails ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Загрузка статей...
                  </div>
                ) : (
                  clusterDetailModal.articles.map(
                    (
                      article: {
                        id: string;
                        title: string;
                        year: number | null;
                        authors: string | null;
                        status?: string;
                        pmid?: string | null;
                        doi?: string | null;
                      },
                      idx: number,
                    ) => {
                      const isSelected = selectedClusterArticles.has(
                        article.id,
                      );
                      const articleStatus = article.status || "candidate";
                      return (
                        <div
                          key={article.id}
                          style={{
                            padding: "10px 14px",
                            borderBottom:
                              idx < clusterDetailModal.articles.length - 1
                                ? "1px solid var(--border-glass)"
                                : "none",
                            cursor: "pointer",
                            transition: "background 0.15s",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            background: isSelected
                              ? "rgba(59, 130, 246, 0.1)"
                              : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background =
                                "var(--bg-tertiary)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleClusterArticleSelection(article.id)
                            }
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 16,
                              height: 16,
                              marginTop: 4,
                              cursor: "pointer",
                              accentColor: "#3b82f6",
                            }}
                          />
                          <span
                            onClick={() => {
                              // Find and highlight this article on the graph
                              const node = data?.nodes.find(
                                (n) => n.id === article.id,
                              ) as
                                | (GraphNode & { x?: number; y?: number })
                                | undefined;
                              if (
                                node &&
                                graphRef.current &&
                                node.x !== undefined &&
                                node.y !== undefined
                              ) {
                                graphRef.current.centerAt(node.x, node.y, 500);
                                graphRef.current.zoom(2, 500);
                                setSelectedNodeForDisplay(node);
                              }
                            }}
                            style={{
                              minWidth: 24,
                              height: 24,
                              borderRadius: "50%",
                              background:
                                article.id ===
                                clusterDetailModal.cluster.centralArticleId
                                  ? clusterDetailModal.cluster.color
                                  : "var(--bg-secondary)",
                              color:
                                article.id ===
                                clusterDetailModal.cluster.centralArticleId
                                  ? "white"
                                  : "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {article.id ===
                            clusterDetailModal.cluster.centralArticleId
                              ? "⭐"
                              : idx + 1}
                          </span>
                          <div
                            onClick={() => {
                              // Find and highlight this article on the graph
                              const node = data?.nodes.find(
                                (n) => n.id === article.id,
                              ) as
                                | (GraphNode & { x?: number; y?: number })
                                | undefined;
                              if (
                                node &&
                                graphRef.current &&
                                node.x !== undefined &&
                                node.y !== undefined
                              ) {
                                graphRef.current.centerAt(node.x, node.y, 500);
                                graphRef.current.zoom(2, 500);
                                setSelectedNodeForDisplay(node);
                              }
                            }}
                            style={{ flex: 1, minWidth: 0 }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                marginBottom: 4,
                                lineHeight: 1.4,
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                              }}
                            >
                              <span style={{ flex: 1 }}>{article.title}</span>
                              {/* Status badge */}
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  flexShrink: 0,
                                  background:
                                    articleStatus === "selected"
                                      ? "rgba(34, 197, 94, 0.2)"
                                      : articleStatus === "excluded"
                                        ? "rgba(239, 68, 68, 0.2)"
                                        : "rgba(59, 130, 246, 0.2)",
                                  color:
                                    articleStatus === "selected"
                                      ? "#22c55e"
                                      : articleStatus === "excluded"
                                        ? "#ef4444"
                                        : "#3b82f6",
                                }}
                              >
                                {articleStatus === "selected"
                                  ? "Отобрана"
                                  : articleStatus === "excluded"
                                    ? "Исключена"
                                    : "Кандидат"}
                              </span>
                            </div>
                            {article.authors && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-muted)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {article.authors}
                              </div>
                            )}
                            {article.year && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                  background: "var(--bg-secondary)",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  marginTop: 4,
                                  display: "inline-block",
                                }}
                              >
                                {article.year}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>

              {/* Actions for selected articles */}
              {selectedClusterArticles.size > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "rgba(59, 130, 246, 0.1)",
                    borderRadius: 8,
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 10,
                    }}
                  >
                    Выбрано статей:{" "}
                    <strong>{selectedClusterArticles.size}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleAddClusterArticles("selected")}
                      disabled={addingFromCluster}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: "#22c55e",
                        color: "white",
                        cursor: addingFromCluster ? "wait" : "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        opacity: addingFromCluster ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {addingFromCluster ? (
                        <>Добавляем...</>
                      ) : (
                        <>
                          <IconCheck size="sm" />В отобранные
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAddClusterArticles("candidate")}
                      disabled={addingFromCluster}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: "#3b82f6",
                        color: "white",
                        cursor: addingFromCluster ? "wait" : "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        opacity: addingFromCluster ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {addingFromCluster ? (
                        <>Добавляем...</>
                      ) : (
                        <>
                          <IconPlus size="sm" />В кандидаты
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    // Filter graph to show only this cluster
                    filterBySemanticCluster(clusterDetailModal.cluster.id);
                    setClusterDetailModal(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: clusterDetailModal.cluster.color,
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Показать только этот кластер
                </button>
                <button
                  onClick={() => setClusterDetailModal(null)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border-glass)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How it works Modal */}
        {showHelpModal && (
          <div
            className="node-info-modal-overlay"
            onClick={() => setShowHelpModal(false)}
          >
            <div
              className="node-info-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 600 }}
            >
              <button
                className="node-info-modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                <IconClose className="icon-md" />
              </button>

              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 20,
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <IconInfoCircle size="md" style={{ color: "#3b82f6" }} />
                Как работает граф цитирований
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconCircleStack size="sm" style={{ color: "#3b82f6" }} />
                    <strong>Узлы (статьи)</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Каждый узел — это статья. Размер узла зависит от количества
                    цитирований: чем больше цитирований, тем крупнее узел.
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconArrowRight size="sm" style={{ color: "#3b82f6" }} />
                    <strong>Стрелки (связи)</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Стрелки показывают направление цитирования: от цитирующей
                    статьи к цитируемой.
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconAdjustments size="sm" style={{ color: "#3b82f6" }} />
                    <strong>Цвета узлов</strong>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#22c55e",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span>Зелёный — отобранные статьи</span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#3b82f6",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span>Синий — PubMed (кандидаты)</span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#eab308",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span>Жёлтый — DOAJ (кандидаты)</span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#8b5cf6",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span>Фиолетовый — Wiley (кандидаты)</span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#ef4444",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span>Красный — исключённые</span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#f97316",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span>Оранжевый — ссылки (references)</span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#ec4899",
                          flexShrink: 0,
                        }}
                      ></span>
                      <span>Розовый — статьи, цитирующие вашу базу</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconPlay size="sm" style={{ color: "#3b82f6" }} />
                    <strong>Действия</strong>
                  </div>
                  <div style={{ marginTop: 6, color: "var(--text-secondary)" }}>
                    <p style={{ margin: "4px 0" }}>
                      • <strong>Клик</strong> — показать информацию о статье
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      • <strong>Alt + клик</strong> — открыть статью в
                      PubMed/DOI
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      • <strong>Перетаскивание</strong> — перемещать узлы
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      • <strong>Колёсико мыши</strong> — масштабирование
                    </p>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconRefresh size="sm" style={{ color: "#3b82f6" }} />
                    <strong>Загрузка связей</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Нажмите «Обновить связи» для загрузки информации о ссылках и
                    цитированиях. Для PubMed статей данные берутся из PubMed
                    API, для DOAJ/Wiley — из Crossref по DOI. Это позволяет
                    видеть, на какие статьи ссылаются ваши работы.
                  </p>
                </div>

                {/* Семантический поиск */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border-glass)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconSearch size="sm" style={{ color: "#10b981" }} />
                    <strong>Семантический поиск (Сем.)</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Поиск статей по смыслу с помощью AI-эмбеддингов. Находит
                    похожие статьи даже без прямых цитирований. Сначала создайте
                    эмбеддинги для статей, затем используйте поиск.
                  </p>
                </div>

                {/* Семантические кластеры */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconGraph size="sm" style={{ color: "#6366f1" }} />
                    <strong>Семантические кластеры (Кластеры)</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Автоматическая группировка статей по тематике с помощью
                    K-Means кластеризации эмбеддингов. Каждый кластер получает
                    название, цвет и центральную (наиболее типичную) статью.
                    Кликните на кластер, чтобы увидеть все его статьи.
                  </p>
                </div>

                {/* Gap Analysis */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconExclamation size="sm" style={{ color: "#f59e0b" }} />
                    <strong>Анализ пробелов (Gaps)</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Находит "мосты" между кластерами — статьи, которые
                    семантически близки к нескольким тематическим группам.
                    Помогает выявить междисциплинарные работы и потенциальные
                    пробелы в вашем обзоре.
                  </p>
                </div>

                {/* Методологический фильтр */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconFilter size="sm" style={{ color: "#ec4899" }} />
                    <strong>Методологический фильтр (Метод.)</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Фильтрация статей по типу исследования: мета-анализы, РКИ
                    (рандомизированные контролируемые исследования),
                    систематические обзоры, когортные исследования и другие. Тип
                    определяется автоматически по названию и аннотации.
                  </p>
                </div>

                {/* AI рекомендации */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconSparkles size="sm" style={{ color: "#8b5cf6" }} />
                    <strong>AI-помощник</strong>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Умный поиск статей с помощью нейросетей. Опишите, что ищете,
                    и AI найдёт релевантные статьи в вашем графе, а также
                    предложит рекомендации по улучшению обзора.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                style={{
                  marginTop: 24,
                  width: "100%",
                  padding: "12px",
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </div>
      {/* End Main Content Area */}
    </div>
  );
}
