/**
 * Admin routes plugin - handles admin panel operations
 *
 * Modular structure (prepared, monolithic currently in use):
 * - admin/common.ts - Shared utilities
 * - admin/full.ts - Original monolithic file (currently in use)
 *
 * Re-exports from admin/index.ts
 */

import { FastifyInstance } from "fastify";

// Re-export from admin module
export * from "./admin/common.js";
export { adminRoutes } from "./admin/index.js";

// Import the admin plugin
import adminPlugin from "./admin/index.js";

/**
 * Main admin plugin - uses the original monolithic file for now
 */
const plugin = async (fastify: FastifyInstance) => {
  await fastify.register(adminPlugin);
};

export default plugin;
