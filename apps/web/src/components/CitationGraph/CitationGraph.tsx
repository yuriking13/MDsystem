import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
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
import ArticleCard, {
  type ArticleAuthor,
  type ArticleData,
} from "../ArticleCard";
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

type GraphLinkWithSemantic = GraphLink & {
  isSemantic?: boolean;
  similarity?: number;
};

type GraphAIDebugPayload = {
  receivedArticles?: number;
  externalArticles?: number;
  articlesForAICount?: number;
};

type FetchReferencesRecommendationAction = {
  type: "fetch_references";
  count?: number;
};

type ForceGraphD3ChargeForce = {
  strength: (value: number) => {
    distanceMax?: (value: number) => void;
  };
  distanceMax?: (value: number) => void;
};

type ForceGraphD3LinkForce = {
  distance: (value: number) => void;
};

type GraphForceHandle = ForceGraphMethods<
  NodeObject<GraphNodeWithCoords>,
  LinkObject<GraphNodeWithCoords, GraphLink>
>;

const isForceGraphD3ChargeForce = (
  force: unknown,
): force is ForceGraphD3ChargeForce =>
  typeof force === "function" &&
  typeof (force as { strength?: unknown }).strength === "function";

const isForceGraphD3LinkForce = (
  force: unknown,
): force is ForceGraphD3LinkForce =>
  typeof force === "function" &&
  typeof (force as { distance?: unknown }).distance === "function";

