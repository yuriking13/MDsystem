/**
 * Индексный файл для утилит API
 * Упрощает импорты из папки utils
 */

// Константы (основной источник типов и констант)
export * from "./constants.js";

// Схемы Zod (переименовываем конфликтующие экспорты)
export {
  UuidSchema,
  ProjectIdParamsSchema,
  ProjectIdPathSchema,
  ArticleStatusEnum,
  SearchSourceEnum,
  SEARCH_SOURCES,
  PUBMED_SEARCH_FIELDS,
  PubMedSearchFieldEnum,
  CitationStyleEnum,
  ResearchTypeEnum,
  ResearchProtocolEnum,
  DataClassificationSchema,
  PaginationSchema,
  SortSchema,
  ArticleFiltersSchema,
  ApiErrorSchema,
  type ApiError,
} from "./schemas.js";

// Проверка доступа к проекту (с кэшированием)
export {
  checkProjectAccessPool,
  checkProjectAccessPrisma,
  getUserApiKey,
  invalidateProjectAccess,
  getAccessCacheStats,
  type ProjectAccessResult,
} from "./project-access.js";

// Утилиты аутентификации
export { getAuthUser, type AuthUser } from "./authUser.js";

// Криптография API ключей
export { encryptApiKey, decryptApiKey } from "./apiKeyCrypto.js";

// Работа с БД
export { getDb } from "./db.js";

// Batch операции для статей (оптимизация N+1)
export {
  findExistingArticlesBatch,
  insertArticlesBatch,
  addArticlesToProjectBatch,
  updateArticleStatusBatch,
  getProjectArticlesBatch,
  checkArticlesInProjectBatch,
  type ArticleData,
  type BatchArticleResult,
} from "./batch-operations.js";

// Prepared statements для горячих путей
export {
  findArticleByPmid,
  findArticleByDoi,
  checkArticleInProject,
  getProjectMemberRole,
  countProjectArticlesByStatus,
  getProjectDocuments,
  getDocumentById,
  getDocumentCitations,
  getUserApiKeyEncrypted,
  getProjectStatistics,
  getProjectFiles,
  insertProjectArticle,
  updateProjectArticleStatus,
  getActiveGraphJob,
  getLastGraphJob,
} from "./prepared-statements.js";
