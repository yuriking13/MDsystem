import { FastifyInstance } from "fastify";

// Re-export types and helpers for external use
export * from "./common.js";

// Import the original monolithic plugin
import { adminRoutes } from "./full.js";

/**
 * Admin plugin - handles admin panel operations
 *
 * Currently uses the original monolithic file (full.ts).
 * Modular structure is prepared for future refactoring:
 * - common.ts - Shared utilities (already exists)
 * - full.ts - Original monolithic file (currently in use)
 *
 * Sections to be extracted:
 * - dashboard.ts - Dashboard stats
 * - users.ts - User management
 * - activity.ts - Activity tracking
 * - errors.ts - Error logs
 * - jobs.ts - Background jobs management
 * - projects.ts - Projects management
 * - storage.ts - Storage management
 * - config.ts - Feature flags and system config
 */
const adminPlugin = async (fastify: FastifyInstance) => {
  await fastify.register(adminRoutes);
};

// Re-export adminRoutes for backward compatibility
export { adminRoutes };

export default adminPlugin;
