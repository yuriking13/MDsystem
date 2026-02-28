import type { FastifyInstance, FastifyRequest } from "fastify";
import websocketPlugin from "@fastify/websocket";
import type { WebSocket } from "ws";
import { createLogger } from "./utils/logger.js";
import { checkProjectAccessPool } from "./utils/project-access.js";
import crypto from "crypto";
import { z } from "zod";
import { getRedisClient, initRedisClient } from "./lib/redis.js";

const log = createLogger("WebSocket");

// Типы событий WebSocket
export type WSEventType =
  | "statistic:created"
  | "statistic:updated"
  | "statistic:deleted"
  | "document:updated"
  | "document:deleted"
  | "article:statusChanged"
  | "project:updated"
  | "embedding:progress"
  | "embedding:import-progress"
  | "embedding:completed"
  | "embedding:error"
  | "embedding:cancelled"
  | "search:progress"
  | "search:partial-results";

export interface WSEvent {
  type: WSEventType;
  projectId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

// Расширенный тип WebSocket с метаданными
interface AppWebSocket extends WebSocket {
  __userId?: string | null;
  __projectId?: string;
}

// Типы для параметров запроса
interface WSParams {
  projectId: string;
}

interface WSQuery {
  ticket?: string;
}

interface WsTicketRecord {
  userId: string;
  projectId: string;
  expiresAt: number;
}

// Хранилище соединений по projectId
const projectConnections = new Map<string, Set<AppWebSocket>>();

// Хранилище соединений по userId для персональных уведомлений
const userConnections = new Map<string, Set<AppWebSocket>>();

// Одноразовые короткоживущие tickets для WS handshake
const wsTickets = new Map<string, WsTicketRecord>();
const WS_TICKET_TTL_MS = 60 * 1000;
const WS_TICKET_PREFIX = "ws:ticket:";

function wsTicketKey(ticket: string): string {
  return `${WS_TICKET_PREFIX}${ticket}`;
}

function cleanupExpiredTickets() {
  const now = Date.now();
  for (const [ticket, record] of wsTickets.entries()) {
    if (record.expiresAt <= now) {
      wsTickets.delete(ticket);
    }
  }
}

async function issueWsTicket(
  userId: string,
  projectId: string,
): Promise<string> {
  const ticket = crypto.randomBytes(24).toString("base64url");
  const record: WsTicketRecord = {
    userId,
    projectId,
    expiresAt: Date.now() + WS_TICKET_TTL_MS,
  };

  const redisClient = getRedisClient() || (await initRedisClient());
  if (redisClient) {
    try {
      await redisClient.setex(
        wsTicketKey(ticket),
        Math.ceil(WS_TICKET_TTL_MS / 1000),
        JSON.stringify(record),
      );
      return ticket;
    } catch (error) {
      log.error(
        "Failed to persist WS ticket in Redis, fallback to memory",
        error,
      );
    }
  }

  cleanupExpiredTickets();
  wsTickets.set(ticket, record);
  return ticket;
}

async function consumeWsTicket(ticket: string): Promise<WsTicketRecord | null> {
  const redisClient = getRedisClient() || (await initRedisClient());
  if (redisClient) {
    try {
      const rawRecord = await redisClient.call("GETDEL", wsTicketKey(ticket));
      if (typeof rawRecord === "string") {
        const parsed = JSON.parse(rawRecord) as WsTicketRecord;
        if (parsed.expiresAt <= Date.now()) {
          return null;
        }
        return parsed;
      }
      return null;
    } catch (error) {
      log.error(
        "Failed to consume WS ticket from Redis, fallback to memory",
        error,
      );
    }
  }

  cleanupExpiredTickets();
  const record = wsTickets.get(ticket);
  if (!record) {
    return null;
  }
  wsTickets.delete(ticket);
  if (record.expiresAt <= Date.now()) {
    return null;
  }
  return record;
}

/**
 * Отправить событие всем подключённым клиентам проекта
 */
export function broadcastToProject(
  projectId: string,
  event: WSEvent,
  excludeUserId?: string,
) {
  const connections = projectConnections.get(projectId);
  if (!connections) return;

  const message = JSON.stringify(event);

  for (const ws of connections) {
    try {
      // Проверяем что соединение открыто
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        // Исключаем отправителя если указано
        if (excludeUserId && ws.__userId === excludeUserId) continue;

        ws.send(message);
      }
    } catch (err) {
      log.error("Send error", err);
    }
  }
}

/**
 * Отправить событие конкретному пользователю
 */
export function sendToUser(userId: string, event: WSEvent) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const message = JSON.stringify(event);

  for (const ws of connections) {
    try {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    } catch (err) {
      log.error("Send to user error", err, { userId });
    }
  }
}

/**
 * Хелперы для отправки типовых событий
 */
