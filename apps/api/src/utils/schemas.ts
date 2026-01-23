/**
 * Общие Zod схемы валидации для API routes
 * Предотвращает дублирование кода и обеспечивает единообразие
 */

import { z } from "zod";

// Базовые схемы идентификаторов
export const UuidSchema = z.string().uuid();

export const ProjectIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ProjectIdPathSchema = z.object({
  projectId: z.string().uuid(),
});

// Статусы статей
export const ArticleStatusEnum = z.enum(["candidate", "selected", "excluded", "deleted"]);
export type ArticleStatus = z.infer<typeof ArticleStatusEnum>;

// Источники поиска
export const SEARCH_SOURCES = ["pubmed", "doaj", "wiley"] as const;
export const SearchSourceEnum = z.enum(SEARCH_SOURCES);
export type SearchSource = z.infer<typeof SearchSourceEnum>;

// Поля поиска PubMed
export const PUBMED_SEARCH_FIELDS = [
  "All Fields",
  "Title",
  "Title/Abstract",
  "Text Word",
  "Author",
  "Author - First",
  "Author - Last",
  "Journal",
  "MeSH Terms",
  "MeSH Major Topic",
  "Affiliation",
  "Publication Type",
  "Language",
] as const;
export const PubMedSearchFieldEnum = z.enum(PUBMED_SEARCH_FIELDS);

// Стили цитирования
export const CITATION_STYLES = [
  "gost-r-7-0-5-2008",
  "gost",
  "apa",
  "vancouver",
] as const;
export const CitationStyleEnum = z.enum(CITATION_STYLES);
export type CitationStyle = z.infer<typeof CitationStyleEnum>;

// Типы исследований
export const RESEARCH_TYPES = [
  "observational_descriptive",
  "observational_analytical",
  "experimental",
  "second_order",
  "other",
] as const;
export const ResearchTypeEnum = z.enum(RESEARCH_TYPES);

// Протоколы исследований
export const RESEARCH_PROTOCOLS = ["CARE", "STROBE", "CONSORT", "PRISMA", "OTHER"] as const;
export const ResearchProtocolEnum = z.enum(RESEARCH_PROTOCOLS);

// Классификация данных для статистики
export const DataClassificationSchema = z.object({
  variableType: z.enum(["quantitative", "qualitative"]),
  subType: z.enum(["continuous", "discrete", "nominal", "dichotomous", "ordinal"]),
  isNormalDistribution: z.boolean().optional(),
});

// Пагинация
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// Сортировка
export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Фильтры статей
export const ArticleFiltersSchema = z.object({
  status: ArticleStatusEnum.optional(),
  hasStats: z.coerce.boolean().optional(),
  yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
  search: z.string().max(500).optional(),
});

// Общие ответы об ошибках
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
