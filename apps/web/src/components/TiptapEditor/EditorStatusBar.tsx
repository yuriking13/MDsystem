import React, { useMemo } from "react";
import { cn } from "../../design-system/utils/cn";

interface EditorStatusBarProps {
  /** Current word count */
  wordCount: number;
  /** Target word count for progress indicator (optional) */
  wordCountGoal?: number;
  /** Character count */
  characterCount: number;
  /** Whether document is currently saving */
  isSaving?: boolean;
  /** Last saved timestamp */
  lastSaved?: Date | null;
  /** Whether bibliography is updating */
  isUpdatingBibliography?: boolean;
  /** Number of pages (estimated) */
  pageCount?: number;
  /** Citation count */
  citationCount?: number;
  /** Additional className */
  className?: string;
}

/**
 * EditorStatusBar - Bottom status bar for document editor
 *
 * Displays:
 * - Word count with optional progress to goal
 * - Character count
 * - Page count (estimated)
 * - Reading time estimate
 * - Save status with timestamp
 * - Citation count
 */
export default function EditorStatusBar({
  wordCount,
  wordCountGoal,
  characterCount,
  isSaving = false,
  lastSaved,
  isUpdatingBibliography = false,
  pageCount,
  citationCount,
  className,
}: EditorStatusBarProps) {
  // Calculate reading time (average 200 words per minute)
  const readingTime = useMemo(() => {
    const minutes = Math.ceil(wordCount / 200);
    if (minutes < 1) return "< 1 min";
    return `${minutes} min`;
  }, [wordCount]);

  // Format last saved time
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return lastSaved.toLocaleDateString();
  }, [lastSaved]);

  // Word count progress percentage
  const wordCountProgress = useMemo(() => {
    if (!wordCountGoal || wordCountGoal <= 0) return null;
    return Math.min(100, Math.round((wordCount / wordCountGoal) * 100));
  }, [wordCount, wordCountGoal]);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2",
        "border-t border-neutral-200 dark:border-neutral-700",
        "bg-neutral-50 dark:bg-neutral-800/50",
        "text-xs text-neutral-600 dark:text-neutral-400",
        "select-none",
        className,
      )}
    >
      {/* Left section: Word/Character counts */}
      <div className="flex items-center gap-4">
        {/* Word count with optional goal */}
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {wordCount.toLocaleString()} words
          </span>

          {wordCountGoal && wordCountProgress !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    wordCountProgress >= 100
                      ? "bg-green-500"
                      : wordCountProgress >= 75
                        ? "bg-blue-500"
                        : wordCountProgress >= 50
                          ? "bg-amber-500"
                          : "bg-neutral-400",
                  )}
                  style={{ width: `${wordCountProgress}%` }}
                />
              </div>
              <span className="text-neutral-500 dark:text-neutral-500">
                {wordCountProgress}% of {wordCountGoal.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Character count */}
        <span className="text-neutral-500 dark:text-neutral-500">
          {characterCount.toLocaleString()} chars
        </span>

        {/* Page count */}
        {pageCount !== undefined && pageCount > 0 && (
          <span className="text-neutral-500 dark:text-neutral-500">
            {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
        )}

        {/* Reading time */}
        <span className="text-neutral-500 dark:text-neutral-500 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5"
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
          {readingTime} read
        </span>
      </div>

      {/* Right section: Status indicators */}
      <div className="flex items-center gap-4">
        {/* Citation count */}
        {citationCount !== undefined && citationCount > 0 && (
          <span className="text-neutral-500 dark:text-neutral-500 flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            {citationCount} citations
          </span>
        )}

        {/* Bibliography update indicator */}
        {isUpdatingBibliography && (
          <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
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
            Updating bibliography...
          </span>
        )}

        {/* Save status */}
        {isSaving ? (
          <span className="flex items-center gap-1.5 text-neutral-500">
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
            Saving...
          </span>
        ) : lastSavedText ? (
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <svg
              className="w-3.5 h-3.5"
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
            Saved {lastSavedText}
          </span>
        ) : null}
      </div>
    </div>
  );
}
