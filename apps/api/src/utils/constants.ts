/**
 * Общие константы для API приложения
 * Централизованное хранение значений, используемых в разных частях приложения
 */

// HTTP коды ошибок
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Роли в проекте
export const PROJECT_ROLES = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type ProjectRole = typeof PROJECT_ROLES[keyof typeof PROJECT_ROLES];

// Статусы статей
export const ARTICLE_STATUSES = {
  CANDIDATE: "candidate",
  SELECTED: "selected",
  EXCLUDED: "excluded",
  DELETED: "deleted",
} as const;

export type ArticleStatus = typeof ARTICLE_STATUSES[keyof typeof ARTICLE_STATUSES];

// Источники данных
export const DATA_SOURCES = {
  PUBMED: "pubmed",
  DOAJ: "doaj",
  WILEY: "wiley",
  CROSSREF: "crossref",
} as const;

export type DataSource = typeof DATA_SOURCES[keyof typeof DATA_SOURCES];

// Стили цитирования
export const CITATION_STYLES = {
  GOST_2008: "gost-r-7-0-5-2008",
  GOST: "gost",
  APA: "apa",
  VANCOUVER: "vancouver",
} as const;

export type CitationStyle = typeof CITATION_STYLES[keyof typeof CITATION_STYLES];

// Типы исследований
export const RESEARCH_TYPES = {
  OBSERVATIONAL_DESCRIPTIVE: "observational_descriptive",
  OBSERVATIONAL_ANALYTICAL: "observational_analytical",
  EXPERIMENTAL: "experimental",
  SECOND_ORDER: "second_order",
  OTHER: "other",
} as const;

export type ResearchType = typeof RESEARCH_TYPES[keyof typeof RESEARCH_TYPES];

// Протоколы исследований
export const RESEARCH_PROTOCOLS = {
  CARE: "CARE",
  STROBE: "STROBE",
  CONSORT: "CONSORT",
  PRISMA: "PRISMA",
  OTHER: "OTHER",
} as const;

export type ResearchProtocol = typeof RESEARCH_PROTOCOLS[keyof typeof RESEARCH_PROTOCOLS];

// Известные API провайдеры для ключей
export const KNOWN_API_PROVIDERS = ["pubmed", "wiley", "doaj", "openrouter"] as const;
export type ApiProvider = typeof KNOWN_API_PROVIDERS[number];

// Лимиты для запросов
export const LIMITS = {
  MAX_SEARCH_RESULTS: 10000,
  MAX_BATCH_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_FILE_SIZE_MB: 500,
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_NOTE_LENGTH: 5000,
  MIN_PASSWORD_LENGTH: 8,
  MIN_API_KEY_LENGTH: 20,
  MIN_ENCRYPTION_SECRET_LENGTH: 32,
} as const;

// Регулярные выражения для валидации
export const VALIDATION_PATTERNS = {
  // DOI формат: 10.xxxx/xxxxx
  DOI: /^10\.\d{4,}\/[^\s]+$/,
  // PMID - только цифры
  PMID: /^\d+$/,
  // API провайдер: [a-z0-9_-], 2-50 символов
  API_PROVIDER: /^[a-z0-9_-]{2,50}$/,
  // UUID v4
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "No edit access",
  NOT_FOUND: "Not found",
  PROJECT_NOT_FOUND: "Project not found",
  ARTICLE_NOT_FOUND: "Article not found",
  DOCUMENT_NOT_FOUND: "Document not found",
  INVALID_PROJECT_ID: "Invalid project ID",
  INVALID_ARTICLE_ID: "Invalid article ID",
  INVALID_BODY: "Invalid request body",
  INVALID_PARAMS: "Invalid request parameters",
  ARTICLE_ALREADY_ADDED: "Article already added to this project",
} as const;
