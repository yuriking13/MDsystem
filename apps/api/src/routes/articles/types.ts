import { z } from "zod";

// ==================== SEARCH CONSTANTS ====================

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

// Источники поиска
export const SEARCH_SOURCES = ["pubmed", "doaj", "wiley"] as const;

// ==================== VALIDATION SCHEMAS ====================

export const SearchBodySchema = z.object({
  query: z.string().min(1).max(1000),
  sources: z.array(z.enum(SEARCH_SOURCES)).min(1).default(["pubmed"]),
  filters: z
    .object({
      searchField: z.enum(PUBMED_SEARCH_FIELDS).optional(),
      yearFrom: z.number().int().min(1900).max(2100).optional(),
      yearTo: z.number().int().min(1900).max(2100).optional(),
      freeFullTextOnly: z.boolean().optional(),
      fullTextOnly: z.boolean().optional(),
      publicationTypes: z.array(z.string()).optional(),
      publicationTypesLogic: z.enum(["or", "and"]).optional(),
      translate: z.boolean().optional(),
      enrichByDOI: z.boolean().optional(),
      detectStats: z.boolean().optional(),
    })
    .optional(),
  maxResults: z.number().int().min(1).max(10000).default(100),
});

export const ArticleStatusSchema = z.object({
  status: z.enum(["candidate", "selected", "excluded", "deleted"]),
  notes: z.string().max(5000).optional(),
});

export const ProjectIdSchema = z.object({
  id: z.string().uuid(),
});

export const ArticleIdSchema = z.object({
  id: z.string().uuid(),
  articleId: z.string().uuid(),
});

export const ImportFromGraphSchema = z
  .object({
    pmids: z.array(z.string().trim()).max(100).optional(),
    dois: z.array(z.string().trim()).max(100).optional(),
    status: z.enum(["candidate", "selected"]).optional().default("candidate"),
  })
  .refine((data) => (data.pmids?.length || 0) + (data.dois?.length || 0) > 0, {
    message: "Передайте хотя бы один PMID или DOI",
  });

export const BatchUpdateStatusSchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(1000),
  status: z.enum(["candidate", "selected", "excluded", "deleted"]),
});

export const TranslateArticlesSchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(100),
});

export const EnrichByDOISchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(100),
});

export const DetectStatsSchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(50),
});

export const AISummarySchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(20),
  language: z.enum(["ru", "en"]).optional().default("ru"),
});

export const FetchReferencesSchema = z.object({
  articleIds: z.array(z.string().uuid()).min(1).max(50),
});

// ==================== TYPE EXPORTS ====================

export type SearchFilters = z.infer<typeof SearchBodySchema>["filters"];
export type ArticleStatus = z.infer<typeof ArticleStatusSchema>["status"];
export type SearchSource = (typeof SEARCH_SOURCES)[number];
export type PubMedSearchField = (typeof PUBMED_SEARCH_FIELDS)[number];
