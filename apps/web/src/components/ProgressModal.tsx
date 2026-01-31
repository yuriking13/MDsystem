import React, { useEffect, useState, useRef } from "react";
import { getErrorMessage } from "../lib/errorUtils";

interface ProgressData {
  done: number;
  total: number;
  percent: number;
  speed?: number;
  eta?: number;
}

interface CompleteData {
  ok: boolean;
  translated?: number;
  enriched?: number;
  analyzed?: number;
  found?: number;
  failed?: number;
  total: number;
  elapsedSeconds: number;
  speed: number;
  message: string;
}

interface ProgressModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;
  body?: any;
  onComplete?: (data: CompleteData) => void;
}

export function ProgressModal({
  show,
  onClose,
  title,
  endpoint,
  body,
  onComplete,
}: ProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "running" | "complete" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!show) {
      // Закрываем SSE соединение при закрытии модального окна
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    // Сбрасываем состояние
    setProgress(0);
    setDone(0);
    setTotal(0);
    setSpeed(0);
    setEta(0);
    setStatus("idle");
    setMessage("Инициализация...");
    setError("");

    // Начинаем SSE подключение
    const startProcess = async () => {
      try {
        setStatus("running");

        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Нет токена авторизации");
        }

        // Используем fetch для POST запроса с SSE
        abortControllerRef.current = new AbortController();
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body || {}),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка ${response.status}: ${errorText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Не удалось получить поток данных");
        }

        // Читаем SSE поток
        while (true) {
          const { done: readerDone, value } = await reader.read();

          if (readerDone) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.substring(7).trim();
              continue;
            }

            if (line.startsWith("data: ")) {
              const data = line.substring(6);

              try {
                const parsed = JSON.parse(data);

                // Определяем тип события по данным
                if (parsed.total !== undefined && parsed.done === undefined) {
                  // start событие
                  setTotal(parsed.total);
                  setMessage(`Начало обработки ${parsed.total} элементов...`);
                } else if (parsed.percent !== undefined) {
                  // progress событие
                  setProgress(parsed.percent);
                  setDone(parsed.done);
                  setTotal(parsed.total);
                  if (parsed.speed !== undefined) {
                    setSpeed(parsed.speed);
                  }
                  if (parsed.eta !== undefined) {
                    setEta(parsed.eta);
                  }
                  setMessage(
                    `Обработано ${parsed.done} из ${parsed.total} (${parsed.percent}%)`,
                  );
                } else if (parsed.articlesPerSecond !== undefined) {
                  // speed событие
                  setSpeed(parsed.articlesPerSecond);
                } else if (parsed.ok !== undefined) {
                  // complete событие
                  setStatus("complete");
                  setProgress(100);
                  setMessage(parsed.message || "Завершено");

                  if (onComplete) {
                    onComplete(parsed as CompleteData);
                  }
                } else if (parsed.error) {
                  // error событие
                  setStatus("error");
                  setError(parsed.error);
                  setMessage("Ошибка при обработке");
                }
              } catch (e) {
                console.error("Ошибка парсинга SSE данных:", e, data);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Запрос отменён");
        } else {
          console.error("Ошибка SSE:", err);
          setStatus("error");
          setError(getErrorMessage(err) || "Неизвестная ошибка");
          setMessage("Ошибка подключения");
        }
      }
    };

    startProcess();

    // Очистка при размонтировании
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [show, endpoint, body, onComplete]);

  const handleClose = () => {
    if (status === "running") {
      if (confirm("Процесс ещё выполняется. Закрыть окно?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}с`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}м ${secs}с`;
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* Прогресс-бар */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ fontWeight: 500 }}>{message}</span>
                <span style={{ color: "#6b7280" }}>{progress}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "1.5rem",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    backgroundColor:
                      status === "error"
                        ? "#ef4444"
                        : status === "complete"
                          ? "#10b981"
                          : "#3b82f6",
                    transition: "width 0.3s ease",
                  }}
                ></div>
              </div>
            </div>

            {/* Статистика */}
            {total > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "1rem",
                  fontSize: "0.875rem",
                }}
              >
                <div>
                  <span style={{ color: "#6b7280" }}>Обработано:</span>
                  <span style={{ marginLeft: "0.5rem", fontWeight: 500 }}>
                    {done} / {total}
                  </span>
                </div>
                {speed > 0 && (
                  <div>
                    <span style={{ color: "#6b7280" }}>Скорость:</span>
                    <span style={{ marginLeft: "0.5rem", fontWeight: 500 }}>
                      {speed.toFixed(1)} эл/сек
                    </span>
                  </div>
                )}
                {eta > 0 && status === "running" && (
                  <div>
                    <span style={{ color: "#6b7280" }}>Осталось:</span>
                    <span style={{ marginLeft: "0.5rem", fontWeight: 500 }}>
                      {formatTime(eta)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.5rem",
                }}
              >
                <p style={{ fontSize: "0.875rem", color: "#991b1b" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Индикатор загрузки */}
            {status === "running" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.5rem 0",
                }}
              >
                <div
                  className="spinner"
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    border: "2px solid #e5e7eb",
                    borderTopColor: "#3b82f6",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <span
                  style={{
                    marginLeft: "0.75rem",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                >
                  Обработка...
                </span>
              </div>
            )}

            {/* Сообщение об успехе */}
            {status === "complete" && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "0.5rem",
                }}
              >
                <p style={{ fontSize: "0.875rem", color: "#166534" }}>
                  ✓ {message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={handleClose} className="btn btn-secondary">
            {status === "running" ? "Отменить" : "Закрыть"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
