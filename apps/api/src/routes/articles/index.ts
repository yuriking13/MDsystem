import type { FastifyPluginAsync } from "fastify";

// Re-export types and helpers for external use
export * from "./types.js";
export * from "./helpers.js";

// Import the original monolithic plugin (still in use for most routes)
import fullPlugin from "./full.js";

/**
 * Articles plugin - handles article search, CRUD, enrichment and AI operations
 *
 * Modular structure for better maintainability:
 * - types.ts - Validation schemas and type definitions ✅ Extracted
 * - helpers.ts - Utility functions ✅ Extracted
 * - search.ts - PubMed, DOAJ, Wiley search ✅ Prepared (not active)
 * - crud.ts - Article CRUD operations ✅ Prepared (not active)
 * - enrich.ts - Translation, DOI enrichment, stats detection (to be extracted)
 * - ai.ts - AI summary and assistant (to be extracted)
 * - references.ts - Fetch references operations (to be extracted)
 * - pdf.ts - PDF source and download (to be extracted)
 *
 * Currently using full.ts for backward compatibility.
 * Once all routes are extracted and tested, full.ts can be deprecated.
 *
 * To enable modular routes:
 * 1. Uncomment the modular imports below
 * 2. Comment out the fullPlugin registration
 * 3. Register individual modules
 */
const articlesPlugin: FastifyPluginAsync = async (fastify) => {
  // === CURRENT: Use monolithic plugin ===
  await fastify.register(fullPlugin);

  // === FUTURE: Use modular plugins ===
  // Uncomment these when ready to switch:
  // import searchPlugin from './search.js';
  // import crudPlugin from './crud.js';
  // import enrichPlugin from './enrich.js';
  // import aiPlugin from './ai.js';
  // import referencesPlugin from './references.js';
  // import pdfPlugin from './pdf.js';
  //
  // await fastify.register(searchPlugin);
  // await fastify.register(crudPlugin);
  // await fastify.register(enrichPlugin);
  // await fastify.register(aiPlugin);
  // await fastify.register(referencesPlugin);
  // await fastify.register(pdfPlugin);
};

export default articlesPlugin;