export const wsEvents = {
  statisticCreated(
    projectId: string,
    statistic: Record<string, unknown>,
    userId?: string,
  ) {
    broadcastToProject(
      projectId,
      {
        type: "statistic:created",
        projectId,
        payload: { statistic },
        timestamp: Date.now(),
        userId,
      },
      userId,
    );
  },

  statisticUpdated(
    projectId: string,
    statistic: Record<string, unknown>,
    userId?: string,
  ) {
    broadcastToProject(
      projectId,
      {
        type: "statistic:updated",
        projectId,
        payload: { statistic },
        timestamp: Date.now(),
        userId,
      },
      userId,
    );
  },

  statisticDeleted(projectId: string, statisticId: string, userId?: string) {
    broadcastToProject(
      projectId,
      {
        type: "statistic:deleted",
        projectId,
        payload: { statisticId },
        timestamp: Date.now(),
        userId,
      },
      userId,
    );
  },

  documentUpdated(
    projectId: string,
    document: Record<string, unknown>,
    userId?: string,
  ) {
    broadcastToProject(
      projectId,
      {
        type: "document:updated",
        projectId,
        payload: { document },
        timestamp: Date.now(),
        userId,
      },
      userId,
    );
  },

  documentDeleted(projectId: string, documentId: string, userId?: string) {
    broadcastToProject(
      projectId,
      {
        type: "document:deleted",
        projectId,
        payload: { documentId },
        timestamp: Date.now(),
        userId,
      },
      userId,
    );
  },
};

/**
 * Регистрация WebSocket плагина
 */
export async function registerWebSocket(app: FastifyInstance) {
  await app.register(websocketPlugin);

  // Выдача короткоживущего ticket для безопасного WS-подключения
  app.post("/api/ws-ticket", { preHandler: [app.auth] }, async (req, reply) => {
    const parsed = z
      .object({
        projectId: z.string().uuid(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "Invalid projectId",
      });
    }

    const userId = req.user.sub;
    const { projectId } = parsed.data;
    const access = await checkProjectAccessPool(projectId, userId);
    if (!access.ok) {
      return reply.code(404).send({
        error: "NotFound",
        message: "Project not found",
      });
    }

    const ticket = await issueWsTicket(userId, projectId);
    return {
      ticket,
      expiresInMs: WS_TICKET_TTL_MS,
    };
  });

  // WebSocket endpoint для подписки на проект
  app.get(
    "/ws/project/:projectId",
    { websocket: true },
    async (
      socket: AppWebSocket,
      req: FastifyRequest<{ Params: WSParams; Querystring: WSQuery }>,
    ) => {
      const { projectId } = req.params;
      const { ticket } = req.query;

      // WebSocket connection is allowed only for authenticated project members.
      if (!ticket) {
        socket.close(4001, "Authentication required");
        return;
      }

      const wsTicket = await consumeWsTicket(ticket);
      if (!wsTicket) {
        socket.close(4001, "Invalid ticket");
        return;
      }

      const userId = wsTicket.userId;
      if (wsTicket.projectId !== projectId) {
        socket.close(4001, "Invalid ticket scope");
        return;
      }

      // Проверка членства в проекте (ACL)
      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        log.warn("WebSocket access denied", { projectId, userId });
        socket.close(4003, "Project access denied");
        return;
      }

      // Сохраняем userId на сокете для фильтрации
      socket.__userId = userId;
      socket.__projectId = projectId;

      // Добавляем в Map проекта
      if (!projectConnections.has(projectId)) {
        projectConnections.set(projectId, new Set());
      }
      const projectSockets = projectConnections.get(projectId);
      if (!projectSockets) {
        socket.close(1011, "Connection registration failed");
        return;
      }
      projectSockets.add(socket);

      // Добавляем в Map пользователя
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      const userSockets = userConnections.get(userId);
      if (!userSockets) {
        socket.close(1011, "Connection registration failed");
        return;
      }
      userSockets.add(socket);

      log.info("Client connected", { projectId, userId });

      // Отправляем приветственное сообщение
      socket.send(
        JSON.stringify({
          type: "connected",
          projectId,
          timestamp: Date.now(),
        }),
      );

      // Обработка входящих сообщений (ping/pong, подписки и т.д.)
      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString()) as { type?: string };

          // Обработка ping
          if (data.type === "ping") {
            socket.send(
              JSON.stringify({ type: "pong", timestamp: Date.now() }),
            );
          }
        } catch (error) {
          // Игнорируем невалидные сообщения (не JSON), но оставляем trace в логах
          log.debug("Invalid message received", {
            projectId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // Очистка при закрытии
      socket.on("close", () => {
        log.info("Client disconnected", { projectId, userId });

        // Удаляем из Map проекта
        const projectSockets = projectConnections.get(projectId);
        if (projectSockets) {
          projectSockets.delete(socket);
          if (projectSockets.size === 0) {
            projectConnections.delete(projectId);
          }
        }

        // Удаляем из Map пользователя
        const userSockets = userConnections.get(userId);
        if (userSockets) {
          userSockets.delete(socket);
          if (userSockets.size === 0) {
            userConnections.delete(userId);
          }
        }
      });

      socket.on("error", (err) => {
        log.error("Socket error", err, { projectId, userId });
      });
    },
  );
}

/**
 * Получить статистику подключений
 */
export function getConnectionStats() {
  const stats: Record<string, number> = {};
  for (const [projectId, connections] of projectConnections) {
    stats[projectId] = connections.size;
  }
  const ticketBackend = getRedisClient() ? "redis" : "memory";

  return {
    totalProjects: projectConnections.size,
    totalUsers: userConnections.size,
    wsTicketBackend: ticketBackend,
    pendingInMemoryTickets: wsTickets.size,
    byProject: stats,
  };
}
