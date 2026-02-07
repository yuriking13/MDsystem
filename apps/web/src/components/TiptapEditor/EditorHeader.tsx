import React from "react";
import { cn } from "../../design-system/utils/cn";

interface EditorHeaderProps {
  /** Document title */
  title: string;
  /** Callback when title changes */
  onTitleChange: (title: string) => void;
  /** Callback when title edit is complete (blur) */
  onTitleBlur?: () => void;
  /** Project name for breadcrumb */
  projectName?: string;
  /** Callback to navigate back to project */
  onBackToProject: () => void;
  /** Whether document is saving */
  isSaving?: boolean;
  /** Whether bibliography is updating */
  isUpdatingBibliography?: boolean;
  /** Whether to show version history button */
  showVersionHistoryButton?: boolean;
  /** Callback when version history button clicked */
  onToggleVersionHistory?: () => void;
  /** Whether version history is open */
  isVersionHistoryOpen?: boolean;
  /** Additional actions (right side) */
  additionalActions?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * EditorHeader - Top header bar for document editor
 *
 * Features:
 * - Breadcrumb navigation (back to project)
 * - Editable document title
 * - Save status indicator
 * - Version history toggle
 * - Action buttons
 */
export default function EditorHeader({
  title,
  onTitleChange,
  onTitleBlur,
  projectName,
  onBackToProject,
  isSaving = false,
  isUpdatingBibliography = false,
  showVersionHistoryButton = true,
  onToggleVersionHistory,
  isVersionHistoryOpen = false,
  additionalActions,
  className,
}: EditorHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-3 py-2",
        "bg-[#0d1b2a]",
        "border-b border-[rgba(56,89,138,0.25)]",
        "sticky top-0 z-20",
        className,
      )}
    >
      {/* Left section: Back button + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Back button */}
        <button
          onClick={onBackToProject}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1",
            "text-sm text-neutral-400",
            "hover:text-neutral-200",
            "hover:bg-[#162236]",
            "rounded transition-colors",
          )}
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
              strokeWidth={1.5}
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          <span className="hidden sm:inline text-xs">
            {projectName ? `Назад` : "Назад"}
          </span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[rgba(56,89,138,0.25)] hidden sm:block" />

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          placeholder="Название документа"
          className={cn(
            "max-w-xs px-1.5 py-0",
            "text-sm font-medium",
            "bg-transparent",
            "border-0",
            "focus:outline-none",
            "text-neutral-200",
            "placeholder:text-neutral-500",
          )}
        />
      </div>

      {/* Right section: Status + Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Status indicators */}
        <div className="flex items-center gap-2 text-xs">
          {/* Bibliography updating */}
          {isUpdatingBibliography && (
            <span className="flex items-center gap-1.5 text-blue-400">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden md:inline">Обновление...</span>
            </span>
          )}

          {/* Save status */}
          {isSaving ? (
            <span className="flex items-center gap-1 text-neutral-400">
              <svg
                className="w-3.5 h-3.5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden md:inline">Сохранение...</span>
            </span>
          ) : (
            !isUpdatingBibliography && (
              <span className="flex items-center gap-1.5 text-green-400">
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
                <span className="hidden md:inline">Сохранено</span>
              </span>
            )
          )}
        </div>

        {/* Version history button */}
        {showVersionHistoryButton && onToggleVersionHistory && (
          <button
            onClick={onToggleVersionHistory}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1",
              "text-xs rounded transition-colors",
              isVersionHistoryOpen
                ? "bg-blue-500/20 text-blue-400"
                : "text-neutral-400 hover:bg-[#162236]",
            )}
            title="История версий"
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
                strokeWidth={1.5}
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="hidden md:inline">Версии</span>
          </button>
        )}

        {/* Additional actions */}
        {additionalActions}
      </div>
    </header>
  );
}
