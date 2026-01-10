import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { pubmedFetchAll, enrichArticlesWithReferences, europePMCGetCitationCounts, pubmedFetchByPmids, type PubMedArticle, type PubMedFilters } from "../lib/pubmed.js";
import { doajFetchAll, type DOAJArticle } from "../lib/doaj.js";
import { wileyFetchAll, type WileyArticle } from "../lib/wiley.js";
import { extractStats, hasAnyStats, calculateStatsQuality } from "../lib/stats.js";
import { translateArticlesBatchOptimized, type TranslationResult } from "../lib/translate.js";
import { findPdfSource, downloadPdf } from "../lib/pdf-download.js";
import { getCrossrefByDOI } from "../lib/crossref.js";
import { getBoss, startBoss } from "../worker/boss.js";
import { 
  cacheGet, 
  cacheSet, 
  cacheThrough, 
  invalidateArticles, 
  CACHE_KEYS, 
  TTL 
} from "../lib/redis.js";

// Поля поиска PubMed
const PUBMED_SEARCH_FIELDS = [
  'All Fields', 'Title', 'Title/Abstract', 'Text Word',
  'Author', 'Author - First', 'Author - Last',
  'Journal', 'MeSH Terms', 'MeSH Major Topic',
  'Affiliation', 'Publication Type', 'Language'
] as const;

// Источники поиска
const SEARCH_SOURCES = ['pubmed', 'doaj', 'wiley'] as const;
type SearchSource = typeof SEARCH_SOURCES[number];

// Схемы валидации
const SearchBodySchema = z.object({
  query: z.string().min(1).max(1000),
  sources: z.array(z.enum(SEARCH_SOURCES)).min(1).default(['pubmed']),
  filters: z.object({
    searchField: z.enum(PUBMED_SEARCH_FIELDS).optional(), // Поле поиска PubMed
    yearFrom: z.number().int().min(1900).max(2100).optional(),
    yearTo: z.number().int().min(1900).max(2100).optional(),
    freeFullTextOnly: z.boolean().optional(),
    fullTextOnly: z.boolean().optional(),
    publicationTypes: z.array(z.string()).optional(),
    publicationTypesLogic: z.enum(["or", "and"]).optional(),
    translate: z.boolean().optional(),
  }).optional(),
  maxResults: z.number().int().min(1).max(10000).default(100),
});

const ArticleStatusSchema = z.object({
  status: z.enum(["candidate", "selected", "excluded", "deleted"]),
  notes: z.string().max(5000).optional(),
});

const ProjectIdSchema = z.object({
  id: z.string().uuid(),
});

const ArticleIdSchema = z.object({
  id: z.string().uuid(),
  articleId: z.string().uuid(),
});

const ImportFromGraphSchema = z.object({
  pmids: z.array(z.string().trim()).max(100).optional(),
  dois: z.array(z.string().trim()).max(100).optional(),
  status: z.enum(["candidate", "selected"]).optional().default("candidate"),
}).refine((data) => (data.pmids?.length || 0) + (data.dois?.length || 0) > 0, {
  message: "Передайте хотя бы один PMID или DOI",
});

// Получить API ключ пользователя для провайдера
async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  if (res.rowCount === 0) return null;
  
  // Для PubMed ключ не шифруется критично, просто возвращаем
  // В реальности нужно расшифровать, но пока упрощаем
  const encrypted = res.rows[0].encrypted_key;
  
  // Расшифровка (импортируем функцию)
  try {
    const { decryptApiKey } = await import("../utils/apiKeyCrypto.js");
    return decryptApiKey(encrypted);
  } catch {
    return null;
  }
}

// Проверка доступа к проекту
async function checkProjectAccess(
  projectId: string, 
  userId: string, 
  requireEdit = false
): Promise<{ ok: boolean; role?: string }> {
  const res = await pool.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  if (res.rowCount === 0) return { ok: false };
  
  const role = res.rows[0].role;
  if (requireEdit && role === "viewer") return { ok: false, role };
  
  return { ok: true, role };
}

// Universal article type for all sources
type UniversalArticle = {
  pmid?: string;
  doi?: string;
  title: string;
  abstract?: string;
  authors?: string;
  journal?: string;
  year?: number;
  url: string;
  studyTypes?: string[];
  keywords?: string[];
  source: 'pubmed' | 'doaj' | 'wiley';
};

// Convert PubMed article to universal format
function pubmedToUniversal(article: PubMedArticle): UniversalArticle {
  return {
    pmid: article.pmid,
    doi: article.doi,
    title: article.title,
    abstract: article.abstract,
    authors: article.authors,
    journal: article.journal,
    year: article.year,
    url: article.url,
    studyTypes: article.studyTypes,
    source: 'pubmed',
  };
}

// Convert DOAJ article to universal format
function doajToUniversal(article: DOAJArticle): UniversalArticle {
  return {
    doi: article.doi,
    title: article.title,
    abstract: article.abstract,
    authors: article.authors,
    journal: article.journal,
    year: article.year,
    url: article.url,
    keywords: article.keywords,
    source: 'doaj',
  };
}

// Convert Wiley article to universal format
function wileyToUniversal(article: WileyArticle): UniversalArticle {
  return {
    doi: article.doi,
    title: article.title,
    abstract: article.abstract,
    authors: article.authors,
    journal: article.journal,
    year: article.year,
    url: article.url,
    source: 'wiley',
  };
}

// Найти или создать статью по DOI/PMID
// publicationTypes - типы, которые нужно ДОБАВИТЬ к существующим (не заменить)
async function findOrCreateArticle(article: PubMedArticle, publicationTypes?: string[]): Promise<string> {
  // Сначала ищем по PMID
  if (article.pmid) {
    const existing = await pool.query(
      `SELECT id, publication_types FROM articles WHERE pmid = $1`,
      [article.pmid]
    );
    if ((existing.rowCount ?? 0) > 0) {
      const articleId = existing.rows[0].id;
      // Если есть новые типы публикации - добавляем их к существующим
      if (publicationTypes && publicationTypes.length > 0) {
        const existingTypes: string[] = existing.rows[0].publication_types || [];
        const newTypes = [...new Set([...existingTypes, ...publicationTypes])];
        if (newTypes.length > existingTypes.length) {
          await pool.query(
            `UPDATE articles SET publication_types = $1 WHERE id = $2`,
            [newTypes, articleId]
          );
        }
      }
      return articleId;
    }
  }
  
  // Потом по DOI
  if (article.doi) {
    const existing = await pool.query(
      `SELECT id, publication_types FROM articles WHERE doi = $1`,
      [article.doi.toLowerCase()]
    );
    if ((existing.rowCount ?? 0) > 0) {
      const articleId = existing.rows[0].id;
      // Если есть новые типы публикации - добавляем их к существующим
      if (publicationTypes && publicationTypes.length > 0) {
        const existingTypes: string[] = existing.rows[0].publication_types || [];
        const newTypes = [...new Set([...existingTypes, ...publicationTypes])];
        if (newTypes.length > existingTypes.length) {
          await pool.query(
            `UPDATE articles SET publication_types = $1 WHERE id = $2`,
            [newTypes, articleId]
          );
        }
      }
      return articleId;
    }
  }
  
  // Извлекаем статистику
  const stats = extractStats(article.abstract);
  const hasStats = hasAnyStats(stats);
  const statsQuality = hasStats ? calculateStatsQuality(stats) : 0;
  
  // Создаём новую статью
  const authors = article.authors 
    ? article.authors.split(",").map(a => a.trim()).filter(Boolean)
    : null;
  
  // Типы публикации из статьи или переданные
  const pubTypes = publicationTypes || article.studyTypes || [];
  
  const res = await pool.query(
    `INSERT INTO articles (
      doi, pmid, title_en, abstract_en, authors, year, journal, url, source, 
      has_stats, stats_json, stats_quality, publication_types, raw_json, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id`,
    [
      article.doi?.toLowerCase() || null,
      article.pmid || null,
      article.title,
      article.abstract || null,
      authors,
      article.year || null,
      article.journal || null,
      article.url,
      "pubmed",
      hasStats,
      hasStats ? JSON.stringify(stats) : null,
      statsQuality,
      pubTypes.length > 0 ? pubTypes : null,
      JSON.stringify(article),
      new Date(), // created_at - дата обращения
    ]
  );
  
  return res.rows[0].id;
}

