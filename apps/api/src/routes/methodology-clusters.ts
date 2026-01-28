/**
 * Methodology Clustering для графа цитирований
 *
 * Автоматически классифицирует статьи по типам исследований:
 * - RCT (Randomized Controlled Trial)
 * - Meta-Analysis / Systematic Review
 * - Cohort Study
 * - Case-Control Study
 * - Cross-Sectional Study
 * - Case Report / Case Series
 * - Review / Narrative Review
 */

import type { FastifyPluginCallback } from "fastify";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";

const methodologyKeywords = {
  rct: [
    "randomized controlled trial",
    "randomised controlled trial",
    "RCT",
    "randomized trial",
    "randomised trial",
    "placebo-controlled",
    "double-blind",
    "double blind",
  ],
  meta_analysis: [
    "meta-analysis",
    "meta analysis",
    "systematic review",
    "pooled analysis",
    "meta-regression",
  ],
  cohort: [
    "cohort study",
    "longitudinal study",
    "prospective study",
    "follow-up study",
    "cohort analysis",
  ],
  case_control: ["case-control", "case control study", "matched case-control"],
  cross_sectional: [
    "cross-sectional",
    "cross sectional study",
    "prevalence study",
    "survey",
  ],
  case_report: ["case report", "case series", "case study"],
  review: [
    "literature review",
    "narrative review",
    "scoping review",
    "overview",
  ],
  experimental: [
    "animal study",
    "in vitro",
    "in vivo",
    "laboratory study",
    "experimental study",
  ],
  qualitative: [
    "qualitative study",
    "qualitative research",
    "interview",
    "focus group",
    "ethnography",
  ],
};

export type MethodologyType =
  | "rct"
  | "meta_analysis"
  | "cohort"
  | "case_control"
  | "cross_sectional"
  | "case_report"
  | "review"
  | "experimental"
  | "qualitative"
  | "other";

export const methodologyClustersRoutes: FastifyPluginCallback = (
  fastify,
  _opts,
  done,
) => {
  /**
   * POST /projects/:projectId/citation-graph/analyze-methodologies
   * Анализ методологий статей в графе
   */
  fastify.post<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/analyze-methodologies",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        // Получаем все статьи проекта с аннотациями и типами публикаций
        const articlesRes = await pool.query(
          `SELECT 
             a.id,
             a.title_en,
             a.abstract_en,
             a.publication_types,
             a.pmid,
             a.doi,
             pa.status
           FROM project_articles pa
           JOIN articles a ON a.id = pa.article_id
           WHERE pa.project_id = $1 
             AND pa.status != 'deleted'
             AND (a.title_en IS NOT NULL OR a.abstract_en IS NOT NULL)`,
          [projectId],
        );

        const articles = articlesRes.rows;
        const totalArticles = articles.length;

        // Классифицируем каждую статью
        const clusters: Record<MethodologyType, string[]> = {
          rct: [],
          meta_analysis: [],
          cohort: [],
          case_control: [],
          cross_sectional: [],
          case_report: [],
          review: [],
          experimental: [],
          qualitative: [],
          other: [],
        };

        for (const article of articles) {
          const text = [
            article.title_en || "",
            article.abstract_en || "",
            ...(article.publication_types || []),
          ]
            .join(" ")
            .toLowerCase();

          let classified = false;

          // Проверяем каждый тип методологии
          for (const [methodType, keywords] of Object.entries(
            methodologyKeywords,
          )) {
            if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
              clusters[methodType as MethodologyType].push(article.id);
              classified = true;
              break; // Только одна категория на статью
            }
          }

          if (!classified) {
            clusters.other.push(article.id);
          }
        }

        // Формируем результат с детальной статистикой
        const result = Object.entries(clusters).map(([type, articleIds]) => ({
          type,
          name: getMethodologyName(type as MethodologyType),
          count: articleIds.length,
          percentage:
            totalArticles > 0 ? (articleIds.length / totalArticles) * 100 : 0,
          articleIds,
          keywords:
            methodologyKeywords[type as keyof typeof methodologyKeywords] || [],
        }));

        // Сортируем по убыванию количества
        result.sort((a, b) => b.count - a.count);

        return {
          success: true,
          totalArticles,
          clusters: result,
          summary: {
            top3: result.slice(0, 3).map((c) => ({
              type: c.type,
              name: c.name,
              count: c.count,
            })),
            hasRCT: clusters.rct.length > 0,
            hasMetaAnalysis: clusters.meta_analysis.length > 0,
            experimentalRatio:
              totalArticles > 0
                ? ((clusters.rct.length + clusters.experimental.length) /
                    totalArticles) *
                  100
                : 0,
          },
        };
      } catch (error: any) {
        fastify.log.error("Methodology analysis error:", error);
        return reply.code(500).send({
          error: "Failed to analyze methodologies",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/methodology-stats
   * Быстрая статистика по методологиям (без полных списков ID)
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/methodology-stats",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        // Используем простой подсчёт через LIKE (быстро)
        const stats = await pool.query(
          `SELECT 
             COUNT(*) FILTER (WHERE 
               LOWER(a.title_en || ' ' || COALESCE(a.abstract_en, '')) 
               LIKE ANY(ARRAY['%randomized%', '%rct%', '%randomised%'])
             ) as rct_count,
             COUNT(*) FILTER (WHERE 
               LOWER(a.title_en || ' ' || COALESCE(a.abstract_en, '')) 
               LIKE ANY(ARRAY['%meta-analysis%', '%systematic review%'])
             ) as meta_count,
             COUNT(*) FILTER (WHERE 
               LOWER(a.title_en || ' ' || COALESCE(a.abstract_en, '')) 
               LIKE ANY(ARRAY['%cohort%', '%longitudinal%'])
             ) as cohort_count,
             COUNT(*) as total
           FROM project_articles pa
           JOIN articles a ON a.id = pa.article_id
           WHERE pa.project_id = $1 AND pa.status != 'deleted'`,
          [projectId],
        );

        const row = stats.rows[0];
        const total = parseInt(row.total);

        return {
          total,
          rct: parseInt(row.rct_count),
          metaAnalysis: parseInt(row.meta_count),
          cohort: parseInt(row.cohort_count),
          rctPercentage:
            total > 0 ? (parseInt(row.rct_count) / total) * 100 : 0,
        };
      } catch (error: any) {
        fastify.log.error("Methodology stats error:", error);
        return reply.code(500).send({
          error: "Failed to get methodology stats",
          details: error.message,
        });
      }
    },
  );

  done();
};

// Helper: название методологии на русском
function getMethodologyName(type: MethodologyType): string {
  const names: Record<MethodologyType, string> = {
    rct: "Рандомизированное контролируемое исследование (RCT)",
    meta_analysis: "Мета-анализ / Систематический обзор",
    cohort: "Когортное исследование",
    case_control: "Исследование случай-контроль",
    cross_sectional: "Одномоментное исследование",
    case_report: "Описание случая / Серия случаев",
    review: "Обзор литературы",
    experimental: "Экспериментальное исследование",
    qualitative: "Качественное исследование",
    other: "Другое / Не классифицировано",
  };
  return names[type] || type;
}
