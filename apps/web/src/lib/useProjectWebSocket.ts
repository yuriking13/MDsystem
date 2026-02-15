import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "./api";

type WSPayloadRecord = Record<string, unknown>;

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
  payload?: WSPayloadRecord;
  timestamp: number;
  userId?: string;
}

export type WSEventHandler = (event: WSEvent) => void;

interface UseProjectWebSocketOptions<
  TStatistic extends WSPayloadRecord = WSPayloadRecord,
  TDocument extends WSPayloadRecord = WSPayloadRecord,
> {
  projectId: string | undefined;
  onStatisticCreated?: (statistic: TStatistic) => void;
  onStatisticUpdated?: (statistic: TStatistic) => void;
  onStatisticDeleted?: (statisticId: string) => void;
  onDocumentUpdated?: (document: TDocument) => void;
  onDocumentDeleted?: (documentId: string) => void;
  onEvent?: WSEventHandler; // Общий обработчик всех событий
  enabled?: boolean;
}

interface UseProjectWebSocketReturn {
  isConnected: boolean;
  lastEvent: WSEvent | null;
  reconnect: () => void;
}

function asPayloadRecord(value: unknown): WSPayloadRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as WSPayloadRecord;
}

function asPayloadString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * React Hook для подписки на real-time события проекта через WebSocket
 */
export function useProjectWebSocket<
  TStatistic extends WSPayloadRecord = WSPayloadRecord,
  TDocument extends WSPayloadRecord = WSPayloadRecord,
>({
  projectId,
  onStatisticCreated,
  onStatisticUpdated,
  onStatisticDeleted,
  onDocumentUpdated,
  onDocumentDeleted,
  onEvent,
  enabled = true,
}: UseProjectWebSocketOptions<
  TStatistic,
  TDocument
>): UseProjectWebSocketReturn {
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
              case "statistic:created": {
                const statistic = asPayloadRecord(data.payload?.statistic);
                if (statistic) {
                  callbacksRef.current.onStatisticCreated?.(
                    statistic as TStatistic,
                  );
                }
                break;
              }
              case "statistic:updated": {
                const statistic = asPayloadRecord(data.payload?.statistic);
                if (statistic) {
                  callbacksRef.current.onStatisticUpdated?.(
                    statistic as TStatistic,
                  );
                }
                break;
              }
              case "statistic:deleted": {
                const statisticId = asPayloadString(data.payload?.statisticId);
                if (statisticId) {
                  callbacksRef.current.onStatisticDeleted?.(statisticId);
                }
                break;
              }
              case "document:updated": {
                const document = asPayloadRecord(data.payload?.document);
                if (document) {
                  callbacksRef.current.onDocumentUpdated?.(
                    document as TDocument,
                  );
                }
                break;
              }
              case "document:deleted": {
                const documentId = asPayloadString(data.payload?.documentId);
                if (documentId) {
                  callbacksRef.current.onDocumentDeleted?.(documentId);
                }
                break;
              }
              case "connected":
                break;
              case "pong":
                // Ping-pong для keepalive
                break;
            }
          } catch {
            // Ignore invalid websocket payloads
          }
        };

        ws.onclose = (event) => {
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

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          }
        };

        ws.onerror = () => {
          // handled by onclose + retry logic
        };
      } catch {
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
