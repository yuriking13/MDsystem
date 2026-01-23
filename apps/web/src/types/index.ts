/**
 * Общие типы для веб-приложения
 */

// Статья
export interface Article {
  id: string;
  pmid?: string;
  doi?: string;
  title_en: string;
  title_ru?: string;
  abstract_en?: string;
  abstract_ru?: string;
  authors?: string[];
  year?: number;
  journal?: string;
  url?: string;
  source: "pubmed" | "doaj" | "wiley" | "crossref";
  has_stats: boolean;
  stats_json?: Record<string, unknown>;
  stats_quality?: number;
  publication_types?: string[];
  volume?: string;
  issue?: string;
  pages?: string;
  created_at: string;
  updated_at?: string;
}

// Статья в проекте
export interface ProjectArticle {
  project_id: string;
  article_id: string;
  status: ArticleStatus;
  notes?: string;
  tags?: string[];
  added_by?: string;
  added_at: string;
  source_query?: string;
  article: Article;
}

// Статусы статей
export type ArticleStatus = "candidate" | "selected" | "excluded" | "deleted";

// Документ
export interface Document {
  id: string;
  project_id: string;
  title: string;
  content?: string;
  order_index: number;
  parent_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

// Цитата
export interface Citation {
  id: string;
  document_id: string;
  article_id: string;
  order_index: number;
  inline_number?: number;
  sub_number?: number;
  page_range?: string;
  note?: string;
  article?: Article;
}

// Статистика проекта
export interface ProjectStatistic {
  id: string;
  project_id: string;
  type: "chart" | "table";
  title: string;
  description?: string;
  config: Record<string, unknown>;
  table_data?: Record<string, unknown>;
  data_classification?: DataClassification;
  chart_type?: string;
  used_in_documents?: string[];
  order_index: number;
  created_at: string;
  updated_at?: string;
  version: number;
}

// Классификация данных
export interface DataClassification {
  variableType: "quantitative" | "qualitative";
  subType: "continuous" | "discrete" | "nominal" | "dichotomous" | "ordinal";
  isNormalDistribution?: boolean;
}

// Файл проекта
export interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  category?: string;
  description?: string;
  storage_path?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at?: string;
}

// Член проекта
export interface ProjectMember {
  user_id: string;
  email: string;
  role: ProjectRole;
  joined_at: string;
}

// Роли в проекте
export type ProjectRole = "owner" | "editor" | "viewer";

// Стили цитирования
export type CitationStyle = "gost-r-7-0-5-2008" | "gost" | "apa" | "vancouver";

// Типы исследований
export type ResearchType =
  | "observational_descriptive"
  | "observational_analytical"
  | "experimental"
  | "second_order"
  | "other";

// Протоколы исследований
export type ResearchProtocol = "CARE" | "STROBE" | "CONSORT" | "PRISMA" | "OTHER";

// Пагинация
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Ответ с пагинацией
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Результат поиска
export interface SearchResult {
  articles: Article[];
  total: number;
  sources: {
    pubmed?: number;
    doaj?: number;
    wiley?: number;
  };
}

// Прогресс операции
export interface OperationProgress {
  current: number;
  total: number;
  phase?: string;
  message?: string;
}
