import type {
  GraphNode,
  GraphLink,
  ClusterInfo,
  EmbeddingJobResponse,
  SearchSuggestion,
  FoundArticle,
  GraphArticleForAI,
  GraphFiltersForAI,
  ClusterInfoForAI,
  GapInfoForAI,
  GraphRecommendation,
  SemanticSearchResult,
  EmbeddingStatsResponse,
  MissingArticlesStatsResponse,
  MethodologyCluster,
  SemanticNeighborsResponse,
  SemanticCluster,
  GapAnalysisItem,
  SmartSemanticSearchResult,
} from "../../lib/api";
import type { GraphNodeWithCoords, ClusterArticleDetail } from "../../types";

export type { GraphNodeWithCoords, ClusterArticleDetail };

export type {
  GraphNode,
  GraphLink,
  ClusterInfo,
  EmbeddingJobResponse,
  SearchSuggestion,
  FoundArticle,
  GraphArticleForAI,
  GraphFiltersForAI,
  ClusterInfoForAI,
  GapInfoForAI,
  GraphRecommendation,
  SemanticSearchResult,
  EmbeddingStatsResponse,
  MissingArticlesStatsResponse,
  MethodologyCluster,
  SemanticNeighborsResponse,
  SemanticCluster,
  GapAnalysisItem,
  SmartSemanticSearchResult,
};

export type Props = {
  projectId: string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type FilterType = "all" | "selected" | "excluded";
export type DepthType = 1 | 2 | 3;

// Тип для статуса загрузки
export type FetchJobStatus = {
  isRunning: boolean;
  progress: number;
  elapsedSeconds: number;
  status?: string;
  totalArticles?: number;
  processedArticles?: number;
  message?: string;
  // Новые поля для детального прогресса
  currentPhase?: string;
  phaseProgress?: string;
  secondsSinceProgress?: number | null;
  isStalled?: boolean;
  cancelReason?: string;
};

// Тип для семантического edge
export type SemanticEdge = {
  source: string;
  target: string;
  similarity: number;
};

// Тип для AI чата
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Тип для настроек визуализации
export type VisualizationSettings = {
  edgeOpacity: number;
  nodeSize: number;
  linkDistance: number;
  chargeStrength: number;
  showLabels: boolean;
  labelSize: number;
};

// Тип для данных обогащения узла
export type EnrichedNodeData = {
  title: string | null;
  title_ru: string | null;
  abstract: string | null;
  abstract_ru: string | null;
  authors: string | null;
  journal: string | null;
  year: number | null;
  doi: string | null;
  citedByCount: number;
};
