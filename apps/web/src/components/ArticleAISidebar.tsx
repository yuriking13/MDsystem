import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  apiArticlesAIAssistant,
  type ArticlesAISuggestedArticle,
  type ArticlesAIAssistantResponse,
} from "../lib/api";

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
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  viewStatus?: "candidate" | "selected" | "excluded" | "deleted" | "all";
  candidateCount?: number;
  // Callback when user clicks "add to selected" on a suggested article
  onAddToSelected?: (articleIds: string[]) => void;
  // Callback to highlight an article in the list
  onHighlightArticle?: (articleId: string) => void;
  // Optional external messages and handlers (for test compatibility)
  messages?: AIMessage[];
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
  selectedArticlesCount?: number;
  suggestedActions?: SuggestedAction[];
  onAnalyzeSelection?: () => void;
  onSummarizeAll?: () => void;
  onFindSimilar?: () => void;
  onGenerateCriteria?: () => void;
};

// ============================================================
// Component
// ============================================================

export default function ArticleAISidebar({
  isOpen,
  onToggle,
  onClose,
  projectId = "",
  projectName,
  viewStatus = "candidate",
  candidateCount = 0,
  onAddToSelected,
  onHighlightArticle,
  // For backward compatibility with tests
  messages: externalMessages,
  onSendMessage: externalOnSendMessage,
  isLoading: externalIsLoading,
  selectedArticlesCount,
  suggestedActions: externalSuggestedActions,
  onAnalyzeSelection,
  onSummarizeAll,
  onFindSimilar,
  onGenerateCriteria,
}: Props) {
  // Internal state (used when no external messages provided)
  const [internalMessages, setInternalMessages] = useState<AIMessage[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [input, setInput] = useState("");
  const [maxSuggestions, setMaxSuggestions] = useState(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Determine if using external or internal state
  const messages = externalMessages ?? internalMessages;
  const isLoading = externalIsLoading ?? internalLoading;

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
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || isLoading) return;
      setInput("");

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
      } catch (err: any) {
        const errorMessage: AIMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Ошибка: ${err.message || "Не удалось получить ответ от AI"}`,
          timestamp: new Date(),
          status: "error",
        };
        setInternalMessages((prev) => [...prev, errorMessage]);
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
      onClick: () =>
        onAnalyzeSelection
          ? onAnalyzeSelection()
          : handleSend(
              "Проанализируй отобранные статьи и выдели ключевые темы",
            ),
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
      onClick: () =>
        onSummarizeAll
          ? onSummarizeAll()
          : handleSend("Сделай краткое резюме всех статей-кандидатов"),
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
      onClick: () =>
        onFindSimilar
          ? onFindSimilar()
          : handleSend("Найди статьи с похожей тематикой и методологией"),
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
      onClick: () =>
        onGenerateCriteria
          ? onGenerateCriteria()
          : handleSend(
              "Предложи критерии отбора статей на основе текущих кандидатов",
            ),
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
        className="article-ai-fab"
        onClick={onToggle}
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
        <span className="article-ai-fab-label">MD Assistant</span>
        {(selectedArticlesCount ?? candidateCount) > 0 && (
          <span className="article-ai-fab-badge">
            {selectedArticlesCount ?? candidateCount} selected
          </span>
        )}
      </button>
    );
  }

  // ============================================================
  // Render: Sidebar Panel (when open)
  // ============================================================
  return (
    <div className="article-ai-sidebar">
      {/* Header */}
      <div className="article-ai-header">
        <div className="article-ai-header-info">
          <div className="article-ai-header-title">
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
          <div className="article-ai-header-sub">
            AI-powered research helper
          </div>
        </div>
        <div className="article-ai-header-actions">
          {messages.length > 0 && (
            <button
              className="article-ai-icon-btn"
              onClick={handleClearChat}
              title="Очистить чат"
              type="button"
              aria-label="Clear chat"
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
            className="article-ai-icon-btn"
            onClick={onClose}
            type="button"
            aria-label=""
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Context Banner */}
      {(selectedArticlesCount ?? candidateCount) > 0 && (
        <div className="article-ai-context">
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
            <strong>{selectedArticlesCount ?? candidateCount}</strong> articles
            selected
            {projectName && (
              <>
                {" "}
                in <em>{projectName}</em>
              </>
            )}
          </span>
        </div>
      )}

      {/* Settings Row (only in internal mode) */}
      {!externalMessages && (
        <div className="article-ai-settings">
          <label className="article-ai-setting-label">
            <span>Макс. рекомендаций:</span>
            <select
              value={maxSuggestions}
              onChange={(e) => setMaxSuggestions(Number(e.target.value))}
              className="article-ai-setting-select"
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
      <div className="article-ai-messages">
        {messages.length === 0 ? (
          <div className="article-ai-empty">
            <div className="article-ai-empty-icon">
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
              Ask questions about your articles, request analysis, or get AI
              recommendations for article selection.
            </p>

            {/* Quick Actions */}
            <div className="article-ai-quick-actions">
              {suggestedActions.map((action) => (
                <button
                  key={action.id}
                  className="article-ai-quick-btn"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  type="button"
                >
                  {action.icon}
                  <span>{action.label}</span>
                  {action.description && (
                    <span className="article-ai-quick-btn-desc">
                      {action.description}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Suggested Prompts */}
            <div className="article-ai-prompts">
              {defaultPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  className="article-ai-prompt-btn"
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
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`article-ai-message ${msg.role === "user" ? "article-ai-message--user" : "article-ai-message--assistant"} ${msg.status === "error" ? "article-ai-message--error" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="article-ai-message-avatar">
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
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div className="article-ai-message-content">
                  <div className="article-ai-message-text">{msg.content}</div>

                  {/* Suggested Articles */}
                  {msg.suggestedArticles &&
                    msg.suggestedArticles.length > 0 && (
                      <div className="article-ai-suggestions">
                        <div className="article-ai-suggestions-header">
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
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>
                            Рекомендованные статьи (
                            {msg.suggestedArticles.length})
                            {msg.totalAnalyzed && (
                              <span className="article-ai-analyzed-badge">
                                из {msg.totalAnalyzed} проанализированных
                              </span>
                            )}
                          </span>
                          {onAddToSelected && (
                            <button
                              className="article-ai-add-all-btn"
                              onClick={() =>
                                onAddToSelected(
                                  msg
                                    .suggestedArticles!.filter(
                                      (a) => a.status === "candidate",
                                    )
                                    .map((a) => a.id),
                                )
                              }
                              type="button"
                              title="Добавить все рекомендованные в отобранные"
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Отобрать все
                            </button>
                          )}
                        </div>
                        <div className="article-ai-suggestions-list">
                          {msg.suggestedArticles.map((article, idx) => (
                            <div
                              key={article.id}
                              className="article-ai-suggestion-item"
                            >
                              <div className="article-ai-suggestion-rank">
                                {idx + 1}
                              </div>
                              <div className="article-ai-suggestion-body">
                                <div
                                  className="article-ai-suggestion-title"
                                  onClick={() =>
                                    onHighlightArticle?.(article.id)
                                  }
                                  title="Показать в списке"
                                >
                                  {article.title_ru ||
                                    article.title_en ||
                                    "Без названия"}
                                </div>
                                <div className="article-ai-suggestion-meta">
                                  {article.year && (
                                    <span className="article-ai-tag">
                                      {article.year}
                                    </span>
                                  )}
                                  {article.journal && (
                                    <span className="article-ai-tag">
                                      {article.journal}
                                    </span>
                                  )}
                                  {article.has_stats && (
                                    <span className="article-ai-tag article-ai-tag--stats">
                                      Стат. {article.stats_quality}/3
                                    </span>
                                  )}
                                  {article.source && (
                                    <span className="article-ai-tag article-ai-tag--source">
                                      {article.source.toUpperCase()}
                                    </span>
                                  )}
                                  <span
                                    className={`article-ai-tag article-ai-tag--status article-ai-tag--${article.status}`}
                                  >
                                    {article.status === "candidate"
                                      ? "Кандидат"
                                      : article.status === "selected"
                                        ? "Отобрана"
                                        : article.status === "excluded"
                                          ? "Исключена"
                                          : article.status}
                                  </span>
                                </div>
                                {article.reason && (
                                  <div className="article-ai-suggestion-reason">
                                    {article.reason}
                                  </div>
                                )}
                              </div>
                              <div className="article-ai-suggestion-actions">
                                {article.status === "candidate" &&
                                  onAddToSelected && (
                                    <button
                                      className="article-ai-action-btn article-ai-action-btn--select"
                                      onClick={() =>
                                        onAddToSelected([article.id])
                                      }
                                      type="button"
                                      title="Добавить в отобранные"
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
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </button>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {msg.summary && (
                          <div className="article-ai-summary">
                            <span>Критерии: {msg.summary.criteria}</span>
                          </div>
                        )}
                      </div>
                    )}

                  <div className="article-ai-message-time">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="article-ai-message article-ai-message--assistant">
                <div className="article-ai-message-avatar">
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
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="article-ai-message-content">
                  <div className="article-ai-loading">
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    >
                      .
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    >
                      .
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    >
                      .
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="article-ai-input-area">
        <div className="article-ai-input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your articles..."
            className="article-ai-textarea"
            rows={2}
            disabled={isLoading}
          />
          <button
            className="article-ai-send-btn"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            type="button"
            aria-label="Send message"
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
        <div className="article-ai-input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
