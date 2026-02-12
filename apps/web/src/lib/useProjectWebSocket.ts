import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "./api";

// Типы событий
export type WSEventType =
  | "statistic:created"
  | "statistic:updated"
  | "statistic:deleted"
  | "document:updated"
  | "document:deleted"
  | "article:statusChanged"
  | "project:updated"
  | "search:progress"
  | "connected"
  | "pong";

export interface WSEvent {
  type: WSEventType;
  projectId?: string;
  payload?: Record<string, any>;
  timestamp: number;
  userId?: string;
}

export type WSEventHandler = (event: WSEvent) => void;

interface UseProjectWebSocketOptions {
  projectId: string | undefined;
  onStatisticCreated?: (statistic: any) => void;
  onStatisticUpdated?: (statistic: any) => void;
  onStatisticDeleted?: (statisticId: string) => void;
  onDocumentUpdated?: (document: any) => void;
  onDocumentDeleted?: (documentId: string) => void;
  onEvent?: WSEventHandler; // Общий обработчик всех событий
  enabled?: boolean;
}

interface UseProjectWebSocketReturn {
  isConnected: boolean;
  lastEvent: WSEvent | null;
  reconnect: () => void;
}

/**
 * React Hook для подписки на real-time события проекта через WebSocket
 */
export function useProjectWebSocket({
  projectId,
  onStatisticCreated,
  onStatisticUpdated,
  onStatisticDeleted,
  onDocumentUpdated,
  onDocumentDeleted,
  onEvent,
  enabled = true,
}: UseProjectWebSocketOptions): UseProjectWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Сохраняем callbacks в ref чтобы избежать пересоздания эффекта
  const callbacksRef = useRef({
    onStatisticCreated,
    onStatisticUpdated,
    onStatisticDeleted,
    onDocumentUpdated,
    onDocumentDeleted,
    onEvent,
  });

  // Обновляем callbacks при изменении
  useEffect(() => {
    callbacksRef.current = {
      onStatisticCreated,
      onStatisticUpdated,
      onStatisticDeleted,
      onDocumentUpdated,
      onDocumentDeleted,
      onEvent,
    };
  }, [
    onStatisticCreated,
    onStatisticUpdated,
    onStatisticDeleted,
    onDocumentUpdated,
    onDocumentDeleted,
    onEvent,
  ]);

  const connect = useCallback(() => {
    if (!projectId || !enabled) return;

    // Закрываем существующее соединение
    if (wsRef.current) {
      wsRef.current.close();
    }

    const startConnection = async () => {
      try {
        const ticketPayload = await apiFetch<{ ticket?: string }>(
          "/api/ws-ticket",
          {
            method: "POST",
            body: JSON.stringify({ projectId }),
          },
        );
        if (!ticketPayload.ticket) {
          throw new Error("WS ticket response is invalid");
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/project/${projectId}?ticket=${encodeURIComponent(ticketPayload.ticket)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[WS] Connected to project:", projectId);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;

          // Запускаем ping каждые 30 секунд для поддержания соединения
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data: WSEvent = JSON.parse(event.data);
            setLastEvent(data);

            // Вызываем общий обработчик
            callbacksRef.current.onEvent?.(data);

            // Вызываем специфичные обработчики
            switch (data.type) {
              case "statistic:created":
                callbacksRef.current.onStatisticCreated?.(
                  data.payload?.statistic,
                );
                break;
              case "statistic:updated":
                callbacksRef.current.onStatisticUpdated?.(
                  data.payload?.statistic,
                );
                break;
              case "statistic:deleted":
                callbacksRef.current.onStatisticDeleted?.(
                  data.payload?.statisticId,
                );
                break;
              case "document:updated":
                callbacksRef.current.onDocumentUpdated?.(
                  data.payload?.document,
                );
                break;
              case "document:deleted":
                callbacksRef.current.onDocumentDeleted?.(
                  data.payload?.documentId,
                );
                break;
              case "connected":
                console.log("[WS] Server acknowledged connection");
                break;
              case "pong":
                // Ping-pong для keepalive
                break;
            }
          } catch (err) {
            console.error("[WS] Failed to parse message:", err);
          }
        };

        ws.onclose = (event) => {
          console.log("[WS] Disconnected:", event.code, event.reason);
          setIsConnected(false);

          // Очищаем ping interval
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          // Переподключение с экспоненциальной задержкой
          if (enabled && event.code !== 4001) {
            // 4001 = auth/ticket issue, не переподключаемся
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000,
            );
            console.log(`[WS] Reconnecting in ${delay}ms...`);

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          }
        };

        ws.onerror = (error) => {
          console.error("[WS] Error:", error);
        };
      } catch (error) {
        console.error("[WS] Failed to initialize connection:", error);
        setIsConnected(false);
      }
    };

    void startConnection();
  }, [projectId, enabled]);

  // Подключаемся при монтировании или изменении projectId
  useEffect(() => {
    connect();

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return {
    isConnected,
    lastEvent,
    reconnect,
  };
}

/**
 * Контекст для глобального состояния WebSocket (опционально)
 */
export function createWebSocketManager() {
  const connections = new Map<string, WebSocket>();

  return {
    getConnection(projectId: string) {
      return connections.get(projectId);
    },

    setConnection(projectId: string, ws: WebSocket) {
      connections.set(projectId, ws);
    },

    removeConnection(projectId: string) {
      const ws = connections.get(projectId);
      if (ws) {
        ws.close();
        connections.delete(projectId);
      }
    },

    closeAll() {
      for (const ws of connections.values()) {
        ws.close();
      }
      connections.clear();
    },
  };
}