const isFetchReferencesRecommendationAction = (
  action: unknown,
): action is FetchReferencesRecommendationAction =>
  typeof action === "object" &&
  action !== null &&
  (action as { type?: unknown }).type === "fetch_references";

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
  const [hoveredNode, setHoveredNode] = useState<GraphNodeWithCoords | null>(
    null,
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const hoverPositionRef = useRef<{ x: number; y: number } | null>(null);
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
  const [showExportMenu, setShowExportMenu] = useState(false);

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
    articles: ClusterArticleDetail[];
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
    // Пастельные цвета для светлой темы (тёплая палитра Papaya Whip)
    const pastelColors = {
      citing: "#F5BA5C", // золотой
      selected: "#A3D9A5", // мятно-зелёный
      excluded: "#E8A59A", // тёплый коралл
      candidatePubmed: "#D99A3A", // насыщенный золотой
      candidateDoaj: "#FFEFD5", // кремовый (papaya whip)
      candidateWiley: "#C4A6D4", // лавандовый
      reference: "#FFD48A", // светло-золотой
      related: "#B8D4D0", // серо-мятный
      aiFound: "#C87D2A", // тёплый янтарный
      pvalue: "#FFE4B8", // бледно-золотой
      default: "#E0D6CA", // тёплый нейтральный
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
      bg: isLightTheme ? "#FDFCFB" : "#0b0f19",
      bgFullscreen: isLightTheme ? "#FFF8EC" : "#050810",
      linkColor: isLightTheme
        ? "rgba(140, 122, 107, 0.4)"
        : "rgba(100, 130, 180, 0.25)",
      strokeColor: isLightTheme
        ? "rgba(107, 92, 77, 0.2)"
        : "rgba(255, 255, 255, 0.15)",
      clusterStrokeColor: isLightTheme
        ? "rgba(107, 92, 77, 0.35)"
        : "rgba(255, 255, 255, 0.3)",
      textColor: isLightTheme
        ? "rgba(45, 31, 16, 0.8)"
        : "rgba(255, 255, 255, 0.7)",
      shadowAlpha: isLightTheme ? "40" : "60",
      // Цвета узлов
      ...nodeColors,
    };
  }, [isLightTheme]);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphAreaRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphForceHandle>();
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

  useEffect(() => {
    if (!showExportMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportMenu]);

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
    } finally {
      setShowExportMenu(false);
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
        .filter((article): article is ClusterArticleDetail => article !== null);

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
    const allIds = clusterDetailModal.articles.map((article) => article.id);
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
      const selectedArticles = clusterDetailModal.articles.filter((article) =>
        selectedClusterArticles.has(article.id),
      );
      const pmids = selectedArticles
        .filter((article): article is ClusterArticleDetail & { pmid: string } =>
          Boolean(article.pmid),
        )
        .map((article) => article.pmid);
      const dois = selectedArticles
        .filter(
          (
            article,
          ): article is ClusterArticleDetail & { pmid: null; doi: string } =>
            !article.pmid && Boolean(article.doi),
        )
        .map((article) => article.doi);

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

  // Resize observer - dynamically calculate graph dimensions from actual graph area
  useEffect(() => {
    const updateSize = () => {
      if (graphAreaRef.current) {
        const rect = graphAreaRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: Math.max(Math.floor(rect.width), 400),
            height: Math.max(Math.floor(rect.height), 300),
          });
        }
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: Math.max(Math.floor(rect.width), 400),
            height: Math.max(Math.floor(rect.height), 300),
          });
        }
      }
    };

    // Initial calculation + delayed recalc to catch layout settling
    updateSize();
    const raf = requestAnimationFrame(() => {
      updateSize();
      // One more delayed update for slow layout paints
      setTimeout(updateSize, 100);
    });

    window.addEventListener("resize", updateSize);

    // Observe both refs if available
    const resizeObserver = new ResizeObserver(updateSize);
    if (graphAreaRef.current) {
      resizeObserver.observe(graphAreaRef.current);
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateSize);
      resizeObserver.disconnect();
    };
  }, [showAIAssistant, isFullscreen, loading, data]);

  // Настройка сил графа после загрузки данных
  useEffect(() => {
    if (!graphRef.current || !data) return;

    // Увеличиваем силу отталкивания для разреженного графа
    const fg = graphRef.current;
    if (typeof fg.d3Force === "function") {
      // Настраиваем силу отталкивания (charge)
      const charge = fg.d3Force("charge");
      if (isForceGraphD3ChargeForce(charge)) {
        const charged = charge.strength(-400);
        if (charged && typeof charged.distanceMax === "function") {
          charged.distanceMax(600);
        } else if (typeof charge.distanceMax === "function") {
          charge.distanceMax(600);
        }
      }

      // Настраиваем расстояние связей
      const link = fg.d3Force("link");
      if (isForceGraphD3LinkForce(link)) {
        link.distance(120);
      }

      // Ослабляем центральную силу
      const center = fg.d3Force("center");
      if (center) {
        // Можно настроить если нужно
      }

      // Перезапускаем симуляцию
      fg.d3ReheatSimulation?.();
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

  const nodeLabel = useCallback(() => "", []);

  const clearHoverCard = useCallback(() => {
    setHoveredNode(null);
    setHoverPosition(null);
  }, []);

  const handleGraphMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!graphAreaRef.current) return;
      const rect = graphAreaRef.current.getBoundingClientRect();
      const pos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      hoverPositionRef.current = pos;
      if (hoveredNode) {
        setHoverPosition(pos);
      }
    },
    [hoveredNode],
  );

  const handleNodeHover = useCallback(
    (node: GraphNodeWithCoords | null) => {
      if (!node) {
        clearHoverCard();
        return;
      }
      setHoveredNode(node);
      if (hoverPositionRef.current) {
        setHoverPosition(hoverPositionRef.current);
      }
    },
    [clearHoverCard],
  );

  const normalizeStatus = useCallback(
    (status?: string, graphLevel?: number): ArticleData["status"] => {
      const normalized = (status || "").toLowerCase();
      if (
        normalized === "candidate" ||
        normalized === "selected" ||
        normalized === "excluded" ||
        normalized === "deleted"
      ) {
        return normalized as ArticleData["status"];
      }
      if (graphLevel !== undefined && graphLevel !== 1) {
        return "candidate";
      }
      return "candidate";
    },
    [],
  );

  const normalizeSource = useCallback(
    (source?: string): ArticleData["source"] => {
      const normalized = (source || "").toLowerCase();
      if (
        normalized === "doaj" ||
        normalized === "wiley" ||
        normalized === "pubmed"
      ) {
        return normalized as ArticleData["source"];
      }
      return "pubmed";
    },
    [],
  );

  const normalizeAuthors = useCallback(
    (authors?: string | string[]): ArticleAuthor[] => {
      if (!authors) return [];
      const list = Array.isArray(authors) ? authors : authors.split(/,|;/);
      return list
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    },
    [],
  );

  const hoverCardArticle = useMemo<ArticleData | null>(() => {
    if (!hoveredNode) return null;
    const year =
      hoveredNode.year !== null && hoveredNode.year !== undefined
        ? hoveredNode.year
        : new Date().getFullYear();

    return {
      id: hoveredNode.id,
      pmid: hoveredNode.pmid || undefined,
      doi: hoveredNode.doi || undefined,
      title: hoveredNode.title || hoveredNode.label || "Untitled",
      titleRu: hoveredNode.title_ru || undefined,
      authors: normalizeAuthors(hoveredNode.authors),
      journal: hoveredNode.journal || undefined,
      year,
      abstract: hoveredNode.abstract || undefined,
      abstractRu: hoveredNode.abstract_ru || undefined,
      publicationType: undefined,
      status: normalizeStatus(hoveredNode.status, hoveredNode.graphLevel),
      sourceQuery: undefined,
      source: normalizeSource(hoveredNode.source),
      citationCount: hoveredNode.citedByCount,
      hasFullText: undefined,
      hasFreeFullText: undefined,
      stats:
        hoveredNode.statsQuality && hoveredNode.statsQuality > 0
          ? { hasStatistics: true }
          : undefined,
      tags: undefined,
      notes: undefined,
    };
  }, [hoveredNode, normalizeAuthors, normalizeSource, normalizeStatus]);

  const hoverCardPosition = useMemo(() => {
    if (!hoverPosition) return null;
    const cardWidth = 360;
    const cardHeight = 320;
    const padding = 16;

    let x = hoverPosition.x + padding;
    let y = hoverPosition.y + padding;

    if (x + cardWidth > dimensions.width) {
      x = hoverPosition.x - cardWidth - padding;
    }
    if (y + cardHeight > dimensions.height) {
      y = hoverPosition.y - cardHeight - padding;
    }

    return {
      x: Math.max(padding, x),
      y: Math.max(padding, y),
    };
  }, [hoverPosition, dimensions.width, dimensions.height]);

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
        const maybeDebug = (res as Record<string, unknown>)["_debug"];
        const debug =
          typeof maybeDebug === "object" && maybeDebug !== null
            ? (maybeDebug as GraphAIDebugPayload)
            : undefined;
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
      const pmids = aiFoundArticles
        .map((a) => a.pmid)
        .filter(
          (pmid): pmid is string => typeof pmid === "string" && pmid.length > 0,
        );
      const dois = aiFoundArticles
        .filter((a) => !a.pmid)
        .map((a) => a.doi)
        .filter(
          (doi): doi is string => typeof doi === "string" && doi.length > 0,
        );

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
      const pmids = articlesToAdd
        .map((a) => a.pmid)
        .filter(
          (pmid): pmid is string => typeof pmid === "string" && pmid.length > 0,
        );
      const dois = articlesToAdd
        .filter((a) => !a.pmid)
        .map((a) => a.doi)
        .filter(
          (doi): doi is string => typeof doi === "string" && doi.length > 0,
        );

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

      const pmids = articlesToAdd
        .map((n) => n.pmid)
        .filter(
          (pmid): pmid is string => typeof pmid === "string" && pmid.length > 0,
        );
      const dois = articlesToAdd
        .filter((n) => !n.pmid)
        .map((n) => n.doi)
        .filter(
          (doi): doi is string => typeof doi === "string" && doi.length > 0,
        );

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

  const graphHeaderBadgeBaseStyle: React.CSSProperties = {
    color: "white",
    borderRadius: 10,
    padding: "1px 5px",
    fontSize: 9,
    fontWeight: 600,
  };
  const semanticClusterDetailsButtonBaseStyle: React.CSSProperties = {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 4,
    border: "none",
    color: "inherit",
    cursor: "pointer",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const semanticClusterDotBaseStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  };
  const semanticClusterCountBaseStyle: React.CSSProperties = {
    padding: "2px 6px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
  };
  const semanticClusterCentralTitleBaseStyle: React.CSSProperties = {
    fontSize: 9,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
  };
  const semanticClusterKeywordsBaseStyle: React.CSSProperties = {
    fontSize: 9,
  };
  const gapAnalyzeButtonBaseStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "6px 16px",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    transition: "all 0.2s ease",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };
  const aiFoundArticlesWrapStyle: React.CSSProperties = {
    padding: 12,
    background: "rgba(0, 255, 255, 0.1)",
    borderRadius: 10,
    border: "1px solid rgba(0, 255, 255, 0.3)",
  };
  const aiFoundArticlesHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  };
  const aiFoundArticlesTitleStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 12,
    color: "#00ffff",
  };
  const aiFoundArticlesSelectedCountStyle: React.CSSProperties = {
    color: "#4ade80",
    marginLeft: 6,
  };
  const aiFoundHeaderActionsStyle: React.CSSProperties = {
    display: "flex",
    gap: 4,
  };
  const aiFoundActionButtonBaseStyle: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 4,
    border: "none",
    fontSize: 10,
    cursor: "pointer",
  };
  const aiFoundListStyle: React.CSSProperties = {
    maxHeight: 200,
    overflowY: "auto",
    marginBottom: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };
  const aiFoundItemInnerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  };
  const aiFoundItemCheckboxStyleBase: React.CSSProperties = {
    fontSize: 14,
    flexShrink: 0,
    marginTop: 1,
  };
  const aiFoundItemContentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };
  const aiFoundItemTitleStyle: React.CSSProperties = {
    fontWeight: 500,
    fontSize: 11,
    lineHeight: 1.3,
  };
  const aiFoundItemMetaStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--text-secondary)",
    marginTop: 4,
    display: "flex",
    gap: 8,
  };
  const aiFoundItemReasonStyle: React.CSSProperties = {
    fontSize: 10,
    color: "#00ffff",
    marginTop: 4,
    fontStyle: "italic",
  };
  const aiFoundRemainderStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--text-muted)",
    textAlign: "center",
    padding: 4,
  };
  const aiFoundButtonsRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 6,
  };
  const aiFoundAddButtonBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 6,
    border: "none",
    color: "white",
    fontWeight: 600,
    fontSize: 11,
  };
  const aiInputPanelStyle: React.CSSProperties = {
    padding: 12,
    borderTop: "1px solid var(--border-glass)",
    background: "var(--bg-secondary)",
    flexShrink: 0,
  };
  const aiInputErrorStyle: React.CSSProperties = {
    marginBottom: 8,
    padding: "8px 10px",
    background: "rgba(239, 68, 68, 0.1)",
    borderRadius: 6,
    fontSize: 11,
    color: "#ef4444",
  };
  const aiInputRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 6,
  };
  const aiMessageInputStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid var(--border-glass)",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    fontSize: 12,
  };
  const recommendationsModalStyle: React.CSSProperties = {
    maxWidth: 700,
  };
  const recommendationsTitleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: 20,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
  const recommendationsSparkleIconStyle: React.CSSProperties = {
    color: "#f59e0b",
  };
  const recommendationsEmptyStateStyle: React.CSSProperties = {
    padding: 40,
    textAlign: "center",
    color: "var(--text-muted)",
  };
  const recommendationsEmptyIconStyle: React.CSSProperties = {
    opacity: 0.5,
    marginBottom: 12,
  };
  const recommendationsListStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
  const recommendationCardBodyStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  };
  const recommendationTextWrapStyle: React.CSSProperties = {
    flex: 1,
  };
  const recommendationTitleStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: 6,
  };
  const recommendationDescriptionStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--text-muted)",
    marginBottom: 10,
  };
  const recommendationActionButtonStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "6px 12px",
  };
  const recommendationActionIconSpacingStyle: React.CSSProperties = {
    marginLeft: 6,
  };
  const clusterDetailModalStyle: React.CSSProperties = {
    maxWidth: 700,
    maxHeight: "80vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };
  const clusterDetailHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  };
  const clusterDetailColorDotBaseStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: "50%",
    flexShrink: 0,
  };
  const clusterDetailTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 18,
  };
  const clusterDetailMetaStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 4,
  };
  const clusterDetailKeywordsSectionStyle: React.CSSProperties = {
    marginBottom: 16,
  };
  const clusterDetailKeywordsLabelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-muted)",
    marginBottom: 6,
  };
  const clusterDetailKeywordsWrapStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  };
  const clusterDetailCentralCardBaseStyle: React.CSSProperties = {
    marginBottom: 16,
    padding: 12,
    background: "var(--bg-tertiary)",
    borderRadius: 8,
  };
  const clusterDetailCentralLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-muted)",
    marginBottom: 4,
  };
  const clusterDetailCentralTitleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
  };
  const clusterDetailListHeaderStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-muted)",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };
  const clusterDetailListHeaderActionsStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
  };
  const clusterDetailHeaderButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid var(--border-glass)",
    background: "var(--bg-secondary)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  };
  const clusterDetailListContainerStyle: React.CSSProperties = {
    flex: 1,
    overflow: "auto",
    border: "1px solid var(--border-glass)",
    borderRadius: 8,
  };
  const clusterDetailLoadingStyle: React.CSSProperties = {
    padding: 20,
    textAlign: "center",
    color: "var(--text-muted)",
  };
  const clusterDetailItemCheckboxStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    marginTop: 4,
    cursor: "pointer",
    accentColor: "#3b82f6",
  };
  const clusterDetailItemIndexBaseStyle: React.CSSProperties = {
    minWidth: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 600,
    flexShrink: 0,
  };
  const clusterDetailItemContentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };
  const clusterDetailItemTitleRowStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 4,
    lineHeight: 1.4,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  };
  const clusterDetailItemTitleTextStyle: React.CSSProperties = {
    flex: 1,
  };
  const clusterDetailStatusBadgeBaseStyle: React.CSSProperties = {
    fontSize: 9,
    padding: "2px 6px",
    borderRadius: 4,
    fontWeight: 600,
    textTransform: "uppercase",
    flexShrink: 0,
  };
  const clusterDetailAuthorsStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const clusterDetailYearStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--text-muted)",
    background: "var(--bg-secondary)",
    padding: "2px 6px",
    borderRadius: 4,
    marginTop: 4,
    display: "inline-block",
  };
  const clusterDetailSelectedActionsStyle: React.CSSProperties = {
    marginTop: 12,
    padding: 12,
    background: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    border: "1px solid rgba(59, 130, 246, 0.3)",
  };
  const clusterDetailSelectedMetaStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 10,
  };
  const clusterDetailSelectedButtonsStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
  };
  const clusterDetailSelectedButtonBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    color: "white",
    fontSize: 12,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
  const clusterDetailFooterActionsStyle: React.CSSProperties = {
    marginTop: 16,
    display: "flex",
    gap: 10,
  };
  const clusterDetailCloseButtonStyle: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid var(--border-glass)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: 13,
  };
  const helpModalStyle: React.CSSProperties = {
    maxWidth: 600,
  };
  const helpTitleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: 20,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
  const helpContentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    fontSize: 14,
    lineHeight: 1.6,
  };
  const helpSectionHeadingStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text-primary)",
  };
  const helpSectionParagraphStyle: React.CSSProperties = {
    margin: "6px 0 0",
    color: "var(--text-secondary)",
  };
  const helpColorLegendWrapStyle: React.CSSProperties = {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "var(--text-secondary)",
  };
  const helpLegendItemRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
  };
  const helpLegendDotBaseStyle: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
  };
  const helpActionsListStyle: React.CSSProperties = {
    marginTop: 6,
    color: "var(--text-secondary)",
  };
  const helpActionRowStyle: React.CSSProperties = {
    margin: "4px 0",
  };
  const helpDividerSectionStyle: React.CSSProperties = {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid var(--border-glass)",
  };
  const helpCloseButtonStyle: React.CSSProperties = {
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
  };

  const getGraphContainerStyle = (
    fullscreen: boolean,
  ): React.CSSProperties => ({
    display: "flex",
    flexDirection: "row",
    height: fullscreen ? "100vh" : "100%",
    width: fullscreen ? "100vw" : "100%",
    position: fullscreen ? "fixed" : "relative",
    top: fullscreen ? 0 : "auto",
    left: fullscreen ? 0 : "auto",
    zIndex: fullscreen ? 9999 : "auto",
    overflow: "hidden",
  });
  const getGraphHeaderBadgeStyle = (
    background: string,
  ): React.CSSProperties => ({
    ...graphHeaderBadgeBaseStyle,
    background,
  });
  const getGraphAdvancedSliderStyle = (
    unlimited: boolean,
  ): React.CSSProperties => ({
    width: 120,
    cursor: unlimited ? "not-allowed" : "pointer",
    opacity: unlimited ? 0.5 : 1,
  });
  const getGraphProgressFillStyle = (
    progress: number,
  ): React.CSSProperties => ({
    height: "100%",
    width: `${progress}%`,
    background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
    borderRadius: 3,
    transition: "width 0.3s ease",
  });
  const getSemanticImportLabelStyle = (
    importMissing: boolean,
    disabled: boolean,
  ): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    color: importMissing ? "var(--text-primary)" : "var(--text-muted)",
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "3px 8px",
    borderRadius: 4,
    background: importMissing ? "rgba(16, 185, 129, 0.1)" : "transparent",
    border: `1px solid ${importMissing ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)"}`,
    transition: "all 0.2s",
  });
  const getSemanticEmbeddingMessageStyle = (
    message: string,
  ): React.CSSProperties => ({
    fontSize: 11,
    color: message.startsWith("✓")
      ? "#10b981"
      : message.startsWith("Ошибка")
        ? "#ef4444"
        : "var(--text-muted)",
  });
  const getSemanticEmbeddingProgressFillStyle = (
    total: number,
    processed: number,
  ): React.CSSProperties => ({
    height: "100%",
    width: `${total > 0 ? Math.round((processed / total) * 100) : 0}%`,
    background: "linear-gradient(90deg, #10b981, #3b82f6)",
    transition: "width 0.3s ease",
  });
  const getSemanticResultScoreStyle = (
    similarity: number,
  ): React.CSSProperties => ({
    marginLeft: 8,
    padding: "2px 6px",
    background: `rgba(16, 185, 129, ${similarity})`,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  });
  const getMethodologyChipClassName = (selected: boolean): string =>
    `graph-methodology-chip${selected ? " graph-methodology-chip--active" : ""}`;
  const getMethodologyCountBadgeClassName = (selected: boolean): string =>
    `graph-methodology-chip-count${selected ? " graph-methodology-chip-count--active" : ""}`;
  const getSemanticClusterCardStyle = (
    selected: boolean,
    color: string,
  ): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 8,
    border: selected ? `2px solid ${color}` : "1px solid var(--border-glass)",
    background: selected ? color : "var(--bg-secondary)",
    color: selected ? "white" : "inherit",
    cursor: "pointer",
    fontSize: 11,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    minWidth: 150,
    position: "relative",
  });
  const getSemanticClusterDetailsButtonStyle = (
    selected: boolean,
  ): React.CSSProperties => ({
    ...semanticClusterDetailsButtonBaseStyle,
    background: selected ? "rgba(255,255,255,0.2)" : "var(--bg-tertiary)",
  });
  const getSemanticClusterDotStyle = (color: string): React.CSSProperties => ({
    ...semanticClusterDotBaseStyle,
    background: color,
  });
  const getSemanticClusterCountBadgeStyle = (
    selected: boolean,
    color: string,
  ): React.CSSProperties => ({
    ...semanticClusterCountBaseStyle,
    background: selected ? "rgba(255,255,255,0.2)" : `${color}30`,
    color: selected ? "white" : color,
  });
  const getSemanticClusterCentralTitleStyle = (
    selected: boolean,
  ): React.CSSProperties => ({
    ...semanticClusterCentralTitleBaseStyle,
    color: selected ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
  });
  const getSemanticClusterKeywordsStyle = (
    selected: boolean,
  ): React.CSSProperties => ({
    ...semanticClusterKeywordsBaseStyle,
    color: selected ? "rgba(255,255,255,0.7)" : "var(--text-muted)",
  });
  const getGapAnalyzeButtonStyle = (
    loadingState: boolean,
  ): React.CSSProperties => ({
    ...gapAnalyzeButtonBaseStyle,
    background: loadingState
      ? "var(--bg-tertiary)"
      : "linear-gradient(135deg, #f59e0b, #ef4444)",
    cursor: loadingState ? "wait" : "pointer",
    boxShadow: loadingState ? "none" : "0 2px 8px rgba(245, 158, 11, 0.3)",
  });
  const getGapSimilarityStyle = (similarity: number): React.CSSProperties => ({
    background: `rgba(245, 158, 11, ${similarity})`,
    padding: "2px 8px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 10,
  });
  const getLegendDotStyle = (background: string): React.CSSProperties => ({
    background,
  });
  const getLegendValueStyle = (color: string): React.CSSProperties => ({
    color,
    fontWeight: 600,
  });
  const getGraphHoverCardStyle = (
    x: number,
    y: number,
  ): React.CSSProperties => ({
    left: x,
    top: y,
  });
  const getAiMessageBubbleStyle = (
    role: "user" | "assistant",
  ): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 10,
    background:
      role === "user"
        ? "linear-gradient(135deg, #3b82f6, #2563eb)"
        : "var(--bg-secondary)",
    color: role === "user" ? "white" : "var(--text-primary)",
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    maxWidth: "90%",
    fontSize: 12,
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
  });
  const getAiSelectAllButtonStyle = (
    allSelected: boolean,
  ): React.CSSProperties => ({
    ...aiFoundActionButtonBaseStyle,
    background: allSelected
      ? "rgba(74, 222, 128, 0.3)"
      : "rgba(255,255,255,0.1)",
    color: allSelected ? "#4ade80" : "var(--text-secondary)",
  });
  const getAiClearHighlightButtonStyle = (): React.CSSProperties => ({
    ...aiFoundActionButtonBaseStyle,
    background: "rgba(255,255,255,0.1)",
    color: "var(--text-secondary)",
  });
  const getAiFoundItemStyle = (selected: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    background: selected ? "rgba(74, 222, 128, 0.15)" : "var(--bg-primary)",
    borderRadius: 6,
    borderLeft: `3px solid ${selected ? "#4ade80" : "#00ffff"}`,
    cursor: "pointer",
    transition: "all 0.15s ease",
  });
  const getAiFoundItemCheckboxStyle = (
    selected: boolean,
  ): React.CSSProperties => ({
    ...aiFoundItemCheckboxStyleBase,
    color: selected ? "#4ade80" : "var(--text-secondary)",
  });
  const getAiAddButtonStyle = (
    variant: "candidate" | "selected",
    loadingState: boolean,
  ): React.CSSProperties => ({
    ...aiFoundAddButtonBaseStyle,
    background: loadingState
      ? "var(--bg-secondary)"
      : variant === "candidate"
        ? "linear-gradient(135deg, #3b82f6, #2563eb)"
        : "linear-gradient(135deg, #22c55e, #16a34a)",
    cursor: loadingState ? "not-allowed" : "pointer",
  });
  const getAiSendButtonStyle = (
    loadingState: boolean,
  ): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 8,
    border: "none",
    background: loadingState
      ? "var(--bg-secondary)"
      : "linear-gradient(135deg, #8b5cf6, #6366f1)",
    color: "white",
    cursor: loadingState ? "not-allowed" : "pointer",
  });
  const getRecommendationCardStyle = (
    priority: "high" | "medium" | "low",
  ): React.CSSProperties => ({
    background:
      priority === "high"
        ? "rgba(239, 68, 68, 0.1)"
        : priority === "medium"
          ? "rgba(249, 115, 22, 0.1)"
          : "rgba(59, 130, 246, 0.1)",
    border: `1px solid ${
      priority === "high"
        ? "rgba(239, 68, 68, 0.3)"
        : priority === "medium"
          ? "rgba(249, 115, 22, 0.3)"
          : "rgba(59, 130, 246, 0.3)"
    }`,
    borderRadius: 8,
    padding: 16,
  });
  const getRecommendationPriorityBadgeStyle = (
    priority: "high" | "medium" | "low",
  ): React.CSSProperties => ({
    background:
      priority === "high"
        ? "#ef4444"
        : priority === "medium"
          ? "#f97316"
          : "#3b82f6",
    color: "white",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    flexShrink: 0,
  });
  const getRecommendationPriorityLabel = (
    priority: "high" | "medium" | "low",
  ): string => {
    if (priority === "high") return "Важно";
    if (priority === "medium") return "Средне";
    return "Низко";
  };
  const getClusterDetailColorDotStyle = (
    color: string,
  ): React.CSSProperties => ({
    ...clusterDetailColorDotBaseStyle,
    background: color,
  });
  const getClusterKeywordStyle = (color: string): React.CSSProperties => ({
    background: color + "20",
    color,
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500,
  });
  const getClusterCentralCardStyle = (color: string): React.CSSProperties => ({
    ...clusterDetailCentralCardBaseStyle,
    borderLeft: `4px solid ${color}`,
  });
  const getClusterItemRowStyle = (
    selected: boolean,
    isLast: boolean,
  ): React.CSSProperties => ({
    padding: "10px 14px",
    borderBottom: isLast ? "none" : "1px solid var(--border-glass)",
    cursor: "pointer",
    transition: "background 0.15s",
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: selected ? "rgba(59, 130, 246, 0.1)" : "transparent",
  });
  const getClusterItemIndexStyle = (
    isCentral: boolean,
    color: string,
  ): React.CSSProperties => ({
    ...clusterDetailItemIndexBaseStyle,
    background: isCentral ? color : "var(--bg-secondary)",
    color: isCentral ? "white" : "var(--text-muted)",
  });
  const getClusterStatusBadgeStyle = (status: string): React.CSSProperties => ({
    ...clusterDetailStatusBadgeBaseStyle,
    background:
      status === "selected"
        ? "rgba(34, 197, 94, 0.2)"
        : status === "excluded"
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(59, 130, 246, 0.2)",
    color:
      status === "selected"
        ? "#22c55e"
        : status === "excluded"
          ? "#ef4444"
          : "#3b82f6",
  });
  const getClusterStatusLabel = (status: string): string => {
    if (status === "selected") return "Отобрана";
    if (status === "excluded") return "Исключена";
    return "Кандидат";
  };
  const getClusterSelectedActionButtonStyle = (
    variant: "selected" | "candidate",
    loadingState: boolean,
  ): React.CSSProperties => ({
    ...clusterDetailSelectedButtonBaseStyle,
    background: variant === "selected" ? "#22c55e" : "#3b82f6",
    cursor: loadingState ? "wait" : "pointer",
    opacity: loadingState ? 0.6 : 1,
  });
  const getClusterFilterButtonStyle = (color: string): React.CSSProperties => ({
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: color,
    color: "white",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  });
  const getHelpIconStyle = (color: string): React.CSSProperties => ({
    color,
  });
  const getHelpLegendDotStyle = (color: string): React.CSSProperties => ({
    ...helpLegendDotBaseStyle,
    background: color,
  });
  const getGraphExportMenuClassName = (isOpen: boolean): string =>
    `graph-export-dropdown-menu ${isOpen ? "graph-export-dropdown-menu--open" : ""}`;

  if (loading) {
    return (
      <div className="graph-container">
        <div className="muted graph-loading-message">
          <div className="loading-spinner graph-loading-spinner" />
          Загрузка графа цитирований...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-container">
        <div className="alert graph-error-alert">{error}</div>
      </div>
    );
  }

  return (
    <div
      className={`graph-container graph-fixed-height ${isFullscreen ? "graph-fullscreen" : ""}`}
      ref={containerRef}
      style={getGraphContainerStyle(isFullscreen)}
    >
      {/* Main Content Area */}
      <div className="graph-main-area">
        {/* Compact Header Panel with Dropdowns - horizontal layout */}
        <div className="graph-header-filters">
          {/* Title */}
          <div className="graph-header-title-wrap">
            <IconGraph size="md" className="text-accent" />
            <span className="graph-header-title-text">Граф</span>
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
          <div className="graph-year-range">
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
              className="graph-compact-input graph-year-input graph-year-input--from"
            />
            <span className="graph-year-separator">—</span>
            <input
              type="number"
              placeholder="До"
              value={yearToInput}
              onChange={(e) => setYearToInput(e.target.value)}
              onBlur={() => {
                const val = yearToInput ? parseInt(yearToInput, 10) : undefined;
                if (val !== yearTo) setYearTo(val);
              }}
              className="graph-compact-input graph-year-input graph-year-input--to"
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
          <div className="lang-toggle graph-header-lang-toggle">
            <button
              onClick={() => setGlobalLang("en")}
              className={`graph-header-lang-button ${
                globalLang === "en" ? "active" : ""
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setGlobalLang("ru")}
              className={`graph-header-lang-button ${
                globalLang === "ru" ? "active" : ""
              }`}
            >
              RU
            </button>
          </div>

          {/* Spacer */}
          <div className="graph-header-spacer" />

          {/* Actions */}
          <button
            className="btn secondary graph-header-action-btn"
            onClick={handleFetchReferences}
            disabled={fetchingRefs || !!fetchJobStatus?.isRunning}
          >
            <IconRefresh
              size="sm"
              className={fetchingRefs ? "animate-spin" : ""}
            />
            <span className="graph-header-action-label">
              {fetchingRefs ? "..." : "Связи"}
            </span>
          </button>

          {/* Рекомендации */}
          <button
            className="btn secondary graph-header-action-btn graph-header-action-btn--with-gap"
            onClick={loadRecommendations}
            disabled={loadingRecommendations}
            title="Рекомендации по улучшению графа"
          >
            <IconSparkles size="sm" />
            {recommendations.length > 0 && (
              <span style={getGraphHeaderBadgeStyle("var(--accent)")}>
                {recommendations.length}
              </span>
            )}
          </button>

          {/* Семантический поиск */}
          <button
            className={`${
              showSemanticSearch ? "btn primary" : "btn secondary"
            } graph-header-action-btn graph-header-action-btn--with-gap`}
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
            className={`${
              showMethodologyClusters ? "btn primary" : "btn secondary"
            } graph-header-action-btn graph-header-action-btn--with-gap`}
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
            className={`${
              showSemanticClustersPanel ? "btn primary" : "btn secondary"
            } graph-header-action-btn graph-header-action-btn--with-gap`}
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
              <span style={getGraphHeaderBadgeStyle("var(--accent-secondary)")}>
                {semanticClusters.length}
              </span>
            )}
          </button>

          {/* Gap Analysis */}
          <button
            className={`${
              showGapAnalysis ? "btn primary" : "btn secondary"
            } graph-header-action-btn graph-header-action-btn--with-gap`}
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
              <span style={getGraphHeaderBadgeStyle("#f59e0b")}>
                {gapAnalysisResults.length}
              </span>
            )}
          </button>

          {/* Экспорт */}
          <div
            className="dropdown graph-export-dropdown-wrap"
            ref={exportDropdownRef}
          >
            <button
              className="graph-compact-btn"
              title="Экспорт графа"
              onClick={() => setShowExportMenu((prev) => !prev)}
            >
              <IconDownload size="sm" />
            </button>
            <div className={getGraphExportMenuClassName(showExportMenu)}>
              <button
                onClick={() => handleExport("json")}
                className="graph-export-menu-item"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport("graphml")}
                className="graph-export-menu-item"
              >
                GraphML
              </button>
              <button
                onClick={() => handleExport("cytoscape")}
                className="graph-export-menu-item"
              >
                Cytoscape
              </button>
              <button
                onClick={() => handleExport("gexf")}
                className="graph-export-menu-item"
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
              showAIAssistant
                ? "graph-compact-btn-active graph-header-action-btn--with-gap"
                : "graph-compact-btn graph-header-action-btn--with-gap"
            }
            title="AI Ассистент"
          >
            <IconSparkles size="sm" />
            AI
          </button>
        </div>

        {/* Advanced Settings Panel */}
        {showAdvancedSettings && (
          <div className="graph-filters graph-advanced-panel">
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
                style={getGraphAdvancedSliderStyle(unlimitedNodes)}
                title="Максимальное количество узлов в графе"
              />
              <button
                onClick={() => setUnlimitedNodes(!unlimitedNodes)}
                className={`${
                  unlimitedNodes ? "btn primary" : "btn secondary"
                } graph-advanced-limit-button`}
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
                style={getGraphAdvancedSliderStyle(unlimitedLinks)}
                title="Максимум связей на каждый узел"
              />
              <button
                onClick={() => setUnlimitedLinks(!unlimitedLinks)}
                className={`${
                  unlimitedLinks ? "btn primary" : "btn secondary"
                } graph-advanced-limit-button`}
                title="Без ограничений"
              >
                ∞
              </button>
            </div>

            {/* Clustering Toggle */}
            <div className="graph-filter-group">
              <label className="graph-clustering-label">
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
                  className="graph-clustering-select"
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
                className="btn secondary graph-load-more-button"
                onClick={handleLoadMore}
                title="Загрузить больше связанных статей"
              >
                <IconPlus size="sm" className="icon-sm graph-load-more-icon" />
                Загрузить больше (+1000)
              </button>
            )}

            {/* Current Limits Info */}
            {currentLimits && !unlimitedNodes && !unlimitedLinks && (
              <div className="graph-limits-info">
                Текущие лимиты: {currentLimits.maxExtraNodes} узлов,{" "}
                {currentLimits.maxLinksPerNode} связей/узел
              </div>
            )}
            {(unlimitedNodes || unlimitedLinks) && (
              <div className="graph-unlimited-info">
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
          <div className="graph-progress-panel">
            <div className="graph-progress-header">
              <div className="loading-spinner" />
              <div className="graph-progress-title-wrap">
                <span className="graph-progress-title">
                  Загрузка связей (PubMed + Crossref)...
                </span>
                {fetchJobStatus.currentPhase && (
                  <div className="graph-progress-phase">
                    {fetchJobStatus.currentPhase}
                    {fetchJobStatus.phaseProgress &&
                      ` — ${fetchJobStatus.phaseProgress}`}
                  </div>
                )}
              </div>
              <span className="graph-progress-time">
                {formatTime(fetchJobStatus.elapsedSeconds)}
              </span>
              <button
                onClick={handleCancelFetch}
                className="btn secondary graph-progress-cancel-button"
                title="Отменить загрузку"
              >
                ✕ Отмена
              </button>
            </div>

            <div className="progress-bar-animated graph-progress-track">
              <div style={getGraphProgressFillStyle(fetchJobStatus.progress)} />
            </div>

            <div className="graph-progress-footer">
              <span>
                Статей: {fetchJobStatus.processedArticles || 0} /{" "}
                {fetchJobStatus.totalArticles || "?"}
              </span>
              <span>{fetchJobStatus.progress}% завершено</span>
            </div>

            <div className="graph-progress-hint">
              <IconInfoCircle size="sm" />
              <span>
                Загрузка выполняется в фоне. Граф обновится автоматически.
                {fetchJobStatus.secondsSinceProgress != null &&
                  fetchJobStatus.secondsSinceProgress > 30 && (
                    <span className="graph-progress-stale-hint">
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
          <div className="info graph-refs-message">
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
          <div className="ok graph-import-message">{importMessage}</div>
        )}

        {/* Semantic Search Panel */}
        {showSemanticSearch && (
          <div className="graph-filters graph-semantic-panel">
            <div className="graph-semantic-header">
              <div className="graph-semantic-title-row">
                <IconSearch size="sm" />
                <span className="graph-semantic-title">
                  Семантический поиск
                </span>
                {embeddingStats && (
                  <span className="graph-semantic-meta">
                    ({embeddingStats.withEmbeddings}/
                    {embeddingStats.totalArticles} статей с embeddings,
                    {embeddingStats.completionRate.toFixed(0)}%)
                  </span>
                )}
              </div>

              {embeddingStats && embeddingStats.withoutEmbeddings > 0 && (
                <div className="graph-semantic-actions-row">
                  {/* Кнопка генерации */}
                  <button
                    className="btn secondary graph-semantic-generate-btn"
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
                        style={getSemanticImportLabelStyle(
                          importMissingArticles,
                          generatingEmbeddings,
                        )}
                        title={`Импортировать топ-${missingArticlesStats.importLimit || 1000} цитирующих статей из PubMed (всего доступно: ${(missingArticlesStats.totalAvailable || missingArticlesStats.totalMissing).toLocaleString()}). Ранжируются по частоте цитирования ваших статей. Ретракции исключаются.`}
                      >
                        <input
                          type="checkbox"
                          checked={importMissingArticles}
                          onChange={(e) =>
                            setImportMissingArticles(e.target.checked)
                          }
                          disabled={generatingEmbeddings}
                          className="graph-semantic-import-checkbox"
                        />
                        <span>
                          +{missingArticlesStats.totalMissing.toLocaleString()}{" "}
                          цитирующих
                          {missingArticlesStats.totalAvailable &&
                            missingArticlesStats.totalAvailable >
                              missingArticlesStats.totalMissing && (
                              <span className="graph-semantic-import-available">
                                из{" "}
                                {missingArticlesStats.totalAvailable.toLocaleString()}
                              </span>
                            )}
                        </span>
                      </label>
                    )}
                  {generatingEmbeddings && embeddingJob?.jobId && (
                    <button
                      className="btn graph-semantic-cancel-btn"
                      onClick={handleCancelEmbeddings}
                    >
                      Отменить
                    </button>
                  )}
                  {embeddingMessage && (
                    <span
                      style={getSemanticEmbeddingMessageStyle(embeddingMessage)}
                    >
                      {embeddingMessage}
                    </span>
                  )}
                  {generatingEmbeddings && embeddingJob && (
                    <div className="graph-semantic-embedding-track">
                      <div
                        style={getSemanticEmbeddingProgressFillStyle(
                          embeddingJob.total,
                          embeddingJob.processed,
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="graph-semantic-search-controls">
              <input
                type="text"
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
                placeholder="Введите запрос для поиска похожих статей..."
                className="graph-semantic-search-input"
              />
              <div className="graph-semantic-threshold-wrap">
                <label className="graph-semantic-threshold-label">Порог:</label>
                <input
                  type="range"
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  value={semanticThreshold}
                  onChange={(e) =>
                    setSemanticThreshold(parseFloat(e.target.value))
                  }
                  className="graph-semantic-threshold-range"
                />
                <span className="graph-semantic-threshold-value">
                  {semanticThreshold.toFixed(2)}
                </span>
              </div>
              <button
                className="btn primary graph-semantic-search-btn"
                onClick={handleSemanticSearch}
                disabled={semanticSearching || !semanticQuery.trim()}
              >
                {semanticSearching ? "..." : "Найти"}
              </button>
            </div>

            {semanticResults.length > 0 && (
              <div className="graph-semantic-results">
                <div className="graph-semantic-results-title">
                  Найдено {semanticResults.length} похожих статей:
                </div>
                {semanticResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => highlightSemanticResult(result.id)}
                    className="graph-semantic-result-row"
                  >
                    <span className="graph-semantic-result-title">
                      {result.titleEn || result.title}
                    </span>
                    <span
                      style={getSemanticResultScoreStyle(result.similarity)}
                    >
                      {(result.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Визуализация семантического ядра */}
            {embeddingStats && embeddingStats.withEmbeddings > 10 && (
              <div className="graph-semantic-core">
                <div className="graph-semantic-core-header">
                  <div className="graph-semantic-core-title-group">
                    <span className="graph-semantic-core-title">
                      🔗 Семантическое ядро
                    </span>
                    <span className="graph-semantic-core-subtitle">
                      (связи по смыслу)
                    </span>
                  </div>
                  <label className="toggle-switch graph-semantic-core-toggle">
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
                  <div className="graph-semantic-core-controls">
                    <div className="graph-semantic-core-threshold-group">
                      <label className="graph-semantic-core-threshold-label">
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
                        className="graph-semantic-core-threshold-range"
                      />
                      <span className="graph-semantic-core-threshold-value">
                        {(semanticEdgeThreshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <button
                      className="btn secondary graph-semantic-core-refresh-btn"
                      onClick={loadSemanticEdges}
                      disabled={loadingSemanticEdges}
                    >
                      {loadingSemanticEdges ? "Загрузка..." : "Обновить"}
                    </button>
                    {semanticEdges.length > 0 && (
                      <span className="graph-semantic-core-edge-count">
                        {semanticEdges.length} связей
                      </span>
                    )}
                  </div>
                )}

                {showSemanticEdges && semanticEdges.length > 0 && (
                  <div className="graph-semantic-core-hint">
                    <span className="graph-semantic-core-hint-dash">— — —</span>{" "}
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
          <div className="graph-filters graph-methodology-panel">
            <div className="graph-methodology-header">
              <IconChartBar size="sm" />
              <span className="graph-methodology-title">
                Кластеризация по методологиям
              </span>
              <button
                className="btn secondary graph-methodology-reset-btn"
                onClick={() => filterByMethodology(null)}
              >
                Сбросить фильтр
              </button>
            </div>

            <div className="graph-methodology-list">
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
                    className={getMethodologyChipClassName(
                      methodologyFilter === cluster.type,
                    )}
                  >
                    <span>{cluster.name}</span>
                    <span
                      className={getMethodologyCountBadgeClassName(
                        methodologyFilter === cluster.type,
                      )}
                    >
                      {cluster.count}
                    </span>
                    <span className="graph-methodology-percent">
                      ({cluster.percentage.toFixed(0)}%)
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Semantic Clusters Panel */}
        {showSemanticClustersPanel && (
          <div className="graph-filters graph-semantic-clusters-panel">
            <div className="graph-semantic-clusters-header">
              <IconGraph size="sm" />
              <span className="graph-semantic-clusters-title">
                🔮 Семантические кластеры
              </span>
              <span className="graph-semantic-clusters-subtitle">
                (группировка по смыслу)
              </span>
              <div className="graph-semantic-clusters-actions">
                {semanticClusters.length > 0 && (
                  <button
                    className="btn secondary graph-semantic-clusters-action-btn"
                    onClick={() => filterBySemanticCluster(null)}
                  >
                    Сбросить
                  </button>
                )}
                <button
                  className="btn secondary graph-semantic-clusters-action-btn"
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
                    className="btn secondary graph-semantic-clusters-action-btn graph-semantic-clusters-delete-btn"
                    onClick={handleDeleteSemanticClusters}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>

            {/* Настройки кластеризации */}
            {semanticClusters.length === 0 && (
              <div className="graph-semantic-cluster-settings">
                <div className="graph-semantic-cluster-setting-group">
                  <label className="graph-semantic-cluster-setting-label">
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
                    className="graph-semantic-cluster-setting-input"
                  />
                </div>
                <div className="graph-semantic-cluster-setting-group">
                  <label className="graph-semantic-cluster-setting-label">
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
                    className="graph-semantic-cluster-setting-input"
                  />
                </div>
                <div className="graph-semantic-cluster-setting-group">
                  <label className="graph-semantic-cluster-setting-label">
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
                    className="graph-semantic-cluster-similarity-range"
                  />
                  <span className="graph-semantic-cluster-similarity-value">
                    {(
                      semanticClusterSettings.similarityThreshold * 100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <label className="graph-semantic-cluster-checkbox-label">
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
              <div className="graph-semantic-cluster-list">
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
                    style={getSemanticClusterCardStyle(
                      selectedSemanticCluster === cluster.id,
                      cluster.color,
                    )}
                  >
                    {/* Кнопка деталей */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openClusterDetails(cluster);
                      }}
                      style={getSemanticClusterDetailsButtonStyle(
                        selectedSemanticCluster === cluster.id,
                      )}
                      title="Подробнее о кластере"
                    >
                      ⓘ
                    </button>
                    <div className="graph-semantic-cluster-header-row">
                      <span style={getSemanticClusterDotStyle(cluster.color)} />
                      <span className="graph-semantic-cluster-name">
                        {cluster.name}
                      </span>
                      <span
                        style={getSemanticClusterCountBadgeStyle(
                          selectedSemanticCluster === cluster.id,
                          cluster.color,
                        )}
                      >
                        {cluster.articleCount}
                      </span>
                    </div>
                    {cluster.centralArticleTitle && (
                      <div
                        style={getSemanticClusterCentralTitleStyle(
                          selectedSemanticCluster === cluster.id,
                        )}
                        title={cluster.centralArticleTitle}
                      >
                        ⭐ {cluster.centralArticleTitle.slice(0, 40)}...
                      </div>
                    )}
                    {cluster.keywords.length > 0 && (
                      <div
                        style={getSemanticClusterKeywordsStyle(
                          selectedSemanticCluster === cluster.id,
                        )}
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
              <div className="graph-semantic-cluster-empty-hint">
                {embeddingStats && embeddingStats.withEmbeddings < 10 ? (
                  <>
                    <div className="graph-semantic-cluster-empty-warning">
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
          <div className="graph-filters graph-gap-panel">
            <div className="graph-gap-header">
              <div className="graph-gap-title-wrap">
                <IconLinkChain size="sm" />
                <span className="graph-gap-title">🔍 Анализ пробелов</span>
                <span className="graph-gap-subtitle">
                  (похожие статьи без цитирований)
                </span>
              </div>

              {/* Фильтры - компактная версия */}
              <div className="graph-gap-filters-wrap">
                <span className="graph-gap-filter-label">Годы:</span>
                <select
                  value={gapYearFrom || ""}
                  onChange={(e) =>
                    setGapYearFrom(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className="graph-gap-filter-select"
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
                <span className="graph-gap-separator">—</span>
                <select
                  value={gapYearTo || ""}
                  onChange={(e) =>
                    setGapYearTo(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className="graph-gap-filter-select"
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

                <span className="graph-gap-limit-label">Лимит:</span>
                <select
                  value={gapLimit}
                  onChange={(e) => setGapLimit(parseInt(e.target.value, 10))}
                  className="graph-gap-filter-select graph-gap-limit-select"
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
                style={getGapAnalyzeButtonStyle(loadingGapAnalysis)}
              >
                {loadingGapAnalysis ? "⏳ Поиск..." : "🔍 Найти пробелы"}
              </button>
            </div>

            {gapAnalysisResults.length > 0 ? (
              <div className="graph-gap-results-wrap">
                {gapAnalysisResults.map((gap, idx) => (
                  <div key={idx} className="graph-gap-result-card">
                    <div className="graph-gap-result-header">
                      <span style={getGapSimilarityStyle(gap.similarity)}>
                        {(gap.similarity * 100).toFixed(0)}% схожесть
                      </span>
                      <span className="graph-gap-reason">{gap.reason}</span>
                    </div>
                    <div className="graph-gap-pair">
                      <div
                        className="graph-gap-article-col"
                        onClick={() => highlightSemanticResult(gap.article1.id)}
                      >
                        <div className="graph-gap-article-title">
                          {gap.article1.title?.slice(0, 50)}...
                        </div>
                        <div className="graph-gap-article-year">
                          {gap.article1.year || "N/A"}
                        </div>
                      </div>
                      <div className="graph-gap-arrow">↔</div>
                      <div
                        className="graph-gap-article-col"
                        onClick={() => highlightSemanticResult(gap.article2.id)}
                      >
                        <div className="graph-gap-article-title">
                          {gap.article2.title?.slice(0, 50)}...
                        </div>
                        <div className="graph-gap-article-year">
                          {gap.article2.year || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="graph-gap-empty">
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
            <span className="graph-stat-value graph-stats-link-value">
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
                      style={getLegendDotStyle("#ec4899")}
                    ></span>
                    <span>Цитируют:</span>
                    <span style={getLegendValueStyle("#ec4899")}>
                      {stats.levelCounts.level0}
                    </span>
                  </div>
                )}
              <div className="graph-stat-item">
                <span
                  className="legend-dot"
                  style={getLegendDotStyle("#3b82f6")}
                ></span>
                <span>В проекте:</span>
                <span style={getLegendValueStyle("#3b82f6")}>
                  {stats.levelCounts.level1}
                </span>
              </div>
              {depth >= 2 && (
                <div className="graph-stat-item">
                  <span
                    className="legend-dot"
                    style={getLegendDotStyle("#f97316")}
                  ></span>
                  <span>Ссылки:</span>
                  <span style={getLegendValueStyle("#f97316")}>
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
                      style={getLegendDotStyle("#06b6d4")}
                    ></span>
                    <span>Связанные:</span>
                    <span style={getLegendValueStyle("#06b6d4")}>
                      {stats.levelCounts.level3}
                    </span>
                  </div>
                )}
            </>
          )}

          {/* P-value статьи - кнопка добавления */}
          {pValueArticlesCount > 0 && (
            <div className="graph-stat-item graph-pvalue-stat-item">
              <span
                className="legend-dot"
                style={getLegendDotStyle("#fbbf24")}
              ></span>
              <span>С P-value:</span>
              <span style={getLegendValueStyle("#fbbf24")}>
                {pValueArticlesCount}
              </span>
              <button
                className="btn secondary graph-pvalue-button"
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
            <div className="graph-no-references-warning">
              <IconExclamation size="sm" />
              Данные о ссылках не загружены. Нажмите "Обновить связи" для
              загрузки.
            </div>
          )}

        {/* Main Area: Graph + AI Panel side by side */}
        <div className="graph-main-split">
          {/* Graph Area */}
          <div
            ref={graphAreaRef}
            onMouseMove={handleGraphMouseMove}
            onMouseLeave={clearHoverCard}
            className="graph-main-graph-area"
          >
            {!data || data.nodes.length === 0 ? (
              <div className="muted graph-main-empty-state">
                <IconChartBar size="lg" className="icon-lg" />
                <p>Нет данных для графа с текущими фильтрами.</p>
              </div>
            ) : (
              <div className="graph-main-canvas-fill">
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
                  nodeCanvasObject={(
                    node: GraphNodeWithCoords,
                    ctx: CanvasRenderingContext2D,
                    globalScale: number,
                  ) => {
                    const nodeX = node.x;
                    const nodeY = node.y;
                    // Проверка на валидность координат (могут быть undefined при инициализации)
                    if (
                      typeof nodeX !== "number" ||
                      !Number.isFinite(nodeX) ||
                      typeof nodeY !== "number" ||
                      !Number.isFinite(nodeY)
                    ) {
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
                    ctx.arc(nodeX, nodeY, size, 0, 2 * Math.PI);
                    ctx.fill();

                    // Сбрасываем свечение
                    ctx.shadowBlur = 0;

                    // Одна тонкая обводка для всех узлов (академичный вид)
                    ctx.strokeStyle = clusterColor
                      ? graphColors.clusterStrokeColor
                      : graphColors.strokeColor;
                    ctx.lineWidth = clusterColor ? 1.2 : 0.8;
                    ctx.beginPath();
                    ctx.arc(nodeX, nodeY, size, 0, 2 * Math.PI);
                    ctx.stroke();

                    // Обводка для AI-найденных (заметнее, но не кричащо)
                    if (isAIFound) {
                      ctx.strokeStyle = "rgba(0, 212, 255, 0.6)";
                      ctx.lineWidth = 1.5;
                      ctx.beginPath();
                      ctx.arc(nodeX, nodeY, size, 0, 2 * Math.PI);
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
                      ctx.fillText("⭐", nodeX, nodeY - size - 4);
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
                      ctx.fillText(label, nodeX, nodeY + size + 4);
                    }
                  }}
                  linkColor={(link: GraphLinkWithSemantic) => {
                    const similarity = link.similarity ?? semanticEdgeThreshold;
                    return link.isSemantic
                      ? `rgba(236, 72, 153, ${0.3 + (similarity - semanticEdgeThreshold) * 2})` // Розовый для семантических
                      : graphColors.linkColor; // Из предвычисленных цветов
                  }}
                  linkWidth={(link: GraphLinkWithSemantic) => {
                    const similarity = link.similarity ?? semanticEdgeThreshold;
                    return link.isSemantic
                      ? 1.5 + (similarity - semanticEdgeThreshold) * 3 // Толще для высокой схожести
                      : linkThickness === "thin"
                        ? 0.5
                        : linkThickness === "thick"
                          ? 1.5
                          : 0.8;
                  }}
                  linkLineDash={(link: GraphLinkWithSemantic) =>
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
                  onNodeHover={handleNodeHover}
                  onNodeClick={(
                    node: GraphNodeWithCoords,
                    event: MouseEvent,
                  ) => {
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
                    const normalizedNode: GraphNode = {
                      ...node,
                      authors: Array.isArray(node.authors)
                        ? node.authors.join(", ")
                        : node.authors,
                    };
                    setSelectedNodeForDisplay(
                      selectedNodeForDisplay?.id === node.id
                        ? null
                        : normalizedNode,
                    );
                  }}
                />

                {/* Floating controls overlay */}
                <div className="graph-main-floating-controls">
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
            {hoverCardPosition &&
              hoverCardArticle &&
              !selectedNodeForDisplay && (
                <div
                  className="graph-hover-card"
                  style={getGraphHoverCardStyle(
                    hoverCardPosition.x,
                    hoverCardPosition.y,
                  )}
                >
                  <ArticleCard
                    article={hoverCardArticle}
                    isSelected={false}
                    onSelect={() => {}}
                    onStatusChange={() => {}}
                    language={globalLang}
                    showCheckbox={false}
                    showAbstractToggle={false}
                    showActions={false}
                  />
                </div>
              )}
          </div>

          {/* AI Assistant Panel - Side by side with graph */}
          {showAIAssistant && (
            <div className="ai-panel-sidebar">
              {/* AI Panel Header */}
              <div className="ai-panel-header">
                <div className="ai-panel-header-title-wrap">
                  <IconSparkles size="md" className="text-purple-400" />
                  <span className="ai-panel-header-title">AI Ассистент</span>
                </div>
                <button
                  onClick={() => setShowAIAssistant(false)}
                  className="ai-panel-collapse-btn"
                  title="Свернуть"
                >
                  <IconChevronRight size="sm" />
                </button>
              </div>

              {/* Chat History */}
              <div className="ai-history-wrap">
                {aiHistory.length === 0 && (
                  <div className="ai-empty-state">
                    <IconSearch
                      size="lg"
                      className="icon-lg ai-empty-search-icon"
                    />
                    <p className="ai-empty-title">Поиск в графе</p>
                    <p className="ai-empty-description">
                      AI найдёт статьи среди ссылок и цитирующих работ
                    </p>
                    <div className="ai-empty-examples">
                      <p className="ai-empty-example">
                        💡 «Найди мета-анализы»
                      </p>
                      <p className="ai-empty-example">
                        💡 «РКИ за последние 5 лет»
                      </p>
                      {semanticClusters.length > 0 && (
                        <p className="ai-empty-example">
                          💡 «Статьи из кластера про...»
                        </p>
                      )}
                      {gapAnalysisResults.length > 0 && (
                        <p className="ai-empty-example ai-empty-example--last">
                          💡 «Статьи для закрытия gap...»
                        </p>
                      )}
                      {semanticClusters.length === 0 &&
                        gapAnalysisResults.length === 0 && (
                          <p className="ai-empty-example ai-empty-example--last">
                            💡 «Статьи про лечение»
                          </p>
                        )}
                    </div>
                    {depth < 2 && (
                      <div className="ai-empty-depth-warning">
                        ⚠️ Для поиска нужно загрузить связи: выберите «+Ссылки»
                        или «+Цитирующие»
                      </div>
                    )}
                  </div>
                )}

                {aiHistory.map((msg, idx) => (
                  <div key={idx} style={getAiMessageBubbleStyle(msg.role)}>
                    {msg.content}
                  </div>
                ))}

                {aiLoading && (
                  <div className="ai-loading-message">
                    <span className="loading-spinner ai-loading-spinner" />
                    <span className="ai-loading-text">Думаю...</span>
                  </div>
                )}

                {/* Found Articles from Graph */}
                {aiFoundArticles.length > 0 && (
                  <div style={aiFoundArticlesWrapStyle}>
                    <div style={aiFoundArticlesHeaderStyle}>
                      <div style={aiFoundArticlesTitleStyle}>
                        🔍 Найдено: {aiFoundArticles.length}
                        {aiSelectedForAdd.size > 0 && (
                          <span style={aiFoundArticlesSelectedCountStyle}>
                            (выбрано: {aiSelectedForAdd.size})
                          </span>
                        )}
                      </div>
                      <div style={aiFoundHeaderActionsStyle}>
                        <button
                          onClick={toggleSelectAll}
                          style={getAiSelectAllButtonStyle(
                            aiSelectedForAdd.size === aiFoundArticles.length,
                          )}
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
                          style={getAiClearHighlightButtonStyle()}
                          title="Сбросить подсветку"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Article List (scrollable) */}
                    <div style={aiFoundListStyle}>
                      {aiFoundArticles.slice(0, 20).map((article, idx) => {
                        const isSelected = aiSelectedForAdd.has(article.id);
                        return (
                          <div
                            key={article.id}
                            onClick={() => toggleArticleSelection(article.id)}
                            style={getAiFoundItemStyle(isSelected)}
                          >
                            <div style={aiFoundItemInnerStyle}>
                              <span
                                style={getAiFoundItemCheckboxStyle(isSelected)}
                              >
                                {isSelected ? "☑" : "☐"}
                              </span>
                              <div style={aiFoundItemContentStyle}>
                                <div style={aiFoundItemTitleStyle}>
                                  {idx + 1}.{" "}
                                  {article.title?.substring(0, 70) ||
                                    article.id}
                                  {article.title && article.title.length > 70
                                    ? "..."
                                    : ""}
                                </div>
                                <div style={aiFoundItemMetaStyle}>
                                  {article.year && (
                                    <span>📅 {article.year}</span>
                                  )}
                                  {article.citedByCount ? (
                                    <span>📊 {article.citedByCount} цит.</span>
                                  ) : null}
                                </div>
                                {article.reason && (
                                  <div style={aiFoundItemReasonStyle}>
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
                        <div style={aiFoundRemainderStyle}>
                          ... и ещё {aiFoundArticles.length - 20} статей
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={aiFoundButtonsRowStyle}>
                      <button
                        onClick={() => handleAIAddSelectedArticles("candidate")}
                        disabled={aiAddingArticles}
                        style={getAiAddButtonStyle(
                          "candidate",
                          aiAddingArticles,
                        )}
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
                        style={getAiAddButtonStyle(
                          "selected",
                          aiAddingArticles,
                        )}
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
              <div style={aiInputPanelStyle}>
                {aiError && <div style={aiInputErrorStyle}>{aiError}</div>}
                <div style={aiInputRowStyle}>
                  <input
                    type="text"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleAISend()
                    }
                    placeholder="Искать в графе..."
                    disabled={aiLoading}
                    style={aiMessageInputStyle}
                  />
                  <button
                    onClick={handleAISend}
                    disabled={aiLoading || !aiMessage.trim()}
                    style={getAiSendButtonStyle(aiLoading)}
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
              style={recommendationsModalStyle}
            >
              <button
                className="node-info-modal-close"
                onClick={() => setShowRecommendations(false)}
              >
                <IconClose size="md" />
              </button>

              <h3 style={recommendationsTitleStyle}>
                <span style={recommendationsSparkleIconStyle}>
                  <IconSparkles size="md" />
                </span>
                Рекомендации по улучшению графа
              </h3>

              {recommendations.length === 0 ? (
                <div style={recommendationsEmptyStateStyle}>
                  <div style={recommendationsEmptyIconStyle}>
                    <IconCheckBadge size="lg" />
                  </div>
                  <p>Отлично! Граф в хорошем состоянии, рекомендаций нет.</p>
                </div>
              ) : (
                <div style={recommendationsListStyle}>
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      style={getRecommendationCardStyle(rec.priority)}
                    >
                      <div style={recommendationCardBodyStyle}>
                        <div
                          style={getRecommendationPriorityBadgeStyle(
                            rec.priority,
                          )}
                        >
                          {getRecommendationPriorityLabel(rec.priority)}
                        </div>
                        <div style={recommendationTextWrapStyle}>
                          <div style={recommendationTitleStyle}>
                            {rec.title}
                          </div>
                          <div style={recommendationDescriptionStyle}>
                            {rec.description}
                          </div>
                          {isFetchReferencesRecommendationAction(
                            rec.action,
                          ) && (
                            <button
                              className="btn secondary"
                              style={recommendationActionButtonStyle}
                              onClick={() => {
                                setShowRecommendations(false);
                                handleFetchReferences();
                              }}
                            >
                              <IconRefresh size="sm" />
                              <span
                                style={recommendationActionIconSpacingStyle}
                              >
                                Загрузить ссылки ({rec.action.count ?? 0})
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
              style={clusterDetailModalStyle}
            >
              <button
                className="node-info-modal-close"
                onClick={() => setClusterDetailModal(null)}
              >
                <IconClose size="md" />
              </button>

              <div style={clusterDetailHeaderStyle}>
                <div
                  style={getClusterDetailColorDotStyle(
                    clusterDetailModal.cluster.color,
                  )}
                />
                <div>
                  <h3 style={clusterDetailTitleStyle}>
                    {clusterDetailModal.cluster.name}
                  </h3>
                  <div style={clusterDetailMetaStyle}>
                    {clusterDetailModal.cluster.articleCount} статей в кластере
                  </div>
                </div>
              </div>

              {/* Keywords */}
              {clusterDetailModal.cluster.keywords.length > 0 && (
                <div style={clusterDetailKeywordsSectionStyle}>
                  <div style={clusterDetailKeywordsLabelStyle}>
                    Ключевые слова:
                  </div>
                  <div style={clusterDetailKeywordsWrapStyle}>
                    {clusterDetailModal.cluster.keywords.map(
                      (kw: string, i: number) => (
                        <span
                          key={i}
                          style={getClusterKeywordStyle(
                            clusterDetailModal.cluster.color,
                          )}
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
                  style={getClusterCentralCardStyle(
                    clusterDetailModal.cluster.color,
                  )}
                >
                  <div style={clusterDetailCentralLabelStyle}>
                    ⭐ Центральная статья кластера:
                  </div>
                  <div style={clusterDetailCentralTitleStyle}>
                    {clusterDetailModal.cluster.centralArticleTitle}
                  </div>
                </div>
              )}

              {/* Articles List */}
              <div style={clusterDetailListHeaderStyle}>
                <span>Все статьи кластера:</span>
                <div style={clusterDetailListHeaderActionsStyle}>
                  <button
                    onClick={selectAllClusterArticles}
                    style={clusterDetailHeaderButtonStyle}
                  >
                    Выбрать все
                  </button>
                  {selectedClusterArticles.size > 0 && (
                    <button
                      onClick={deselectAllClusterArticles}
                      style={clusterDetailHeaderButtonStyle}
                    >
                      Снять выбор ({selectedClusterArticles.size})
                    </button>
                  )}
                </div>
              </div>
              <div style={clusterDetailListContainerStyle}>
                {loadingClusterDetails ? (
                  <div style={clusterDetailLoadingStyle}>
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
                      const isCentralArticle =
                        article.id ===
                        clusterDetailModal.cluster.centralArticleId;
                      return (
                        <div
                          key={article.id}
                          style={getClusterItemRowStyle(
                            isSelected,
                            idx >= clusterDetailModal.articles.length - 1,
                          )}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleClusterArticleSelection(article.id)
                            }
                            onClick={(e) => e.stopPropagation()}
                            style={clusterDetailItemCheckboxStyle}
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
                            style={getClusterItemIndexStyle(
                              isCentralArticle,
                              clusterDetailModal.cluster.color,
                            )}
                          >
                            {isCentralArticle ? "⭐" : idx + 1}
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
                            style={clusterDetailItemContentStyle}
                          >
                            <div style={clusterDetailItemTitleRowStyle}>
                              <span style={clusterDetailItemTitleTextStyle}>
                                {article.title}
                              </span>
                              {/* Status badge */}
                              <span
                                style={getClusterStatusBadgeStyle(
                                  articleStatus,
                                )}
                              >
                                {getClusterStatusLabel(articleStatus)}
                              </span>
                            </div>
                            {article.authors && (
                              <div style={clusterDetailAuthorsStyle}>
                                {article.authors}
                              </div>
                            )}
                            {article.year && (
                              <span style={clusterDetailYearStyle}>
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
                <div style={clusterDetailSelectedActionsStyle}>
                  <div style={clusterDetailSelectedMetaStyle}>
                    Выбрано статей:{" "}
                    <strong>{selectedClusterArticles.size}</strong>
                  </div>
                  <div style={clusterDetailSelectedButtonsStyle}>
                    <button
                      onClick={() => handleAddClusterArticles("selected")}
                      disabled={addingFromCluster}
                      style={getClusterSelectedActionButtonStyle(
                        "selected",
                        addingFromCluster,
                      )}
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
                      style={getClusterSelectedActionButtonStyle(
                        "candidate",
                        addingFromCluster,
                      )}
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
              <div style={clusterDetailFooterActionsStyle}>
                <button
                  onClick={() => {
                    // Filter graph to show only this cluster
                    filterBySemanticCluster(clusterDetailModal.cluster.id);
                    setClusterDetailModal(null);
                  }}
                  style={getClusterFilterButtonStyle(
                    clusterDetailModal.cluster.color,
                  )}
                >
                  Показать только этот кластер
                </button>
                <button
                  onClick={() => setClusterDetailModal(null)}
                  style={clusterDetailCloseButtonStyle}
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
              style={helpModalStyle}
            >
              <button
                className="node-info-modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                <IconClose className="icon-md" />
              </button>

              <h3 style={helpTitleStyle}>
                <IconInfoCircle size="md" style={getHelpIconStyle("#3b82f6")} />
                Как работает граф цитирований
              </h3>

              <div style={helpContentStyle}>
                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconCircleStack
                      size="sm"
                      style={getHelpIconStyle("#3b82f6")}
                    />
                    <strong>Узлы (статьи)</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Каждый узел — это статья. Размер узла зависит от количества
                    цитирований: чем больше цитирований, тем крупнее узел.
                  </p>
                </div>

                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconArrowRight
                      size="sm"
                      style={getHelpIconStyle("#3b82f6")}
                    />
                    <strong>Стрелки (связи)</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Стрелки показывают направление цитирования: от цитирующей
                    статьи к цитируемой.
                  </p>
                </div>

                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconAdjustments
                      size="sm"
                      style={getHelpIconStyle("#3b82f6")}
                    />
                    <strong>Цвета узлов</strong>
                  </div>
                  <div style={helpColorLegendWrapStyle}>
                    <div style={helpLegendItemRowStyle}>
                      <span style={getHelpLegendDotStyle("#22c55e")}></span>
                      <span>Зелёный — отобранные статьи</span>
                    </div>
                    <div style={helpLegendItemRowStyle}>
                      <span style={getHelpLegendDotStyle("#3b82f6")}></span>
                      <span>Синий — PubMed (кандидаты)</span>
                    </div>
                    <div style={helpLegendItemRowStyle}>
                      <span style={getHelpLegendDotStyle("#eab308")}></span>
                      <span>Жёлтый — DOAJ (кандидаты)</span>
                    </div>
                    <div style={helpLegendItemRowStyle}>
                      <span style={getHelpLegendDotStyle("#8b5cf6")}></span>
                      <span>Фиолетовый — Wiley (кандидаты)</span>
                    </div>
                    <div style={helpLegendItemRowStyle}>
                      <span style={getHelpLegendDotStyle("#ef4444")}></span>
                      <span>Красный — исключённые</span>
                    </div>
                    <div style={helpLegendItemRowStyle}>
                      <span style={getHelpLegendDotStyle("#f97316")}></span>
                      <span>Оранжевый — ссылки (references)</span>
                    </div>
                    <div style={helpLegendItemRowStyle}>
                      <span style={getHelpLegendDotStyle("#ec4899")}></span>
                      <span>Розовый — статьи, цитирующие вашу базу</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconPlay size="sm" style={getHelpIconStyle("#3b82f6")} />
                    <strong>Действия</strong>
                  </div>
                  <div style={helpActionsListStyle}>
                    <p style={helpActionRowStyle}>
                      • <strong>Клик</strong> — показать информацию о статье
                    </p>
                    <p style={helpActionRowStyle}>
                      • <strong>Alt + клик</strong> — открыть статью в
                      PubMed/DOI
                    </p>
                    <p style={helpActionRowStyle}>
                      • <strong>Перетаскивание</strong> — перемещать узлы
                    </p>
                    <p style={helpActionRowStyle}>
                      • <strong>Колёсико мыши</strong> — масштабирование
                    </p>
                  </div>
                </div>

                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconRefresh
                      size="sm"
                      style={getHelpIconStyle("#3b82f6")}
                    />
                    <strong>Загрузка связей</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Нажмите «Обновить связи» для загрузки информации о ссылках и
                    цитированиях. Для PubMed статей данные берутся из PubMed
                    API, для DOAJ/Wiley — из Crossref по DOI. Это позволяет
                    видеть, на какие статьи ссылаются ваши работы.
                  </p>
                </div>

                {/* Семантический поиск */}
                <div style={helpDividerSectionStyle}>
                  <div style={helpSectionHeadingStyle}>
                    <IconSearch size="sm" style={getHelpIconStyle("#10b981")} />
                    <strong>Семантический поиск (Сем.)</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Поиск статей по смыслу с помощью AI-эмбеддингов. Находит
                    похожие статьи даже без прямых цитирований. Сначала создайте
                    эмбеддинги для статей, затем используйте поиск.
                  </p>
                </div>

                {/* Семантические кластеры */}
                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconGraph size="sm" style={getHelpIconStyle("#6366f1")} />
                    <strong>Семантические кластеры (Кластеры)</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Автоматическая группировка статей по тематике с помощью
                    K-Means кластеризации эмбеддингов. Каждый кластер получает
                    название, цвет и центральную (наиболее типичную) статью.
                    Кликните на кластер, чтобы увидеть все его статьи.
                  </p>
                </div>

                {/* Gap Analysis */}
                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconExclamation
                      size="sm"
                      style={getHelpIconStyle("#f59e0b")}
                    />
                    <strong>Анализ пробелов (Gaps)</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Находит "мосты" между кластерами — статьи, которые
                    семантически близки к нескольким тематическим группам.
                    Помогает выявить междисциплинарные работы и потенциальные
                    пробелы в вашем обзоре.
                  </p>
                </div>

                {/* Методологический фильтр */}
                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconFilter size="sm" style={getHelpIconStyle("#ec4899")} />
                    <strong>Методологический фильтр (Метод.)</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Фильтрация статей по типу исследования: мета-анализы, РКИ
                    (рандомизированные контролируемые исследования),
                    систематические обзоры, когортные исследования и другие. Тип
                    определяется автоматически по названию и аннотации.
                  </p>
                </div>

                {/* AI рекомендации */}
                <div>
                  <div style={helpSectionHeadingStyle}>
                    <IconSparkles
                      size="sm"
                      style={getHelpIconStyle("#8b5cf6")}
                    />
                    <strong>AI-помощник</strong>
                  </div>
                  <p style={helpSectionParagraphStyle}>
                    Умный поиск статей с помощью нейросетей. Опишите, что ищете,
                    и AI найдёт релевантные статьи в вашем графе, а также
                    предложит рекомендации по улучшению обзора.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                style={helpCloseButtonStyle}
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