// Find or create article from universal format
async function findOrCreateUniversalArticle(article: UniversalArticle, publicationTypes?: string[]): Promise<string> {
  // First search by PMID
  if (article.pmid) {
    const existing = await pool.query(
      `SELECT id, publication_types FROM articles WHERE pmid = $1`,
      [article.pmid]
    );
    if ((existing.rowCount ?? 0) > 0) {
      const articleId = existing.rows[0].id;
      if (publicationTypes && publicationTypes.length > 0) {
        const existingTypes: string[] = existing.rows[0].publication_types || [];
        const newTypes = [...new Set([...existingTypes, ...publicationTypes])];
        if (newTypes.length > existingTypes.length) {
          await pool.query(
            `UPDATE articles SET publication_types = $1 WHERE id = $2`,
            [newTypes, articleId]
          );
        }
      }
      return articleId;
    }
  }
  
  // Then by DOI
  if (article.doi) {
    const existing = await pool.query(
      `SELECT id, publication_types FROM articles WHERE doi = $1`,
      [article.doi.toLowerCase()]
    );
    if ((existing.rowCount ?? 0) > 0) {
      const articleId = existing.rows[0].id;
      if (publicationTypes && publicationTypes.length > 0) {
        const existingTypes: string[] = existing.rows[0].publication_types || [];
        const newTypes = [...new Set([...existingTypes, ...publicationTypes])];
        if (newTypes.length > existingTypes.length) {
          await pool.query(
            `UPDATE articles SET publication_types = $1 WHERE id = $2`,
            [newTypes, articleId]
          );
        }
      }
      return articleId;
    }
  }
  
  // Extract statistics
  const stats = extractStats(article.abstract);
  const hasStats = hasAnyStats(stats);
  const statsQuality = hasStats ? calculateStatsQuality(stats) : 0;
  
  // Create new article
  const authors = article.authors 
    ? article.authors.split(",").map(a => a.trim()).filter(Boolean)
    : null;
  
  const pubTypes = publicationTypes || article.studyTypes || [];
  
  const res = await pool.query(
    `INSERT INTO articles (
      doi, pmid, title_en, abstract_en, authors, year, journal, url, source, 
      has_stats, stats_json, stats_quality, publication_types, raw_json, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id`,
    [
      article.doi?.toLowerCase() || null,
      article.pmid || null,
      article.title,
      article.abstract || null,
      authors,
      article.year || null,
      article.journal || null,
      article.url,
      article.source,
      hasStats,
      hasStats ? JSON.stringify(stats) : null,
      statsQuality,
      pubTypes.length > 0 ? pubTypes : null,
      JSON.stringify(article),
      new Date(),
    ]
  );
  
  return res.rows[0].id;
}

// Добавить статью в проект (с дедупликацией и сохранением поискового запроса)
async function addArticleToProject(
  projectId: string, 
  articleId: string, 
  userId: string,
  sourceQuery?: string,
  status: "candidate" | "selected" = "candidate"
): Promise<boolean> {
  // Проверяем, есть ли уже связь
  const existing = await pool.query(
    `SELECT 1 FROM project_articles WHERE project_id = $1 AND article_id = $2`,
    [projectId, articleId]
  );
  
  if ((existing.rowCount ?? 0) > 0) {
    return false; // Уже добавлена
  }
  
  // Проверяем наличие колонки source_query
  let hasSourceQuery = false;
  try {
    const checkCol = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'project_articles' AND column_name = 'source_query'`
    );
    hasSourceQuery = (checkCol.rowCount ?? 0) > 0;
  } catch {
    hasSourceQuery = false;
  }
  
  if (hasSourceQuery && sourceQuery) {
    await pool.query(
      `INSERT INTO project_articles (project_id, article_id, status, added_by, source_query)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, articleId, status, userId, sourceQuery]
    );
  } else {
    await pool.query(
      `INSERT INTO project_articles (project_id, article_id, status, added_by)
       VALUES ($1, $2, $3, $4)`,
      [projectId, articleId, status, userId]
    );
  }
  
  return true;
}

