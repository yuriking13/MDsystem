import React, { useState, useRef, useEffect } from "react";
import { cn } from "../design-system/utils/cn";
import {
  SparklesIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  LightBulbIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  BookOpenIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

interface SuggestedAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  onClick: () => void;
}

interface ArticleAISidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;

  // Chat
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;

  // Context
  selectedArticlesCount: number;
  projectName?: string;

  // Suggested Actions
  suggestedActions?: SuggestedAction[];

  // Quick Actions
  onAnalyzeSelection?: () => void;
  onSummarizeAll?: () => void;
  onFindSimilar?: () => void;
  onGenerateCriteria?: () => void;

  className?: string;
}

const DEFAULT_SUGGESTIONS: SuggestedAction[] = [
  {
    id: "analyze",
    label: "Analyze selected articles",
    icon: <ChartBarIcon className="w-4 h-4" />,
    description: "Get insights about methodology and findings",
    onClick: () => {},
  },
  {
    id: "summarize",
    label: "Summarize abstracts",
    icon: <DocumentTextIcon className="w-4 h-4" />,
    description: "Generate a summary of selected papers",
    onClick: () => {},
  },
  {
    id: "criteria",
    label: "Suggest inclusion criteria",
    icon: <BeakerIcon className="w-4 h-4" />,
    description: "Based on your selected articles",
    onClick: () => {},
  },
  {
    id: "similar",
    label: "Find similar articles",
    icon: <MagnifyingGlassIcon className="w-4 h-4" />,
    description: "Discover related research",
    onClick: () => {},
  },
];

function QuickActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-center",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className="text-blue-500">{icon}</span>
      <span className="text-xs text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
    </button>
  );
}

export default function ArticleAISidebar({
  isOpen,
  onToggle,
  onClose,
  messages,
  onSendMessage,
  isLoading = false,
  selectedArticlesCount,
  projectName,
  suggestedActions = DEFAULT_SUGGESTIONS,
  onAnalyzeSelection,
  onSummarizeAll,
  onFindSimilar,
  onGenerateCriteria,
  className,
}: ArticleAISidebarProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Collapsed state - just a toggle button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          "fixed right-4 bottom-4 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all",
          className,
        )}
      >
        <SparklesIcon className="w-5 h-5" />
        <span className="font-medium">MD Assistant</span>
        {selectedArticlesCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {selectedArticlesCount} selected
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "w-80 lg:w-96 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700/50 flex flex-col h-full",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              MD Assistant
            </h3>
            <p className="text-xs text-neutral-500">
              AI-powered research helper
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Context Banner */}
      {selectedArticlesCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-medium">{selectedArticlesCount}</span>{" "}
            articles selected
            {projectName && (
              <span className="text-blue-500"> • {projectName}</span>
            )}
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Welcome Message */}
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                How can I help?
              </h4>
              <p className="text-sm text-neutral-500">
                Ask questions about your articles or use the actions below
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
              <QuickActionButton
                icon={<ChartBarIcon className="w-5 h-5" />}
                label="Analyze"
                onClick={onAnalyzeSelection}
                disabled={selectedArticlesCount === 0}
              />
              <QuickActionButton
                icon={<DocumentTextIcon className="w-5 h-5" />}
                label="Summarize"
                onClick={onSummarizeAll}
              />
              <QuickActionButton
                icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                label="Find Similar"
                onClick={onFindSimilar}
                disabled={selectedArticlesCount === 0}
              />
              <QuickActionButton
                icon={<BeakerIcon className="w-5 h-5" />}
                label="Criteria"
                onClick={onGenerateCriteria}
              />
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Suggestions
              </p>
              {suggestedActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
                >
                  <span className="text-blue-500 mt-0.5">{action.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {action.label}
                    </p>
                    {action.description && (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {action.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5",
                    message.role === "user"
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-md",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.role === "user"
                        ? "text-blue-200"
                        : "text-neutral-400",
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {message.status === "sending" && " • Sending..."}
                    {message.status === "error" && " • Failed"}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700/50">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your articles..."
            rows={1}
            className="w-full px-4 py-3 pr-12 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            style={{
              minHeight: "44px",
              maxHeight: "120px",
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors",
              inputValue.trim() && !isLoading
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400",
            )}
          >
            {isLoading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-4 h-4" />
            )}
          </button>
        </form>

        <p className="text-xs text-neutral-400 text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
