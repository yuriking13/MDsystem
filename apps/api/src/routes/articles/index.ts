import type { FastifyPluginAsync } from "fastify";

// Re-export types and helpers for external use
export * from "./types.js";
export * from "./helpers.js";

// Import the original monolithic plugin
import fullPlugin from "./full.js";

/**
 * Articles plugin - handles article search, CRUD, enrichment and AI operations
 *
 * Currently uses the original monolithic file (full.ts).
 * Modular structure is prepared for future refactoring:
 * - types.ts - Validation schemas and type definitions
 * - helpers.ts - Utility functions
 * - search.ts - PubMed, DOAJ, Wiley search (to be extracted)
 * - crud.ts - Article CRUD operations (to be extracted)
 * - enrich.ts - Translation, DOI enrichment, stats detection (to be extracted)
 * - ai.ts - AI summary and assistant (to be extracted)
 * - import.ts - Import/export operations (to be extracted)
 */
const articlesPlugin: FastifyPluginAsync = async (fastify) => {
  // Use the original monolithic plugin for now
  await fastify.register(fullPlugin);
};

export default articlesPlugin;
