import type { FastifyPluginAsync } from "fastify";
import { checkProjectAccess } from "./helpers.js";
import { registerDocumentVersionRoutes } from "./version-routes.js";

/**
 * Document versioning plugin
 * Handles: list versions, get version, create version, restore version, auto-version
 */
const versionsPlugin: FastifyPluginAsync = async (fastify) => {
  await registerDocumentVersionRoutes(fastify, { checkProjectAccess });
};

export default versionsPlugin;
