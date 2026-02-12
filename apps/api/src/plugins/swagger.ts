/**
 * Swagger/OpenAPI Documentation Plugin
 *
 * Автоматически генерирует API документацию из схем маршрутов.
 * Доступна по адресу /docs
 */

import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { requireAdminAccess } from "../utils/require-admin.js";

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  // Register Swagger
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "MDsystem API",
        description:
          "API для системы управления научными статьями и литературными обзорами",
        version: "1.0.0",
        contact: {
          name: "MDsystem Support",
          email: "support@mdsystem.dev",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
        {
          url: "https://api.mdsystem.dev",
          description: "Production server",
        },
      ],
      tags: [
        { name: "auth", description: "Аутентификация и авторизация" },
        { name: "projects", description: "Управление проектами" },
        { name: "articles", description: "Работа со статьями" },
        { name: "documents", description: "Управление документами" },
        { name: "files", description: "Загрузка и скачивание файлов" },
        { name: "search", description: "Поиск статей" },
        { name: "settings", description: "Настройки пользователя" },
        { name: "statistics", description: "Статистика проекта" },
        { name: "health", description: "Проверки состояния" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT токен авторизации",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              error: { type: "string", description: "Сообщение об ошибке" },
              statusCode: { type: "number", description: "HTTP код ошибки" },
            },
            required: ["error"],
          },
          Project: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              description: { type: "string", nullable: true },
              created_at: { type: "string", format: "date-time" },
              updated_at: { type: "string", format: "date-time" },
              owner_id: { type: "string", format: "uuid" },
            },
          },
          Article: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              title: { type: "string" },
              authors: { type: "string", nullable: true },
              abstract: { type: "string", nullable: true },
              year: { type: "number", nullable: true },
              doi: { type: "string", nullable: true },
              pmid: { type: "string", nullable: true },
              source: {
                type: "string",
                enum: ["pubmed", "doaj", "wiley", "crossref", "manual"],
              },
              created_at: { type: "string", format: "date-time" },
            },
          },
          User: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              name: { type: "string", nullable: true },
              created_at: { type: "string", format: "date-time" },
            },
          },
          HealthCheck: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["healthy", "degraded", "unhealthy"],
              },
              timestamp: { type: "string", format: "date-time" },
              uptime: { type: "number", description: "Uptime in seconds" },
              checks: {
                type: "object",
                properties: {
                  database: { type: "string", enum: ["ok", "error"] },
                  redis: { type: "string", enum: ["ok", "error", "disabled"] },
                },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  // Register Swagger UI
  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiHooks: {
      preHandler: requireAdminAccess,
    },
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => swaggerObject,
    transformSpecificationClone: true,
  });
};

export default fp(swaggerPlugin, {
  name: "swagger",
  fastify: "5.x",
});
