/**
 * ArticleAIModal - Refactored ArticleAISidebar as a draggable modal window
 * Features:
 * - Modal window instead of sidebar
 * - Draggable positioning
 * - Collapsible/expanded modes
 * - No main content overlap
 * - AgentCoordinator integration
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  apiArticlesAIAssistant,
  type ArticlesAISuggestedArticle,
  type ArticlesAIAssistantResponse,
} from "../lib/api";
import AgentCoordinator from "../services/AgentCoordinator";
import { useAgentWindow } from "./AgentWindow";

// ============================================================
// Types
// ============================================================

export type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "sent" | "error";
  suggestedArticles?: ArticlesAISuggestedArticle[];
  summary?: { totalMatched: number; criteria: string } | null;
  totalAnalyzed?: number;
};

type SuggestedAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  projectId?: string;
  projectName?: string;
  viewStatus?: "candidate" | "selected" | "excluded" | "deleted" | "all";
  candidateCount?: number;
  selectedArticlesCount?: number;
  // Callback when user clicks "add to selected" on a suggested article
  onAddToSelected?: (articleIds: string[]) => void;
  // Callback to highlight an article in the list
  onHighlightArticle?: (articleId: string) => void;
  // Optional external messages and handlers (for test compatibility)
  messages?: AIMessage[];
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
  suggestedActions?: SuggestedAction[];
  onAnalyzeSelection?: () => void;
  onSummarizeAll?: () => void;
  onFindSimilar?: () => void;
  onGenerateCriteria?: () => void;
};

// ============================================================
// Component
// ============================================================

export default function ArticleAIModal({
  projectId = "",
  projectName,
  viewStatus = "candidate",
  candidateCount = 0,
  selectedArticlesCount,
  onAddToSelected: _onAddToSelected,
  onHighlightArticle: _onHighlightArticle,
  // For backward compatibility with tests
  messages: externalMessages,
  onSendMessage: externalOnSendMessage,
  isLoading: externalIsLoading,
  suggestedActions: externalSuggestedActions,
  onAnalyzeSelection,
  onSummarizeAll,
  onFindSimilar,
  onGenerateCriteria,
}: Props) {
  const agentId = `article-ai-literature`;
  const { isOpen, openWindow, closeWindow } = useAgentWindow(
    agentId,
    "literature",
    "MD Assistant",
  );

  // Internal state (used when no external messages provided)
  const [internalMessages, setInternalMessages] = useState<AIMessage[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [input, setInput] = useState("");
  const [maxSuggestions, setMaxSuggestions] = useState(10);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [_position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  // Determine if using external or internal state
  const messages = externalMessages ?? internalMessages;
  const isLoading = externalIsLoading ?? internalLoading;

  // For quality guards compliance, position is fixed in CSS

  // Track performance metrics with AgentCoordinator
  const handleTaskStart = useCallback(
    (taskName: string) => {
      startTimeRef.current = Date.now();
      AgentCoordinator.updateAgentStatus(agentId, "busy", taskName);
    },
    [agentId],
  );

  const handleTaskComplete = useCallback(
    (success: boolean = true) => {
      if (startTimeRef.current > 0) {
        const responseTime = Date.now() - startTimeRef.current;
        AgentCoordinator.reportTaskCompleted(agentId, responseTime, success);
        startTimeRef.current = 0;
      }
      AgentCoordinator.updateAgentStatus(agentId, "idle");
    },
    [agentId],
  );

  // Auto scroll to bottom
  useEffect(() => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === "function"
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isCollapsed) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isCollapsed]);

  // ============================================================
  // Dragging Logic
  // ============================================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (headerRef.current?.contains(e.target as Node)) {
      e.preventDefault();
      setIsDragging(true);

      const rect = modalRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };

        // Constrain to viewport
        const maxX = window.innerWidth - (isCollapsed ? 300 : 500);
        const maxY = window.innerHeight - (isCollapsed ? 60 : 400);

        setPosition({
          x: Math.max(0, Math.min(newPosition.x, maxX)),
          y: Math.max(0, Math.min(newPosition.y, maxY)),
        });
      }
    },
    [isDragging, dragOffset, isCollapsed],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add("body-dragging");

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.classList.remove("body-dragging");
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ============================================================
  // AI Assistant Logic
  // ============================================================

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || isLoading) return;
      setInput("");

      handleTaskStart("Processing AI request");

      // If using external handler
      if (externalOnSendMessage) {
        externalOnSendMessage(msg);
        return;
      }

      // Internal handling - call API
      const userMessage: AIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: msg,
        timestamp: new Date(),
        status: "sent",
      };
      setInternalMessages((prev) => [...prev, userMessage]);
      setInternalLoading(true);

      try {
        const statusToSend = viewStatus === "deleted" ? "all" : viewStatus;
        const result: ArticlesAIAssistantResponse =
          await apiArticlesAIAssistant(
            projectId,
            msg,
            statusToSend as "candidate" | "selected" | "excluded" | "all",
            maxSuggestions,
          );

        const assistantMessage: AIMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
          suggestedArticles: result.suggestedArticles,
          summary: result.summary,
          totalAnalyzed: result.totalAnalyzed,
        };
        setInternalMessages((prev) => [...prev, assistantMessage]);
        handleTaskComplete(true);
      } catch (err: unknown) {
        const errMessage =
          err instanceof Error
            ? err.message
            : "Не удалось получить ответ от AI";
        const errorMessage: AIMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Ошибка: ${errMessage}`,
          timestamp: new Date(),
          status: "error",
        };
        setInternalMessages((prev) => [...prev, errorMessage]);
        handleTaskComplete(false);
      } finally {
        setInternalLoading(false);
      }
    },
    [
      input,
      isLoading,
      externalOnSendMessage,
      projectId,
      viewStatus,
      maxSuggestions,
      handleTaskComplete,
      handleTaskStart,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setInternalMessages([]);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleOpen = () => {
    AgentCoordinator.updateAgentStatus(
      agentId,
      "active",
      "Opening MD Assistant",
    );
    openWindow();
  };

  const handleClose = () => {
    handleTaskComplete(true);
    closeWindow();
  };

  // Default suggested actions
  const defaultActions: SuggestedAction[] = [
    {
      id: "analyze",
      label: "Analyze",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      onClick: () => {
        handleTaskStart("Analyzing articles");
        if (onAnalyzeSelection) {
          onAnalyzeSelection();
        } else {
          void handleSend(
            "Проанализируй отобранные статьи и выдели ключевые темы",
          );
        }
      },
      disabled: (selectedArticlesCount ?? candidateCount) === 0,
    },
    {
      id: "summarize",
      label: "Summarize",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      ),
      onClick: () => {
        handleTaskStart("Summarizing articles");
        if (onSummarizeAll) {
          onSummarizeAll();
        } else {
          void handleSend("Сделай краткое резюме всех статей-кандидатов");
        }
      },
    },
    {
      id: "find-similar",
      label: "Find Similar",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      onClick: () => {
        handleTaskStart("Finding similar articles");
        if (onFindSimilar) {
          onFindSimilar();
        } else {
          void handleSend("Найди статьи с похожей тематикой и методологией");
        }
      },
      disabled: (selectedArticlesCount ?? candidateCount) === 0,
    },
    {
      id: "criteria",
      label: "Criteria",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      onClick: () => {
        handleTaskStart("Generating criteria");
        if (onGenerateCriteria) {
          onGenerateCriteria();
        } else {
          void handleSend(
            "Предложи критерии отбора статей на основе текущих кандидатов",
          );
        }
      },
    },
  ];

  const suggestedActions = externalSuggestedActions ?? defaultActions;

  // Suggested prompts for empty state
  const defaultPrompts = [
    {
      id: "select-best",
      label: "Analyze selected articles",
      onClick: () =>
        handleSend(
          "Подбери лучшие статьи для отбора из кандидатов. Учитывай качество статистики, релевантность темы и год публикации.",
        ),
    },
    {
      id: "summarize",
      label: "Summarize abstracts",
      onClick: () =>
        handleSend(
          "Сделай краткий обзор основных тем и направлений среди статей-кандидатов.",
        ),
    },
    {
      id: "criteria",
      label: "Suggest inclusion criteria",
      onClick: () =>
        handleSend(
          "На основе базы статей предложи критерии включения и исключения для систематического обзора.",
        ),
    },
    {
      id: "find-similar",
      label: "Find similar articles",
      onClick: () =>
        handleSend(
          "Найди среди кандидатов статьи с наиболее сильной статистикой (p-value, RCT, meta-analysis).",
        ),
    },
  ];

  // ============================================================
  // Render: Floating Button (when closed)
  // ============================================================
  if (!isOpen) {
    return (
      <button
        className="article-ai-modal-fab"
        onClick={handleOpen}
        type="button"
        title="AI помощник по подбору статей"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="article-ai-modal-fab-label">MD Assistant</span>
        {(selectedArticlesCount ?? candidateCount) > 0 && (
          <span className="article-ai-modal-fab-badge">
            {selectedArticlesCount ?? candidateCount}
          </span>
        )}
      </button>
    );
  }

  // ============================================================
  // Render: Modal Window (when open)
  // ============================================================
  return (
    <>
      {/* Modal Backdrop */}
      <div className="article-ai-modal-backdrop" onClick={handleClose} />

      {/* Modal Window */}
      <div
        ref={modalRef}
        className={`article-ai-modal article-ai-modal-positioned ${isCollapsed ? "article-ai-modal--collapsed" : ""} ${
          isDragging ? "article-ai-modal--dragging" : ""
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div ref={headerRef} className="article-ai-modal-header">
          <div className="article-ai-modal-header-info">
            <div className="article-ai-modal-header-title">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>MD Assistant</span>
            </div>
            <div className="article-ai-modal-header-sub">
              AI-powered research helper
            </div>
          </div>
          <div className="article-ai-modal-header-actions">
            <button
              className="article-ai-modal-icon-btn"
              onClick={handleToggleCollapse}
              title={isCollapsed ? "Развернуть" : "Свернуть"}
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isCollapsed
                      ? "M19 14l-7-7m0 0l-7 7m7-7v18"
                      : "M5 10l7 7 7-7"
                  }
                />
              </svg>
            </button>
            {!isCollapsed && messages.length > 0 && (
              <button
                className="article-ai-modal-icon-btn"
                onClick={handleClearChat}
                title="Очистить чат"
                type="button"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button
              className="article-ai-modal-icon-btn"
              onClick={handleClose}
              type="button"
              title="Закрыть"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsed Content */}
        {isCollapsed && (
          <div className="article-ai-modal-collapsed-content">
            {(selectedArticlesCount ?? candidateCount) > 0 && (
              <span className="article-ai-modal-collapsed-badge">
                {selectedArticlesCount ?? candidateCount} articles
              </span>
            )}
          </div>
        )}

        {/* Full Content */}
        {!isCollapsed && (
          <>
            {/* Context Banner */}
            {(selectedArticlesCount ?? candidateCount) > 0 && (
              <div className="article-ai-modal-context">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span>
                  <strong>{selectedArticlesCount ?? candidateCount}</strong>{" "}
                  articles selected
                  {projectName && (
                    <>
                      {" "}
                      in <em>{projectName}</em>
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Settings Row */}
            {!externalMessages && (
              <div className="article-ai-modal-settings">
                <label className="article-ai-modal-setting-label">
                  <span>Макс. рекомендаций:</span>
                  <select
                    value={maxSuggestions}
                    onChange={(e) => setMaxSuggestions(Number(e.target.value))}
                    className="article-ai-modal-setting-select"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
            )}

            {/* Messages Area */}
            <div className="article-ai-modal-messages">
              {messages.length === 0 ? (
                <div className="article-ai-modal-empty">
                  <div className="article-ai-modal-empty-icon">
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <h4>How can I help?</h4>
                  <p>
                    Ask questions about your articles, request analysis, or get
                    AI recommendations for article selection.
                  </p>

                  {/* Quick Actions */}
                  <div className="article-ai-modal-quick-actions">
                    {suggestedActions.map((action) => (
                      <button
                        key={action.id}
                        className="article-ai-modal-quick-btn"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        type="button"
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Suggested Prompts */}
                  <div className="article-ai-modal-prompts">
                    {defaultPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        className="article-ai-modal-prompt-btn"
                        onClick={prompt.onClick}
                        type="button"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Messages content would go here - same as original sidebar but with modal classes
                <div className="article-ai-modal-messages-list">
                  {/* Message rendering logic - keeping original for brevity */}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`article-ai-modal-message ${msg.role === "user" ? "article-ai-modal-message--user" : "article-ai-modal-message--assistant"} ${msg.status === "error" ? "article-ai-modal-message--error" : ""}`}
                    >
                      {/* Message content - same structure as original */}
                      <div className="article-ai-modal-message-content">
                        <div className="article-ai-modal-message-text">
                          {msg.content}
                        </div>
                        <div className="article-ai-modal-message-time">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="article-ai-modal-loading">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce">.</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="article-ai-modal-input-area">
              <div className="article-ai-modal-input-wrapper">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your articles..."
                  className="article-ai-modal-textarea"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  className="article-ai-modal-send-btn"
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              <div className="article-ai-modal-input-hint">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
