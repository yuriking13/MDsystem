/**
 * Documents routes plugin - combines all document-related routes
 *
 * Modular structure:
 * - documents/crud.ts - CRUD operations (list, get, create, update, delete, reorder)
 * - documents/citations.ts - Citation management (add, update, delete, sync)
 * - documents/export.ts - Export and bibliography
 * - documents/versions.ts - Document versioning
 * - documents/graph.ts - Citation graph (contains full original file for now)
 *
 * Re-exports types and helpers from documents/types.ts and documents/helpers.ts
 */

import type { FastifyPluginAsync } from "fastify";

// Re-export types and helpers for external use
export * from "./documents/types.js";
export * from "./documents/helpers.js";

// Import the original monolithic plugin that contains all routes
// This preserves backward compatibility while the modular files are ready
import graphPlugin from "./documents/graph.js";

/**
 * Main documents plugin - uses the original monolithic file for now
 *
 * TODO: Once modular files are verified, switch to:
 * - crudPlugin from "./documents/crud.js"
 * - citationsPlugin from "./documents/citations.js"
 * - exportPlugin from "./documents/export.js"
 * - versionsPlugin from "./documents/versions.js"
 * - graphOnlyPlugin (to be extracted from graph.ts)
 */
const documentsPlugin: FastifyPluginAsync = async (fastify) => {
  // For now, use the original monolithic plugin that has all routes
  // This ensures no breaking changes while modular structure is being tested
  await fastify.register(graphPlugin);
};

export default documentsPlugin;
