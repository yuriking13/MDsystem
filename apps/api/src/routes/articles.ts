/**
 * Articles routes plugin - handles article search, CRUD, enrichment and AI operations
 *
 * Modular structure (prepared, monolithic currently in use):
 * - articles/types.ts - Validation schemas and type definitions
 * - articles/helpers.ts - Utility functions
 * - articles/full.ts - Original monolithic file (currently in use)
 *
 * Re-exports types and helpers from articles/types.ts and articles/helpers.ts
 */

import type { FastifyPluginAsync } from "fastify";

// Re-export types and helpers for external use
export * from "./articles/types.js";
export * from "./articles/helpers.js";

// Import the original monolithic plugin
import fullPlugin from "./articles/full.js";

/**
 * Main articles plugin - uses the original monolithic file for now
 */
const articlesPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fullPlugin);
};

export default articlesPlugin;
