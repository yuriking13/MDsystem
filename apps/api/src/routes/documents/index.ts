import type { FastifyPluginAsync } from "fastify";

// Re-export types and helpers for external use
export * from "./types.js";
export * from "./helpers.js";

// Export individual plugins for testing or selective use
export { default as crudPlugin } from "./crud.js";
export { default as citationsPlugin } from "./citations.js";
export { default as exportPlugin } from "./export.js";
export { default as versionsPlugin } from "./versions.js";

// The main graph.ts contains the full original file
// Use ../documents.ts as the main entry point which handles plugin registration

/**
 * Documents plugin - combines all document-related routes
 *
 * NOTE: This is a utility export. The main entry point is ../documents.ts
 * which currently uses graph.ts (the original monolithic file).
 *
 * Modular plugins are ready and can be activated once verified:
 * - crud.ts - CRUD operations
 * - citations.ts - Citation management
 * - export.ts - Export and bibliography
 * - versions.ts - Document versioning
 */
const documentsPlugin: FastifyPluginAsync = async (fastify) => {
  // Register modular sub-plugins
  const { default: crudPlugin } = await import("./crud.js");
  const { default: citationsPlugin } = await import("./citations.js");
  const { default: exportPlugin } = await import("./export.js");
  const { default: versionsPlugin } = await import("./versions.js");

  await fastify.register(crudPlugin);
  await fastify.register(citationsPlugin);
  await fastify.register(exportPlugin);
  await fastify.register(versionsPlugin);

  // Note: graph-specific routes (citation-graph, recommendations, export-graph)
  // need to be extracted from graph.ts into a separate graphRoutes.ts
};

export default documentsPlugin;
