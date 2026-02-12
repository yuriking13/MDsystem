import type { FastifyInstance, FastifyRequest } from "fastify";
import websocketPlugin from "@fastify/websocket";
import type { WebSocket } from "ws";
import { createLogger } from "./utils/logger.js";
import { checkProjectAccessPool } from "./utils/project-access.js";
import crypto from "crypto";
import { z } from "zod";

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
  | "embedding:completed"
  | "embedding:error"
  | "embedding:cancelled"
  | "search:progress";

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

function cleanupExpiredTickets() {
  const now = Date.now();
  for (const [ticket, record] of wsTickets.entries()) {
    if (record.expiresAt <= now) {
      wsTickets.delete(ticket);
    }
  }
}

function issueWsTicket(userId: string, projectId: string): string {
  cleanupExpiredTickets();
  const ticket = crypto.randomBytes(24).toString("base64url");
  wsTickets.set(ticket, {
    userId,
    projectId,
    expiresAt: Date.now() + WS_TICKET_TTL_MS,
  });
  return ticket;
}

function consumeWsTicket(ticket: string): WsTicketRecord | null {
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

    const ticket = issueWsTicket(userId, projectId);
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

      const wsTicket = consumeWsTicket(ticket);
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
      projectConnections.get(projectId)!.add(socket);

      // Добавляем в Map пользователя
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)!.add(socket);

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
        } catch {
          // Игнорируем невалидные сообщения (не JSON)
          log.debug("Invalid message received", { projectId });
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
  return {
    totalProjects: projectConnections.size,
    totalUsers: userConnections.size,
    byProject: stats,
  };
}