const plugin: FastifyPluginAsync = async (fastify) => {
  // POST /api/projects/:id/search - поиск статей в PubMed
  fastify.post(
    "/projects/:id/search",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const bodyP = SearchBodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body", details: bodyP.error.message });
      }
      
      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access to project" });
      }
      
      // Получить API ключ пользователя
      const apiKey = await getUserApiKey(userId, "pubmed");
      
      // Выбранные источники поиска
      const sources = bodyP.data.sources || ['pubmed'];
      
      // Формируем фильтры PubMed
      const filters: PubMedFilters = {};
      
      // Поле поиска (Title, Abstract, Author и т.д.)
      if (bodyP.data.filters?.searchField) {
        filters.searchField = bodyP.data.filters.searchField as PubMedFilters['searchField'];
      }
      
      if (bodyP.data.filters?.yearFrom) {
        filters.publishedFrom = `${bodyP.data.filters.yearFrom}/01/01`;
      }
      if (bodyP.data.filters?.yearTo) {
        filters.publishedTo = `${bodyP.data.filters.yearTo}/12/31`;
      }
      if (bodyP.data.filters?.freeFullTextOnly) {
        filters.freeFullTextOnly = true;
      }
      if (bodyP.data.filters?.fullTextOnly) {
        filters.fullTextOnly = true;
      }
      // Опция перевода
      const shouldTranslate = bodyP.data.filters?.translate === true;
      
      // Типы публикации из фильтров поиска
      const searchPubTypes = bodyP.data.filters?.publicationTypes || [];
      
      // Сохраняем поисковый запрос для группировки
      const searchQuery = bodyP.data.query;
      
      // Получаем PMIDs и DOIs статей, которые УЖЕ есть в проекте
      const existingInProjectRes = await pool.query(
        `SELECT a.pmid, a.doi FROM project_articles pa
         JOIN articles a ON a.id = pa.article_id
         WHERE pa.project_id = $1`,
        [paramsP.data.id]
      );
      const existingPmidsInProject = new Set<string>(
        existingInProjectRes.rows.map((r: { pmid: string | null }) => r.pmid).filter(Boolean) as string[]
      );
      const existingDoisInProject = new Set<string>(
        existingInProjectRes.rows.map((r: { doi: string | null }) => r.doi?.toLowerCase()).filter(Boolean) as string[]
      );
      
      // Запрашиваем больше статей, так как часть может быть уже в проекте
      const existingCount = existingPmidsInProject.size + existingDoisInProject.size;
      const searchMultiplier = Math.min(5, Math.max(2, Math.ceil(existingCount / bodyP.data.maxResults) + 1));
      const maxPerSource = Math.ceil(bodyP.data.maxResults / sources.length) * searchMultiplier;
      
      // Сохраняем статьи и добавляем в проект
      let added = 0;
      let skipped = 0;
      let totalCount = 0;
      let totalFetched = 0;
      const articleIds: string[] = [];
      const newArticleIds: string[] = []; // Новые статьи для перевода
      const processedPmids = new Set<string>(); // Для дедупликации между поисками
      const processedDois = new Set<string>(); // Для дедупликации по DOI
      
      // Целевое количество НОВЫХ статей для проекта
      const targetNewArticles = bodyP.data.maxResults;
      
      // Результаты по источникам
      const sourceResults: Record<string, { count: number; added: number }> = {};
      
      // ============ PUBMED SEARCH ============
      if (sources.includes('pubmed')) {
        sourceResults.pubmed = { count: 0, added: 0 };
        
        // Если выбрано несколько типов публикации - делаем ОТДЕЛЬНЫЙ поиск для каждого типа
        if (searchPubTypes.length > 1) {
          for (const pubType of searchPubTypes) {
            if (added >= targetNewArticles) break;
            
            const typeFilters = { ...filters, publicationTypes: [pubType] };
            
            try {
              const maxForType = Math.ceil(maxPerSource / searchPubTypes.length);
              
              const { count, items } = await pubmedFetchAll({
                apiKey: apiKey || undefined,
                topic: bodyP.data.query,
                filters: typeFilters,
                maxTotal: maxForType,
                throttleMs: apiKey ? 100 : 350,
              });
              
              sourceResults.pubmed.count += count;
              totalCount += count;
              totalFetched += items.length;
              
              for (const article of items) {
                if (added >= targetNewArticles) break;
                
                try {
                  const pmid = article.pmid;
                  
                  if (!pmid || processedPmids.has(pmid)) continue;
                  processedPmids.add(pmid);
                  if (article.doi) processedDois.add(article.doi.toLowerCase());
                  
                  if (existingPmidsInProject.has(pmid)) {
                    await findOrCreateArticle(article, [pubType]);
                    skipped++;
                    continue;
                  }
                  
                  const articleId = await findOrCreateArticle(article, [pubType]);
                  articleIds.push(articleId);
                  
                  const wasAdded = await addArticleToProject(paramsP.data.id, articleId, userId, searchQuery);
                  if (wasAdded) {
                    added++;
                    sourceResults.pubmed.added++;
                    newArticleIds.push(articleId);
                    existingPmidsInProject.add(pmid);
                  } else {
                    skipped++;
                  }
                } catch (err) {
                  console.error("Error saving article:", err);
                }
              }
            } catch (err) {
              console.error(`Error searching PubMed for ${pubType}:`, err);
            }
          }
        } else {
          if (searchPubTypes.length === 1) {
            filters.publicationTypes = searchPubTypes;
          }
          
          try {
            const { count, items } = await pubmedFetchAll({
              apiKey: apiKey || undefined,
              topic: bodyP.data.query,
              filters,
              maxTotal: maxPerSource,
              throttleMs: apiKey ? 100 : 350,
            });
            
            sourceResults.pubmed.count = count;
            totalCount += count;
            totalFetched += items.length;
            
            for (const article of items) {
              if (added >= targetNewArticles) break;
              
              try {
                const pmid = article.pmid;
                
                if (pmid) {
                  if (processedPmids.has(pmid)) continue;
                  processedPmids.add(pmid);
                  if (existingPmidsInProject.has(pmid)) {
                    skipped++;
                    continue;
                  }
                }
                if (article.doi) processedDois.add(article.doi.toLowerCase());
                
                const articleId = await findOrCreateArticle(article, searchPubTypes.length === 1 ? searchPubTypes : undefined);
                articleIds.push(articleId);
                
                const wasAdded = await addArticleToProject(paramsP.data.id, articleId, userId, searchQuery);
                if (wasAdded) {
                  added++;
                  sourceResults.pubmed.added++;
                  newArticleIds.push(articleId);
                  if (pmid) existingPmidsInProject.add(pmid);
                } else {
                  skipped++;
                }
              } catch (err) {
                console.error("Error saving article:", err);
              }
            }
          } catch (err) {
            console.error("Error searching PubMed:", err);
          }
        }
      }
      
      // ============ DOAJ SEARCH ============
      if (sources.includes('doaj') && added < targetNewArticles) {
        sourceResults.doaj = { count: 0, added: 0 };
        
        try {
          const doajFilters = {
            publishedFrom: bodyP.data.filters?.yearFrom ? `${bodyP.data.filters.yearFrom}-01-01` : undefined,
            publishedTo: bodyP.data.filters?.yearTo ? `${bodyP.data.filters.yearTo}-12-31` : undefined,
          };
          
          const { count, items } = await doajFetchAll({
            topic: bodyP.data.query,
            filters: doajFilters,
            maxTotal: maxPerSource,
            throttleMs: 500,
          });
          
          sourceResults.doaj.count = count;
          totalCount += count;
          totalFetched += items.length;
          
          for (const article of items) {
            if (added >= targetNewArticles) break;
            
            try {
              const doi = article.doi?.toLowerCase();
              
              // Skip if already processed or exists
              if (doi && (processedDois.has(doi) || existingDoisInProject.has(doi))) {
                skipped++;
                continue;
              }
              if (doi) processedDois.add(doi);
              
              const universal = doajToUniversal(article);
              const articleId = await findOrCreateUniversalArticle(universal);
              articleIds.push(articleId);
              
              const wasAdded = await addArticleToProject(paramsP.data.id, articleId, userId, `${searchQuery} [DOAJ]`);
              if (wasAdded) {
                added++;
                sourceResults.doaj.added++;
                newArticleIds.push(articleId);
                if (doi) existingDoisInProject.add(doi);
              } else {
                skipped++;
              }
            } catch (err) {
              console.error("Error saving DOAJ article:", err);
            }
          }
        } catch (err) {
          console.error("Error searching DOAJ:", err);
        }
      }
      
      // ============ WILEY SEARCH ============
      if (sources.includes('wiley') && added < targetNewArticles) {
        sourceResults.wiley = { count: 0, added: 0 };
        
        try {
          const wileyFilters = {
            publishedFrom: bodyP.data.filters?.yearFrom ? `${bodyP.data.filters.yearFrom}-01-01` : undefined,
            publishedTo: bodyP.data.filters?.yearTo ? `${bodyP.data.filters.yearTo}-12-31` : undefined,
          };
          
          const { count, items } = await wileyFetchAll({
            topic: bodyP.data.query,
            filters: wileyFilters,
            maxTotal: maxPerSource,
            throttleMs: 500,
          });
          
          sourceResults.wiley.count = count;
          totalCount += count;
          totalFetched += items.length;
          
          for (const article of items) {
            if (added >= targetNewArticles) break;
            
            try {
              const doi = article.doi?.toLowerCase();
              
              // Skip if already processed or exists
              if (doi && (processedDois.has(doi) || existingDoisInProject.has(doi))) {
                skipped++;
                continue;
              }
              if (doi) processedDois.add(doi);
              
              const universal = wileyToUniversal(article);
              const articleId = await findOrCreateUniversalArticle(universal);
              articleIds.push(articleId);
              
              const wasAdded = await addArticleToProject(paramsP.data.id, articleId, userId, `${searchQuery} [Wiley]`);
              if (wasAdded) {
                added++;
                sourceResults.wiley.added++;
                newArticleIds.push(articleId);
                if (doi) existingDoisInProject.add(doi);
              } else {
                skipped++;
              }
            } catch (err) {
              console.error("Error saving Wiley article:", err);
            }
          }
        } catch (err) {
          console.error("Error searching Wiley:", err);
        }
      }
      
      // Перевод если запрошен
      let translated = 0;
      if (shouldTranslate && newArticleIds.length > 0) {
        const openrouterKey = await getUserApiKey(userId, "openrouter");
        
        if (openrouterKey) {
          // Получаем статьи без переводов
          const toTranslate = await pool.query(
            `SELECT id, title_en, abstract_en FROM articles 
             WHERE id = ANY($1) AND title_ru IS NULL`,
            [newArticleIds]
          );
          
          if (toTranslate.rows.length > 0) {
            try {
              // Переводим пакетами по 5 статей для надёжности
              const BATCH_SIZE = 5;
              for (let i = 0; i < toTranslate.rows.length; i += BATCH_SIZE) {
                const batch = toTranslate.rows.slice(i, i + BATCH_SIZE);
                
                const { results } = await translateArticlesBatchOptimized(
                  openrouterKey,
                  batch
                );
                
                // Сохраняем переводы
                for (const [articleId, tr] of results) {
                  if (tr.title_ru || tr.abstract_ru) {
                    await pool.query(
                      `UPDATE articles SET 
                        title_ru = COALESCE($1, title_ru), 
                        abstract_ru = COALESCE($2, abstract_ru)
                       WHERE id = $3`,
                      [tr.title_ru || null, tr.abstract_ru || null, articleId]
                    );
                    translated++;
                  }
                }
              }
            } catch (err) {
              console.error("Translation batch error:", err);
            }
          }
        }
      }
      
      // Обновляем updated_at проекта
      await pool.query(
        `UPDATE projects SET updated_at = now() WHERE id = $1`,
        [paramsP.data.id]
      );
      
      // Invalidate articles cache after adding new articles
      if (added > 0) {
        await invalidateArticles(paramsP.data.id);
      }
      
      // Build message with source breakdown
      let message = '';
      const sourceBreakdown: string[] = [];
      
      for (const [source, result] of Object.entries(sourceResults)) {
        const sourceName = source === 'pubmed' ? 'PubMed' : source === 'doaj' ? 'DOAJ' : 'Wiley';
        sourceBreakdown.push(`${sourceName}: ${result.added} из ${result.count}`);
      }
      
      if (sourceBreakdown.length > 1) {
        message = `Добавлено ${added} статей (${sourceBreakdown.join(', ')})`;
      } else {
        message = skipped > 0 
          ? `${added} новых статей добавлено, ${skipped} уже были в проекте`
          : `${added} статей добавлено`;
      }
      
      if (translated > 0) {
        message += `, ${translated} переведено`;
      }
      
      return {
        totalFound: totalCount,
        fetched: totalFetched,
        added,
        skipped,
        translated,
        sources: sourceResults,
        message,
      };
    }
  );

  // GET /api/projects/:id/articles - список статей проекта
  fastify.get(
    "/projects/:id/articles",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }
      
      // Query params для фильтрации
      const query = request.query as any;
      const status = query.status; // candidate, selected, excluded
      const hasStats = query.hasStats === "true";
      const sourceQuery = query.sourceQuery; // Фильтр по поисковому запросу
      
      // Build cache key based on filters
      const cacheKey = status 
        ? CACHE_KEYS.articlesStatus(paramsP.data.id, `${status}:${hasStats}:${sourceQuery || ''}`)
        : CACHE_KEYS.articles(paramsP.data.id);
      
      // Try cache first
      const cached = await cacheGet<any>(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Проверяем наличие колонки source_query
      let hasSourceQueryCol = false;
      try {
        const checkCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'project_articles' AND column_name = 'source_query'`
        );
        hasSourceQueryCol = (checkCol.rowCount ?? 0) > 0;
      } catch {
        hasSourceQueryCol = false;
      }
      
      let sql = `
        SELECT 
          a.id, a.doi, a.pmid, a.title_en, a.title_ru, 
          a.abstract_en, a.abstract_ru,
          a.authors, a.year, a.journal, a.url, a.source,
          a.has_stats, a.stats_json, a.stats_quality, a.publication_types,
          a.created_at,
          pa.status, pa.notes, pa.tags, pa.added_at
          ${hasSourceQueryCol ? ', pa.source_query' : ''}
        FROM project_articles pa
        JOIN articles a ON a.id = pa.article_id
        WHERE pa.project_id = $1
      `;
      const params: any[] = [paramsP.data.id];
      let paramIdx = 2;
      
      if (status && ["candidate", "selected", "excluded", "deleted"].includes(status)) {
        sql += ` AND pa.status = $${paramIdx++}`;
        params.push(status);
      } else if (!status) {
        // По умолчанию не показываем удалённые
        sql += ` AND pa.status != 'deleted'`;
      }
      
      if (hasStats) {
        sql += ` AND a.has_stats = true`;
      }
      
      // Фильтр по поисковому запросу
      if (hasSourceQueryCol && sourceQuery) {
        sql += ` AND pa.source_query = $${paramIdx++}`;
        params.push(sourceQuery);
      }
      
      sql += ` ORDER BY pa.added_at DESC`;
      
      const res = await pool.query(sql, params);
      
      // Подсчёт по статусам
      const countsRes = await pool.query(
        `SELECT status, COUNT(*)::int as count 
         FROM project_articles 
         WHERE project_id = $1 
         GROUP BY status`,
        [paramsP.data.id]
      );
      
      // Получить уникальные поисковые запросы
      let searchQueries: string[] = [];
      if (hasSourceQueryCol) {
        const queriesRes = await pool.query(
          `SELECT DISTINCT source_query FROM project_articles 
           WHERE project_id = $1 AND source_query IS NOT NULL
           ORDER BY source_query`,
          [paramsP.data.id]
        );
        searchQueries = queriesRes.rows.map((r: { source_query: string }) => r.source_query);
      }
      
      const counts: Record<string, number> = {
        candidate: 0,
        selected: 0,
        excluded: 0,
        deleted: 0,
      };
      for (const row of countsRes.rows) {
        counts[row.status] = row.count;
      }
      
      const result = {
        articles: res.rows,
        searchQueries,
        counts,
        total: res.rowCount,
      };
      
      // Cache the result (short TTL since data changes frequently)
      await cacheSet(cacheKey, result, TTL.SHORT);
      
      return result;
    }
  );

  // PATCH /api/projects/:id/articles/:articleId - изменить статус/заметки
  fastify.patch(
    "/projects/:id/articles/:articleId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ArticleIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }
      
      const bodyP = ArticleStatusSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }
      
      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      const res = await pool.query(
        `UPDATE project_articles 
         SET status = $1, notes = COALESCE($2, notes)
         WHERE project_id = $3 AND article_id = $4
         RETURNING *`,
        [bodyP.data.status, bodyP.data.notes, paramsP.data.id, paramsP.data.articleId]
      );
      
      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Article not found in project" });
      }
      
      // Invalidate articles cache
      await invalidateArticles(paramsP.data.id);
      
      return { ok: true, article: res.rows[0] };
    }
  );

  // DELETE /api/projects/:id/articles/:articleId - удалить из проекта
  fastify.delete(
    "/projects/:id/articles/:articleId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ArticleIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }
      
      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      await pool.query(
        `DELETE FROM project_articles WHERE project_id = $1 AND article_id = $2`,
        [paramsP.data.id, paramsP.data.articleId]
      );
      
      // Invalidate articles cache
      await invalidateArticles(paramsP.data.id);
      
      return { ok: true };
    }
  );

  // POST /api/projects/:id/articles/bulk-status - массовое изменение статуса
  fastify.post(
    "/projects/:id/articles/bulk-status",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const bodySchema = z.object({
        articleIds: z.array(z.string().uuid()).min(1).max(100),
        status: z.enum(["candidate", "selected", "excluded"]),
      });
      
      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      const res = await pool.query(
        `UPDATE project_articles 
         SET status = $1
         WHERE project_id = $2 AND article_id = ANY($3)`,
        [bodyP.data.status, paramsP.data.id, bodyP.data.articleIds]
      );
      
      // Invalidate articles cache
      if (res.rowCount && res.rowCount > 0) {
        await invalidateArticles(paramsP.data.id);
      }
      
      return { ok: true, updated: res.rowCount };
    }
  );

  // POST /api/projects/:id/articles/translate - перевод статей
  fastify.post(
    "/projects/:id/articles/translate",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const bodySchema = z.object({
        articleIds: z.array(z.string().uuid()).min(1).max(50).optional(),
        untranslatedOnly: z.boolean().default(true),
      });
      
      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      // Получить ключ OpenRouter
      const openrouterKey = await getUserApiKey(userId, "openrouter");
      if (!openrouterKey) {
        return reply.code(400).send({ 
          error: "OpenRouter API ключ не настроен. Добавьте его в настройках." 
        });
      }
      
      // Получить статьи для перевода
      let sql = `
        SELECT a.id, a.title_en, a.abstract_en 
        FROM articles a
        JOIN project_articles pa ON pa.article_id = a.id
        WHERE pa.project_id = $1
      `;
      const params: any[] = [paramsP.data.id];
      
      if (bodyP.data.articleIds?.length) {
        sql += ` AND a.id = ANY($2)`;
        params.push(bodyP.data.articleIds);
      }
      
      if (bodyP.data.untranslatedOnly) {
        sql += ` AND a.title_ru IS NULL`;
      }
      
      sql += ` LIMIT 200`; // Увеличенный лимит для перевода
      
      const toTranslate = await pool.query(sql, params);
      
      if (toTranslate.rows.length === 0) {
        return { 
          ok: true, 
          translated: 0, 
          message: "Нет статей для перевода" 
        };
      }
      
      // Переводим (маленькие батчи для надёжности)
      let translated = 0;
      const BATCH_SIZE = 5;
      
      for (let i = 0; i < toTranslate.rows.length; i += BATCH_SIZE) {
        const batch = toTranslate.rows.slice(i, i + BATCH_SIZE);
        
        try {
          const { results } = await translateArticlesBatchOptimized(
            openrouterKey,
            batch
          );
          
          for (const [articleId, tr] of results) {
            if (tr.title_ru || tr.abstract_ru) {
              await pool.query(
                `UPDATE articles SET 
                  title_ru = COALESCE($1, title_ru), 
                  abstract_ru = COALESCE($2, abstract_ru)
                 WHERE id = $3`,
                [tr.title_ru || null, tr.abstract_ru || null, articleId]
              );
              translated++;
            }
          }
        } catch (err) {
          console.error("Translation batch error:", err);
        }
      }
      
      return { 
        ok: true, 
        translated, 
        total: toTranslate.rows.length,
        message: `Переведено ${translated} из ${toTranslate.rows.length} статей` 
      };
    }
  );

  // POST /api/projects/:id/articles/enrich - обогащение данных через Crossref
  fastify.post(
    "/projects/:id/articles/enrich",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const bodySchema = z.object({
        articleIds: z.array(z.string().uuid()).min(1).max(50).optional(),
      });
      
      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      // Импортируем Crossref
      const { enrichArticleByDOI } = await import("../lib/crossref.js");
      
      // Получить статьи с DOI для обогащения
      let sql = `
        SELECT a.id, a.doi 
        FROM articles a
        JOIN project_articles pa ON pa.article_id = a.id
        WHERE pa.project_id = $1 AND a.doi IS NOT NULL
      `;
      const params: any[] = [paramsP.data.id];
      
      if (bodyP.data.articleIds?.length) {
        sql += ` AND a.id = ANY($2)`;
        params.push(bodyP.data.articleIds);
      }
      
      sql += ` LIMIT 500`; // Увеличенный лимит
      
      const toEnrich = await pool.query(sql, params);
      
      if (toEnrich.rows.length === 0) {
        return { 
          ok: true, 
          enriched: 0, 
          message: "Нет статей с DOI для обогащения" 
        };
      }
      
      // Обогащаем
      let enriched = 0;
      
      for (const row of toEnrich.rows) {
        try {
          const data = await enrichArticleByDOI(row.doi);
          
          if (data) {
            // Сохраняем обогащённые данные в raw_json
            await pool.query(
              `UPDATE articles SET 
                raw_json = raw_json || $1::jsonb
               WHERE id = $2`,
              [
                JSON.stringify({ crossref: data }),
                row.id,
              ]
            );
            enriched++;
          }
          
          // Задержка чтобы не превысить лимиты API
          await new Promise((r) => setTimeout(r, 100));
        } catch (err) {
          console.error(`Enrich error for ${row.doi}:`, err);
        }
      }
      
      return { 
        ok: true, 
        enriched, 
        total: toEnrich.rows.length,
        message: `Обогащено ${enriched} из ${toEnrich.rows.length} статей` 
      };
    }
  );

  // POST /api/projects/:id/articles/fetch-references - запуск фоновой загрузки связей
  // Body: { selectedOnly?: boolean, articleIds?: string[] }
  // - selectedOnly: загружать связи только для отобранных (selected) статей
  // - articleIds: загружать связи только для указанных статей
  fastify.post(
    "/projects/:id/articles/fetch-references",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      // Парсим body для дополнительных параметров
      const bodySchema = z.object({
        selectedOnly: z.boolean().optional(),
        articleIds: z.array(z.string().uuid()).optional(),
      });
      const bodyP = bodySchema.safeParse(request.body || {});
      const selectedOnly = bodyP.success ? bodyP.data.selectedOnly : false;
      const articleIds = bodyP.success ? bodyP.data.articleIds : undefined;
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      // Проверяем существование колонок reference_pmids
      try {
        const checkCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'articles' AND column_name = 'reference_pmids'`
        );
        if ((checkCol.rowCount ?? 0) === 0) {
          return reply.code(400).send({ 
            error: "Требуется миграция базы данных",
            message: "Выполните SQL миграцию add_article_references.sql для добавления колонок reference_pmids и cited_by_pmids" 
          });
        }
      } catch {
        return reply.code(500).send({ error: "Ошибка проверки схемы БД" });
      }
      
      // Проверяем есть ли уже запущенный job
      const runningJob = await pool.query(
        `SELECT id FROM graph_fetch_jobs 
         WHERE project_id = $1 AND status IN ('pending', 'running')
         LIMIT 1`,
        [paramsP.data.id]
      );
      
      if (runningJob.rows.length > 0) {
        return reply.code(409).send({ 
          error: "Загрузка уже запущена",
          jobId: runningJob.rows[0].id,
          message: "Дождитесь завершения текущей загрузки" 
        });
      }
      
      // Подсчитываем ВСЕ статьи проекта и статьи с PMID отдельно
      let totalCountSql = `SELECT COUNT(*) as cnt FROM project_articles pa WHERE pa.project_id = $1`;
      const totalCountParams: any[] = [paramsP.data.id];
      
      if (selectedOnly) {
        totalCountSql += ` AND pa.status = 'selected'`;
      }
      
      const totalCountRes = await pool.query(totalCountSql, totalCountParams);
      const totalProjectArticles = parseInt(totalCountRes.rows[0]?.cnt || '0');
      
      // Подсчитываем статьи с PMID для оценки времени (с учётом фильтров)
      let countSql = `SELECT COUNT(*) as cnt FROM articles a
         JOIN project_articles pa ON pa.article_id = a.id
         WHERE pa.project_id = $1 AND a.pmid IS NOT NULL`;
      const countParams: any[] = [paramsP.data.id];
      let paramIdx = 2;
      
      if (selectedOnly) {
        countSql += ` AND pa.status = 'selected'`;
      }
      if (articleIds && articleIds.length > 0) {
        countSql += ` AND a.id = ANY($${paramIdx++})`;
        countParams.push(articleIds);
      }
      
      const countRes = await pool.query(countSql, countParams);
      const totalArticles = parseInt(countRes.rows[0]?.cnt || '0');
      
      // Статьи без PMID (из DOAJ, Wiley, Crossref и т.д.)
      const articlesWithoutPmid = totalProjectArticles - totalArticles;
      
      if (totalArticles === 0) {
        return { 
          ok: true, 
          message: articlesWithoutPmid > 0
            ? `Нет статей с PMID для загрузки связей. ${articlesWithoutPmid} статей из других источников (DOAJ, Wiley, Crossref) не имеют PMID.`
            : "Нет статей с PMID для загрузки связей"
        };
      }
      
      // Создаём job в БД
      const jobRes = await pool.query(
        `INSERT INTO graph_fetch_jobs (project_id, status, total_articles) 
         VALUES ($1, 'pending', $2) 
         RETURNING id`,
        [paramsP.data.id, totalArticles]
      );
      const jobId = jobRes.rows[0].id;
      
      // Запускаем фоновый воркер
      let boss;
      try {
        fastify.log.info('[fetch-references] Attempting to start pg-boss');
        boss = await startBoss();
        fastify.log.info('[fetch-references] pg-boss started successfully');
      } catch (err) {
        fastify.log.error({ err }, '[fetch-references] Failed to start pg-boss');
        return reply.code(500).send({ error: 'Failed to start background job queue' });
      }
      
      try {
        fastify.log.info({ jobId, projectId: paramsP.data.id }, '[fetch-references] Attempting to send job to pg-boss');
        const jobData = {
          projectId: paramsP.data.id,
          jobId,
          userId,
          selectedOnly: selectedOnly || false,
          articleIds: articleIds || null,
        };
        fastify.log.info({ jobData }, '[fetch-references] Job data prepared');
        
        fastify.log.info('[fetch-references] Calling boss.send()...');
        const sendResult = await boss.send('graph:fetch-references', jobData);
        fastify.log.info({ 
          jobId, 
          sendResult, 
          sendResultType: typeof sendResult,
          sendResultKeys: sendResult ? Object.keys(sendResult) : null,
          sendResultValue: JSON.stringify(sendResult, null, 2)
        }, '[fetch-references] boss.send() completed');
        
        // Verify: check all tables in boss schema
        const tableCheck = await pool.query(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'boss' ORDER BY tablename`
        );
        fastify.log.info({ 
          tables: tableCheck.rows.map(r => r.tablename)
        }, '[fetch-references] Boss tables');
        
        // Check if job was inserted into any table
        const jobCount = await pool.query(
          `SELECT COUNT(*) as cnt FROM boss.job`
        );
        fastify.log.info({ 
          jobCount: jobCount.rows[0].cnt
        }, '[fetch-references] Total jobs in boss.job');
        
      } catch (err) {
        fastify.log.error({ 
          err, 
          jobId, 
          errMessage: err instanceof Error ? err.message : String(err),
          errStack: err instanceof Error ? err.stack : undefined
        }, '[fetch-references] Failed to enqueue graph:fetch-references job');
        return reply.code(500).send({ error: 'Failed to enqueue background job' });
      }
      
      // Оценка времени: ~0.5 сек на статью для references + ~0.3 сек на PMID для кэша
      const estimatedSeconds = Math.ceil(totalArticles * 0.8);
      
      // Формируем сообщение с учётом статей без PMID
      let message = `Запущена фоновая загрузка связей для ${totalArticles} статей с PMID.`;
      if (articlesWithoutPmid > 0) {
        message += ` ${articlesWithoutPmid} статей без PMID (DOAJ, Wiley, Crossref) пропущено.`;
      }
      message += ` Примерное время: ${Math.ceil(estimatedSeconds / 60)} мин.`;
      
      return { 
        ok: true, 
        jobId,
        totalArticles,
        totalProjectArticles,
        articlesWithoutPmid,
        estimatedSeconds,
        message
      };
    }
  );

  // GET /api/projects/:id/articles/fetch-references/status - статус загрузки
  fastify.get(
    "/projects/:id/articles/fetch-references/status",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId, false);
      if (!access.ok) {
        return reply.code(403).send({ error: "No access" });
      }
      
      // Получаем последний job
      const jobRes = await pool.query(
        `SELECT * FROM graph_fetch_jobs 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [paramsP.data.id]
      );
      
      if (jobRes.rows.length === 0) {
        return { hasJob: false };
      }
      
      const job = jobRes.rows[0];
      
      // Проверяем на зависание: если job running, но last_progress_at > 60 сек назад
      const STALL_TIMEOUT_SEC = 60;
      let isStalled = false;
      let stalledSeconds = 0;
      
      if (job.status === 'running' && job.last_progress_at) {
        stalledSeconds = Math.round((Date.now() - new Date(job.last_progress_at).getTime()) / 1000);
        isStalled = stalledSeconds > STALL_TIMEOUT_SEC;
        
        // Автоматически отменяем зависший job
        if (isStalled) {
          await pool.query(
            `UPDATE graph_fetch_jobs SET 
              status = 'cancelled',
              cancelled_at = now(),
              cancel_reason = 'stalled',
              error_message = 'Загрузка автоматически отменена: нет прогресса более 60 секунд. Попробуйте снова позже.'
             WHERE id = $1`,
            [job.id]
          );
          
          return {
            hasJob: true,
            jobId: job.id,
            status: 'cancelled',
            progress: 0,
            totalArticles: job.total_articles,
            processedArticles: job.processed_articles,
            totalPmidsToFetch: job.total_pmids_to_fetch,
            fetchedPmids: job.fetched_pmids,
            elapsedSeconds: job.started_at 
              ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
              : 0,
            startedAt: job.started_at,
            completedAt: new Date().toISOString(),
            errorMessage: 'Загрузка автоматически отменена: нет прогресса более 60 секунд. Попробуйте снова позже.',
            isStalled: true,
            stalledSeconds,
            cancelReason: 'stalled',
          };
        }
      }
      
      // Вычисляем прогресс
      const progress = job.total_articles > 0 
        ? Math.round((job.processed_articles / job.total_articles) * 50 + 
                     (job.fetched_pmids / Math.max(job.total_pmids_to_fetch, 1)) * 50)
        : 0;
      
      // Вычисляем прошедшее время
      const elapsedSeconds = job.started_at 
        ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
        : 0;
      
      // Извлекаем текущую фазу из error_message (используется для прогресса)
      let currentPhase: string | null = null;
      let phaseProgress: string | null = null;
      if (job.status === 'running' && job.error_message?.startsWith('[Phase:')) {
        const match = job.error_message.match(/\[Phase: ([^\]]+)\]\s*(.*)/);
        if (match) {
          currentPhase = match[1];
          phaseProgress = match[2] || null;
        }
      }
      
      return {
        hasJob: true,
        jobId: job.id,
        status: job.status,
        progress: Math.min(progress, 100),
        totalArticles: job.total_articles,
        processedArticles: job.processed_articles,
        totalPmidsToFetch: job.total_pmids_to_fetch,
        fetchedPmids: job.fetched_pmids,
        elapsedSeconds,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorMessage: job.status === 'running' ? null : job.error_message, // Не показываем phase info как error
        currentPhase,
        phaseProgress,
        lastProgressAt: job.last_progress_at,
        secondsSinceProgress: job.last_progress_at 
          ? Math.round((Date.now() - new Date(job.last_progress_at).getTime()) / 1000)
          : null,
        isStalled: false,
        cancelReason: job.cancel_reason,
      };
    }
  );
  
  // POST /api/projects/:id/articles/fetch-references/cancel - отмена загрузки
  fastify.post(
    "/projects/:id/articles/fetch-references/cancel",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      // Отменяем активный job
      const result = await pool.query(
        `UPDATE graph_fetch_jobs SET 
          status = 'cancelled',
          cancelled_at = now(),
          cancel_reason = 'user_cancelled',
          error_message = 'Загрузка отменена пользователем'
         WHERE project_id = $1 AND status IN ('pending', 'running')
         RETURNING id`,
        [paramsP.data.id]
      );
      
      if (result.rowCount === 0) {
        return reply.code(404).send({ error: "Нет активной загрузки для отмены" });
      }
      
      return {
        ok: true,
        jobId: result.rows[0].id,
        message: "Загрузка отменена. Вы можете запустить её снова."
      };
    }
  );

  // POST /api/projects/:id/articles/import-from-graph - добавить статьи, найденные в графе, в кандидаты или отобранные
  fastify.post(
    "/projects/:id/articles/import-from-graph",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const bodyP = ImportFromGraphSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body", details: bodyP.error.message });
      }

      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const pmids = Array.from(new Set((bodyP.data.pmids || []).map((p) => p.trim()).filter(Boolean))).slice(0, 100);
      const dois = Array.from(new Set((bodyP.data.dois || []).map((d) => d.trim().toLowerCase()).filter(Boolean))).slice(0, 100);
      const importStatus = bodyP.data.status || "candidate";

      if (pmids.length === 0 && dois.length === 0) {
        return reply.code(400).send({ error: "Ничего не передано" });
      }

      const apiKey = await getUserApiKey(userId, "pubmed");

      let added = 0;
      let skipped = 0;

      // Для отслеживания уже обработанных DOI (могут прийти из PubMed)
      const handledDois = new Set<string>();

      // Обработчик добавления в проект
      const handleArticle = async (article: PubMedArticle) => {
        const articleId = await findOrCreateArticle(article);
        if (article.doi) handledDois.add(article.doi.toLowerCase());

        const wasAdded = await addArticleToProject(paramsP.data.id, articleId, userId, "citation-graph", importStatus);
        if (wasAdded) {
          added++;
        } else {
          skipped++;
        }
      };

      // 1) PMIDs через PubMed
      if (pmids.length > 0) {
        try {
          const pubmedArticles = await pubmedFetchByPmids({
            pmids,
            apiKey: apiKey || undefined,
            throttleMs: apiKey ? 80 : 250,
          });

          for (const article of pubmedArticles) {
            await handleArticle(article);
          }
        } catch (err) {
          console.error("Import from graph (PubMed) error:", err);
        }
      }

      // 2) DOIs через Crossref (которые ещё не обработаны из PubMed)
      for (const doi of dois) {
        if (handledDois.has(doi)) {
          continue;
        }

        try {
          const work = await getCrossrefByDOI(doi);
          if (!work) {
            skipped++;
            continue;
          }

          const title = work.title?.[0]?.trim();
          if (!title) {
            skipped++;
            continue;
          }

          const authors = (work.author || [])
            .map((a) => [a.family, a.given].filter(Boolean).join(" "))
            .filter(Boolean)
            .join(", ");

          const year = work.issued?.["date-parts"]?.[0]?.[0]
            ?? work.published?.["date-parts"]?.[0]?.[0]
            ?? undefined;

          const abstract = typeof work.abstract === "string"
            ? work.abstract.replace(/<[^>]+>/g, "").trim()
            : undefined;

          const article: PubMedArticle = {
            pmid: "",
            doi,
            title,
            abstract,
            authors: authors || undefined,
            journal: work["container-title"]?.[0] || undefined,
            year,
            url: `https://doi.org/${doi}`,
            studyTypes: work.subject || [],
          };

          await handleArticle(article);
        } catch (err) {
          console.error("Import from graph (Crossref) error for", doi, err);
          skipped++;
        }
      }

      // Обновляем updated_at проекта
      await pool.query(`UPDATE projects SET updated_at = now() WHERE id = $1`, [paramsP.data.id]);

      // Invalidate articles cache after import
      if (added > 0) {
        await invalidateArticles(paramsP.data.id);
      }

      return {
        ok: true,
        added,
        skipped,
        message: `Добавлено ${added}, пропущено ${skipped}`,
      };
    }
  );

  // GET /api/projects/:id/articles/:articleId/pdf-source - найти источник PDF
  fastify.get(
    "/projects/:id/articles/:articleId/pdf-source",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsSchema = z.object({
        id: z.string().uuid(),
        articleId: z.string().uuid(),
      });
      const paramsP = paramsSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      // Проверяем доступ к проекту
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId]
      );
      if (access.rowCount === 0) {
        return reply.code(404).send({ error: "Project not found" });
      }

      // Получаем статью
      const article = await pool.query(
        `SELECT a.doi, a.pmid FROM articles a
         JOIN project_articles pa ON pa.article_id = a.id
         WHERE a.id = $1 AND pa.project_id = $2`,
        [paramsP.data.articleId, paramsP.data.id]
      );

      if (article.rowCount === 0) {
        return reply.code(404).send({ error: "Article not found" });
      }

      const { doi, pmid } = article.rows[0];

      // Получаем Wiley токен если есть
      let wileyToken: string | undefined;
      try {
        wileyToken = await getUserApiKey(userId, "wiley") || undefined;
      } catch (e) {
        // Нет токена - не проблема
      }

      // Ищем источник PDF
      const source = await findPdfSource(doi, pmid, wileyToken);

      if (!source) {
        return reply.code(404).send({ 
          error: "PDF not found",
          message: "Не удалось найти PDF. Попробуйте поискать через Google Scholar или на сайте журнала."
        });
      }

      return {
        source: source.source,
        url: source.url,
        isPdf: source.isPdf,
        directDownload: source.source !== "wiley", // Wiley требует проксирования
      };
    }
  );

  // GET /api/projects/:id/articles/:articleId/pdf - скачать PDF
  fastify.get(
    "/projects/:id/articles/:articleId/pdf",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsSchema = z.object({
        id: z.string().uuid(),
        articleId: z.string().uuid(),
      });
      const paramsP = paramsSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      // Проверяем доступ к проекту
      const access = await pool.query(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [paramsP.data.id, userId]
      );
      if (access.rowCount === 0) {
        return reply.code(404).send({ error: "Project not found" });
      }

      // Получаем статью
      const article = await pool.query(
        `SELECT a.doi, a.pmid, a.title_en FROM articles a
         JOIN project_articles pa ON pa.article_id = a.id
         WHERE a.id = $1 AND pa.project_id = $2`,
        [paramsP.data.articleId, paramsP.data.id]
      );

      if (article.rowCount === 0) {
        return reply.code(404).send({ error: "Article not found" });
      }

      const { doi, pmid, title_en } = article.rows[0];

      // Получаем Wiley токен если есть
      let wileyToken: string | undefined;
      try {
        wileyToken = await getUserApiKey(userId, "wiley") || undefined;
      } catch (e) {}

      // Ищем источник PDF
      const source = await findPdfSource(doi, pmid, wileyToken);

      if (!source) {
        return reply.code(404).send({ error: "PDF not found" });
      }

      // Скачиваем PDF
      const pdf = await downloadPdf(source, wileyToken);

      if (!pdf) {
        return reply.code(502).send({ error: "Failed to download PDF" });
      }

      // Формируем имя файла
      const safeTitle = title_en
        ?.replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 50) || "article";
      const filename = `${safeTitle}.pdf`;

      return reply
        .header("Content-Type", pdf.contentType)
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(pdf.buffer);
    }
  );

  // POST /api/projects/:id/articles/ai-detect-stats - AI детекция статистики (SSE streaming)
  fastify.post(
    "/projects/:id/articles/ai-detect-stats",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      // Получить ключ OpenRouter
      const openrouterKey = await getUserApiKey(userId, "openrouter");
      if (!openrouterKey) {
        return reply.code(400).send({ 
          error: "OpenRouter API ключ не настроен. Добавьте его в настройках." 
        });
      }
      
      // Парсим articleIds из тела запроса
      const body = request.body as { articleIds?: string[] } | undefined;
      const articleIds = body?.articleIds;
      
      // Импортируем функцию
      const { detectStatsCombined } = await import("../lib/stats.js");
      
      // Настройки батчинга
      const BATCH_SIZE = 10; // Размер пачки
      const PARALLEL_LIMIT = 5; // Параллельных запросов в пачке
      const BATCH_DELAY_MS = 500; // Пауза между пачками для rate limiting
      
      // Получить ВСЕ статьи для анализа (без AI статистики)
      let articlesRes;
      
      if (articleIds && articleIds.length > 0) {
        // Выбранные статьи, которые ещё не проанализированы AI
        articlesRes = await pool.query(
          `SELECT a.id, a.abstract_en, a.has_stats, a.stats_quality, a.stats_json
           FROM articles a
           JOIN project_articles pa ON pa.article_id = a.id
           WHERE pa.project_id = $1 
             AND a.id = ANY($2)
             AND a.abstract_en IS NOT NULL
             AND (a.stats_json IS NULL OR a.stats_json->'ai' IS NULL)`,
          [paramsP.data.id, articleIds]
        );
      } else {
        // Все статьи без AI-статистики
        articlesRes = await pool.query(
          `SELECT a.id, a.abstract_en, a.has_stats, a.stats_quality, a.stats_json
           FROM articles a
           JOIN project_articles pa ON pa.article_id = a.id
           WHERE pa.project_id = $1 
             AND a.abstract_en IS NOT NULL
             AND (a.stats_json IS NULL OR a.stats_json->'ai' IS NULL)`,
          [paramsP.data.id]
        );
      }
      
      const articles = articlesRes.rows;
      const total = articles.length;
      
      if (total === 0) {
        return { 
          ok: true, 
          analyzed: 0, 
          found: 0,
          total: 0,
          message: articleIds?.length 
            ? "Выбранные статьи уже проанализированы или не имеют абстрактов" 
            : "Все статьи уже проанализированы AI" 
        };
      }
      
      // Устанавливаем SSE заголовки
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Отключаем буферизацию nginx
      });
      
      // Функция отправки SSE события
      const sendEvent = (event: string, data: any) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      
      // Отправляем начальное событие
      sendEvent('start', { total, batchSize: BATCH_SIZE });
      
      let analyzed = 0;
      let found = 0;
      let errors = 0;
      
      // Обрабатываем пачками
      for (let batchStart = 0; batchStart < articles.length; batchStart += BATCH_SIZE) {
        const batch = articles.slice(batchStart, batchStart + BATCH_SIZE);
        const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(articles.length / BATCH_SIZE);
        
        // Обрабатываем пачку параллельно (по PARALLEL_LIMIT за раз)
        for (let i = 0; i < batch.length; i += PARALLEL_LIMIT) {
          const parallelBatch = batch.slice(i, i + PARALLEL_LIMIT);
          
          const results = await Promise.allSettled(
            parallelBatch.map(async (article) => {
              const result = await detectStatsCombined({
                text: article.abstract_en,
                openrouterKey,
                useAI: true,
              });
              return { article, result };
            })
          );
          
          for (const res of results) {
            if (res.status === 'fulfilled') {
              const { article, result } = res.value;
              
              // Сохраняем результат AI-анализа
              if (result.aiStats && result.aiStats.stats && result.aiStats.stats.length > 0) {
                await pool.query(
                  `UPDATE articles SET 
                    has_stats = true,
                    stats_quality = GREATEST(COALESCE(stats_quality, 0), $1),
                    stats_json = COALESCE(stats_json, '{}'::jsonb) || $2::jsonb
                   WHERE id = $3`,
                  [
                    result.quality,
                    JSON.stringify({ ai: result.aiStats }),
                    article.id
                  ]
                );
                found++;
              } else if (result.hasStats) {
                // Отмечаем что AI анализ был проведён (пустой результат)
                await pool.query(
                  `UPDATE articles SET 
                    has_stats = true,
                    stats_quality = GREATEST(COALESCE(stats_quality, 0), $1),
                    stats_json = COALESCE(stats_json, '{}'::jsonb) || '{"ai": {"hasStats": false, "stats": []}}'::jsonb
                   WHERE id = $2`,
                  [result.quality, article.id]
                );
              } else {
                // Отмечаем что AI анализ был проведён (ничего не найдено)
                await pool.query(
                  `UPDATE articles SET 
                    stats_json = COALESCE(stats_json, '{}'::jsonb) || '{"ai": {"hasStats": false, "stats": []}}'::jsonb
                   WHERE id = $1`,
                  [article.id]
                );
              }
              
              analyzed++;
            } else {
              console.error(`AI stats detection error:`, res.reason);
              errors++;
            }
          }
        }
        
        // Отправляем прогресс после каждой пачки
        sendEvent('progress', { 
          batch: batchNum, 
          totalBatches,
          analyzed, 
          found,
          errors,
          total,
          percent: Math.round((analyzed / total) * 100)
        });
        
        // Пауза между пачками чтобы не превысить rate limits
        if (batchStart + BATCH_SIZE < articles.length) {
          await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
      }
      
      // Отправляем финальное событие
      sendEvent('complete', { 
        ok: true,
        analyzed, 
        found, 
        errors,
        total,
        message: `Проанализировано ${analyzed} статей. AI нашёл статистику в ${found}.`
      });
      
      reply.raw.end();
    }
  );

  // =====================================================
  // GET /api/articles/by-pmid/:pmid - получить данные статьи по PMID
  // =====================================================
  fastify.get<{
    Params: { pmid: string };
  }>(
    "/articles/by-pmid/:pmid",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { pmid } = request.params;
      
      if (!pmid || !/^\d+$/.test(pmid)) {
        return reply.code(400).send({ error: "Invalid PMID" });
      }

      // Сначала проверяем в базе данных
      const dbRes = await pool.query(
        `SELECT id, doi, pmid, title_en, title_ru, abstract_en, abstract_ru, 
                authors, year, journal, raw_json
         FROM articles 
         WHERE pmid = $1`,
        [pmid]
      );

      if (dbRes.rows.length > 0) {
        const article = dbRes.rows[0];
        const authorsStr = Array.isArray(article.authors) 
          ? article.authors.join(', ') 
          : article.authors || null;
        
        return {
          ok: true,
          source: 'database',
          article: {
            pmid: article.pmid,
            doi: article.doi,
            title: article.title_en || null,
            title_ru: article.title_ru || null,
            abstract: article.abstract_en || null,
            abstract_ru: article.abstract_ru || null,
            authors: authorsStr,
            journal: article.journal || null,
            year: article.year,
            citedByCount: article.raw_json?.europePMCCitations || 0,
          }
        };
      }

      // Если не найдено в БД, запрашиваем из PubMed
      try {
        const apiKey = await getUserApiKey(request.user.sub, 'ncbi');
        const results = await pubmedFetchByPmids({
          pmids: [pmid],
          apiKey: apiKey || undefined,
          throttleMs: apiKey ? 80 : 300,
        });

        if (results.length > 0) {
          const pubmedArticle = results[0];
          return {
            ok: true,
            source: 'pubmed',
            article: {
              pmid: pubmedArticle.pmid,
              doi: pubmedArticle.doi || null,
              title: pubmedArticle.title || null,
              title_ru: null, // PubMed не возвращает перевод
              abstract: pubmedArticle.abstract || null,
              abstract_ru: null,
              authors: pubmedArticle.authors || null,
              journal: pubmedArticle.journal || null,
              year: pubmedArticle.year || null,
              citedByCount: 0,
            }
          };
        }

        return reply.code(404).send({ ok: false, error: "Article not found" });
      } catch (err) {
        console.error(`Error fetching PMID ${pmid} from PubMed:`, err);
        return reply.code(500).send({ ok: false, error: "Failed to fetch from PubMed" });
      }
    }
  );

  // =====================================================
  // POST /api/articles/translate-text - перевести текст на лету (для графа)
  // =====================================================
  fastify.post<{
    Body: { 
      title?: string;
      abstract?: string;
      pmid?: string; // опционально - если передан, сохраним перевод в БД
    };
  }>(
    "/articles/translate-text",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { title, abstract, pmid } = request.body || {};
      const userId = (request as any).user.sub;

      if (!title && !abstract) {
        return reply.code(400).send({ ok: false, error: "Nothing to translate" });
      }

      // Получаем API ключ для OpenRouter
      const apiKey = await getUserApiKey(userId, 'openrouter');
      if (!apiKey) {
        return reply.code(400).send({ 
          ok: false, 
          error: "Для перевода нужен API ключ OpenRouter. Добавьте его в Настройках." 
        });
      }

      try {
        const { translateArticle } = await import("../lib/translate.js");
        
        const result = await translateArticle(
          apiKey,
          title || '',
          abstract || null
        );

        // Если передан PMID и статья есть в БД - сохраняем перевод
        if (pmid && (result.title_ru || result.abstract_ru)) {
          try {
            await pool.query(
              `UPDATE articles 
               SET title_ru = COALESCE($1, title_ru), 
                   abstract_ru = COALESCE($2, abstract_ru)
               WHERE pmid = $3`,
              [result.title_ru || null, result.abstract_ru || null, pmid]
            );
          } catch (saveErr) {
            console.error(`Failed to save translation for PMID ${pmid}:`, saveErr);
            // Не возвращаем ошибку - перевод всё равно получен
          }
        }

        return {
          ok: true,
          title_ru: result.title_ru || null,
          abstract_ru: result.abstract_ru || null,
        };
      } catch (err: any) {
        console.error('Translation error:', err);
        return reply.code(500).send({ 
          ok: false, 
          error: err?.message || "Translation failed" 
        });
      }
    }
  );

  // ========== AI Assistant for Graph ==========
  // POST /api/projects/:id/graph-ai-assistant
  // AI ищет статьи СРЕДИ УЖЕ ЗАГРУЖЕННЫХ в граф (level 0, 2, 3)
  // и возвращает их ID для подсветки и добавления в проект
  
  const GraphArticleSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    abstract: z.string().nullable().optional(),
    year: z.number().nullable().optional(),
    journal: z.string().nullable().optional(),
    authors: z.string().nullable().optional(),
    pmid: z.string().nullable().optional(),
    doi: z.string().nullable().optional(),
    citedByCount: z.number().nullable().optional(),
    graphLevel: z.number().nullable().optional(),
  });
  
  const GraphAIAssistantSchema = z.object({
    message: z.string().min(1).max(2000),
    graphArticles: z.array(GraphArticleSchema).optional(), // Статьи из графа для поиска
    context: z.object({
      articleCount: z.number().optional(),
      yearRange: z.object({ min: z.number().nullable(), max: z.number().nullable() }).optional(),
    }).optional(),
  });

  fastify.post(
    "/projects/:id/graph-ai-assistant",
    { 
      preHandler: [fastify.authenticate],
      bodyLimit: 5 * 1024 * 1024, // 5MB для передачи статей графа
    },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      // Отладка: что пришло в body
      const rawBody = request.body as any;
      console.log(`[AI Assistant] Raw body keys:`, Object.keys(rawBody || {}));
      console.log(`[AI Assistant] Raw graphArticles length:`, rawBody?.graphArticles?.length);
      console.log(`[AI Assistant] Raw message:`, rawBody?.message?.substring(0, 50));
      
      const bodyP = GraphAIAssistantSchema.safeParse(request.body);
      if (!bodyP.success) {
        console.log(`[AI Assistant] Zod validation failed:`, bodyP.error.issues);
        return reply.code(400).send({ error: "Invalid request body", details: bodyP.error.issues });
      }
      
      const projectId = paramsP.data.id;
      const { message, graphArticles, context } = bodyP.data;
      
      console.log(`[AI Assistant] After Zod: graphArticles length:`, graphArticles?.length);
      
      try {
        // Получаем API ключ OpenRouter
        const openrouterKey = await getUserApiKey(userId, 'openrouter');
        if (!openrouterKey) {
          return reply.code(400).send({
            ok: false,
            error: "Для AI ассистента нужен API ключ OpenRouter. Добавьте его в Настройках."
          });
        }
        
        // Получаем информацию о проекте
        const projectRes = await pool.query(
          `SELECT p.name, p.description, p.research_type, p.research_subtype
           FROM projects p WHERE p.id = $1`,
          [projectId]
        );
        const project = projectRes.rows[0];
        
        // Логируем что получили
        console.log(`[AI Assistant] Received graphArticles: ${graphArticles?.length || 0} items`);
        if (graphArticles && graphArticles.length > 0) {
          console.log(`[AI Assistant] Sample article:`, JSON.stringify(graphArticles[0]).slice(0, 300));
          // Подсчёт по уровням
          const levelCounts: Record<string, number> = {};
          for (const a of graphArticles) {
            const level = String(a.graphLevel ?? 'undefined');
            levelCounts[level] = (levelCounts[level] || 0) + 1;
          }
          console.log(`[AI Assistant] Articles by level:`, levelCounts);
        }
        
        // Фильтруем только внешние статьи (level 0, 2, 3) для поиска
        // graphLevel: 0 = citing, 1 = в проекте, 2 = references, 3 = related
        const externalArticles = (graphArticles || []).filter(a => {
          const level = a.graphLevel ?? 1; // undefined считаем как level 1
          return level !== 1;
        });
        
        console.log(`[AI Assistant] External articles for search: ${externalArticles.length}`);
        
        // Фильтруем статьи с реальными данными (не placeholder)
        const articlesWithData = externalArticles.filter(a => {
          // Есть реальное название (не PMID:xxx)
          const hasRealTitle = a.title && !a.title.startsWith('PMID:') && !a.title.startsWith('DOI:');
          const hasYear = a.year !== null && a.year !== undefined;
          const hasAbstract = a.abstract && a.abstract.length > 50;
          return hasRealTitle || hasYear || hasAbstract;
        });
        
        console.log(`[AI Assistant] Articles with real data: ${articlesWithData.length}`);
        
        // Формируем список статей для AI (передаём ВСЕ статьи с данными)
        const articlesForAI = articlesWithData
          .map((a, idx) => {
            const parts = [
              `[${idx + 1}] ID: ${a.id}`,
              a.title ? `Название: ${a.title}` : null,
              a.year ? `Год: ${a.year}` : null,
              a.journal ? `Журнал: ${a.journal}` : null,
              a.authors ? `Авторы: ${a.authors.substring(0, 150)}` : null,
              a.citedByCount ? `Цитирований: ${a.citedByCount}` : null,
              a.abstract ? `Аннотация: ${a.abstract.substring(0, 500)}` : null,
            ].filter(Boolean);
            return parts.join('\n');
          })
          .join('\n\n---\n\n');
        
        // Формируем системный промпт для поиска в графе
        const systemPrompt = `Ты - AI ассистент для научного исследователя. Твоя задача - искать релевантные статьи СРЕДИ УЖЕ ЗАГРУЖЕННЫХ в граф цитирований.

КОНТЕКСТ ПРОЕКТА:
- Название: ${project?.name || 'Без названия'}
- Описание: ${project?.description || 'Нет описания'}
- Тип исследования: ${project?.research_type || 'Не указан'}
${context?.yearRange ? `- Годы публикаций в графе: ${context.yearRange.min || '?'} - ${context.yearRange.max || '?'}` : ''}
- Всего статей в графе: ${context?.articleCount || 0}
- Внешних статей (ссылки/цитирующие): ${externalArticles.length}
- Статей с полными данными для поиска: ${articlesWithData.length}

ДОСТУПНЫЕ СТАТЬИ ДЛЯ ПОИСКА (${articlesWithData.length} шт.):
${articlesForAI || 'Нет статей с полными данными для поиска. Статьи-placeholder (только PMID без метаданных) пропущены.'}

ТВОЯ ЗАДАЧА:
1. Понять запрос пользователя (тема, ключевые слова, критерии)
2. Найти СРЕДИ ПРЕДОСТАВЛЕННЫХ СТАТЕЙ те, которые соответствуют запросу
3. Вернуть их ID для подсветки на графе

ПРАВИЛА:
- Возвращай ТОЛЬКО ID статей из списка выше (формат: "pmid:12345" или "doi:10.1234/...")
- Если статей нет или их мало - честно скажи об этом
- Ранжируй по релевантности: сначала наиболее подходящие
- Учитывай название, аннотацию, журнал, год при поиске

ФОРМАТ ОТВЕТА (строго JSON):
{
  "response": "Твой текстовый ответ пользователю с объяснением что найдено",
  "foundArticleIds": ["pmid:12345", "doi:10.1234/example"],
  "foundArticlesInfo": [
    {
      "id": "pmid:12345",
      "reason": "Почему эта статья релевантна запросу"
    }
  ]
}

ВАЖНО:
- Отвечай на русском языке
- Возвращай ТОЛЬКО ID из предоставленного списка
- Если ничего не найдено - верни пустой массив foundArticleIds
- Лимит: до 50 наиболее релевантных статей`;

        // Вызываем OpenRouter с Claude
        const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
        
        const res = await fetch(OPENROUTER_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://mdsystem.app",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
        
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`);
        }
        
        type OpenRouterResponse = {
          choices: Array<{ message: { content: string } }>;
        };
        const data = (await res.json()) as OpenRouterResponse;
        const content = data.choices?.[0]?.message?.content || "";
        
        // Парсим JSON из ответа
        let parsed: any = { response: content, foundArticleIds: [], foundArticlesInfo: [] };
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Если не удалось распарсить - возвращаем как текст
          parsed = { response: content, foundArticleIds: [], foundArticlesInfo: [] };
        }
        
        // Валидируем найденные ID - они должны быть из graphArticles
        const validIds = new Set((graphArticles || []).map(a => a.id));
        const validatedFoundIds = (parsed.foundArticleIds || []).filter((id: string) => validIds.has(id));
        
        // Собираем полную информацию о найденных статьях для фронтенда
        const foundArticlesMap = new Map((graphArticles || []).map(a => [a.id, a]));
        const foundArticles = validatedFoundIds.map((id: string) => {
          const article = foundArticlesMap.get(id);
          const info = (parsed.foundArticlesInfo || []).find((i: any) => i.id === id);
          return {
            id,
            title: article?.title,
            year: article?.year,
            journal: article?.journal,
            pmid: article?.pmid,
            doi: article?.doi,
            citedByCount: article?.citedByCount,
            reason: info?.reason || '',
          };
        });
        
        return {
          ok: true,
          response: parsed.response || content,
          foundArticleIds: validatedFoundIds,
          foundArticles,
          searchSuggestions: [], // Больше не используем
          pmidsToAdd: [], // Теперь добавляем через foundArticles
          doisToAdd: [],
          // Отладочная информация
          _debug: {
            receivedArticles: graphArticles?.length || 0,
            externalArticles: externalArticles.length,
            articlesWithData: articlesWithData.length,
          },
        };
        
      } catch (err: any) {
        console.error('Graph AI Assistant error:', err);
        return reply.code(500).send({
          ok: false,
          error: err?.message || "AI Assistant error"
        });
      }
    }
  );
};

export default plugin;
