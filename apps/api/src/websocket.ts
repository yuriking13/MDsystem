import type { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import type { WebSocket } from "ws";

// Типы событий WebSocket
export type WSEventType = 
  | "statistic:created"
  | "statistic:updated" 
  | "statistic:deleted"
  | "document:updated"
  | "document:deleted"
  | "article:statusChanged"
  | "project:updated";

export interface WSEvent {
  type: WSEventType;
  projectId: string;
  payload: Record<string, any>;
  timestamp: number;
  userId?: string;
}

// Хранилище соединений по projectId
const projectConnections = new Map<string, Set<WebSocket>>();

// Хранилище соединений по userId для персональных уведомлений
const userConnections = new Map<string, Set<WebSocket>>();

/**
 * Отправить событие всем подключённым клиентам проекта
 */
export function broadcastToProject(projectId: string, event: WSEvent, excludeUserId?: string) {
  const connections = projectConnections.get(projectId);
  if (!connections) return;

  const message = JSON.stringify(event);
  
  for (const ws of connections) {
    try {
      // Проверяем что соединение открыто
      if (ws.readyState === 1) { // WebSocket.OPEN
        // Исключаем отправителя если указано
        const wsUserId = (ws as any).__userId;
        if (excludeUserId && wsUserId === excludeUserId) continue;
        
        ws.send(message);
      }
    } catch (err) {
      console.error("WebSocket send error:", err);
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
      console.error("WebSocket send to user error:", err);
    }
  }
}

/**
 * Хелперы для отправки типовых событий
 */
export const wsEvents = {
  statisticCreated(projectId: string, statistic: any, userId?: string) {
    broadcastToProject(projectId, {
      type: "statistic:created",
      projectId,
      payload: { statistic },
      timestamp: Date.now(),
      userId,
    }, userId);
  },

  statisticUpdated(projectId: string, statistic: any, userId?: string) {
    broadcastToProject(projectId, {
      type: "statistic:updated",
      projectId,
      payload: { statistic },
      timestamp: Date.now(),
      userId,
    }, userId);
  },

  statisticDeleted(projectId: string, statisticId: string, userId?: string) {
    broadcastToProject(projectId, {
      type: "statistic:deleted",
      projectId,
      payload: { statisticId },
      timestamp: Date.now(),
      userId,
    }, userId);
  },

  documentUpdated(projectId: string, document: any, userId?: string) {
    broadcastToProject(projectId, {
      type: "document:updated",
      projectId,
      payload: { document },
      timestamp: Date.now(),
      userId,
    }, userId);
  },

  documentDeleted(projectId: string, documentId: string, userId?: string) {
    broadcastToProject(projectId, {
      type: "document:deleted",
      projectId,
      payload: { documentId },
      timestamp: Date.now(),
      userId,
    }, userId);
  },
};

/**
 * Регистрация WebSocket плагина
 */
export async function registerWebSocket(app: FastifyInstance) {
  await app.register(websocketPlugin);

  // WebSocket endpoint для подписки на проект
  app.get("/ws/project/:projectId", { websocket: true }, (socket, req) => {
    const projectId = (req.params as any).projectId;
    const token = (req.query as any).token;

    // Верификация токена через Fastify JWT
    let userId: string | null = null;
    try {
      if (token) {
        // Используем встроенный jwt.verify из @fastify/jwt
        const decoded = app.jwt.verify(token) as any;
        userId = decoded.sub;
      }
    } catch (err) {
      console.log("[WS] Token verification failed:", err);
      socket.close(4001, "Invalid token");
      return;
    }

    // Сохраняем userId на сокете для фильтрации
    (socket as any).__userId = userId;
    (socket as any).__projectId = projectId;

    // Добавляем в Map проекта
    if (!projectConnections.has(projectId)) {
      projectConnections.set(projectId, new Set());
    }
    projectConnections.get(projectId)!.add(socket);

    // Добавляем в Map пользователя
    if (userId) {
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)!.add(socket);
    }

    console.log(`[WS] Client connected to project ${projectId}, userId: ${userId}`);

    // Отправляем приветственное сообщение
    socket.send(JSON.stringify({
      type: "connected",
      projectId,
      timestamp: Date.now(),
    }));

    // Обработка входящих сообщений (ping/pong, подписки и т.д.)
    socket.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Обработка ping
        if (data.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (err) {
        // Игнорируем невалидные сообщения
      }
    });

    // Очистка при закрытии
    socket.on("close", () => {
      console.log(`[WS] Client disconnected from project ${projectId}`);
      
      // Удаляем из Map проекта
      const projectSockets = projectConnections.get(projectId);
      if (projectSockets) {
        projectSockets.delete(socket);
        if (projectSockets.size === 0) {
          projectConnections.delete(projectId);
        }
      }

      // Удаляем из Map пользователя
      if (userId) {
        const userSockets = userConnections.get(userId);
        if (userSockets) {
          userSockets.delete(socket);
          if (userSockets.size === 0) {
            userConnections.delete(userId);
          }
        }
      }
    });

    socket.on("error", (err) => {
      console.error(`[WS] Socket error for project ${projectId}:`, err);
    });
  });
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
