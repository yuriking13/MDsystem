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
        "flex items-center justify-between px-4 py-3",
        "bg-white dark:bg-neutral-900",
        "border-b border-neutral-200 dark:border-neutral-700",
        "sticky top-0 z-20",
        className,
      )}
    >
      {/* Left section: Back button + Title */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Back button */}
        <button
          onClick={onBackToProject}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5",
            "text-sm text-neutral-600 dark:text-neutral-400",
            "hover:text-neutral-800 dark:hover:text-neutral-200",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800",
            "rounded-md transition-colors",
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
          <span className="hidden sm:inline">
            {projectName ? `Back to ${projectName}` : "Back to project"}
          </span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          placeholder="Document title"
          className={cn(
            "flex-1 min-w-0 px-2 py-1",
            "text-lg font-medium",
            "bg-transparent",
            "border-0 border-b-2 border-transparent",
            "focus:border-blue-500 focus:outline-none",
            "text-neutral-800 dark:text-neutral-200",
            "placeholder:text-neutral-400",
          )}
        />
      </div>

      {/* Right section: Status + Actions */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Status indicators */}
        <div className="flex items-center gap-3 text-sm">
          {/* Bibliography updating */}
          {isUpdatingBibliography && (
            <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
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
              <span className="hidden md:inline">Updating bibliography...</span>
            </span>
          )}

          {/* Save status */}
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-neutral-500">
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
              <span className="hidden md:inline">Saving...</span>
            </span>
          ) : (
            !isUpdatingBibliography && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
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
                <span className="hidden md:inline">Saved</span>
              </span>
            )
          )}
        </div>

        {/* Version history button */}
        {showVersionHistoryButton && onToggleVersionHistory && (
          <button
            onClick={onToggleVersionHistory}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5",
              "text-sm rounded-md transition-colors",
              isVersionHistoryOpen
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800",
            )}
            title="Version history"
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
            <span className="hidden md:inline">Versions</span>
          </button>
        )}

        {/* Additional actions */}
        {additionalActions}
      </div>
    </header>
  );
}
