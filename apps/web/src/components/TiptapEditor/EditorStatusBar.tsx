import React, { useMemo } from "react";
import { cn } from "../../design-system/utils/cn";
import { IconClock, IconBook, IconRefresh, IconCheck } from "../FlowbiteIcons";

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

    if (diff < 60000) return "только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}ч назад`;
    return lastSaved.toLocaleDateString("ru-RU");
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
        "border-t border-[rgba(56,89,138,0.25)]",
        "bg-[#0d1b2a]/80 backdrop-blur-sm",
        "text-xs text-neutral-400",
        "select-none",
        className,
      )}
    >
      {/* Left section: Word/Character counts */}
      <div className="flex items-center gap-4">
        {/* Word count with optional goal */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-300">
            {wordCount.toLocaleString()} слов
          </span>

          {wordCountGoal && wordCountProgress !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-[rgba(56,89,138,0.3)] rounded-full overflow-hidden">
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
              <span className="text-neutral-500">
                {wordCountProgress}% из {wordCountGoal.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Character count */}
        <span className="text-neutral-500">
          {characterCount.toLocaleString()} симв.
        </span>

        {/* Page count - always show */}
        <span className="text-neutral-500">
          {pageCount !== undefined && pageCount > 0 ? pageCount : 1} стр.
        </span>

        {/* Reading time */}
        <span className="text-neutral-500 flex items-center gap-1">
          <IconClock size="sm" />
          {readingTime} чтение
        </span>
      </div>

      {/* Right section: Status indicators */}
      <div className="flex items-center gap-4">
        {/* Citation count */}
        {citationCount !== undefined && citationCount > 0 && (
          <span className="text-neutral-500 flex items-center gap-1">
            <IconBook size="sm" />
            {citationCount} цитат
          </span>
        )}

        {/* Bibliography update indicator */}
        {isUpdatingBibliography && (
          <span className="flex items-center gap-1.5 text-blue-400">
            <IconRefresh size="sm" className="animate-spin" />
            Обновление...
          </span>
        )}

        {/* Save status */}
        {isSaving ? (
          <span className="flex items-center gap-1.5 text-neutral-400">
            <IconRefresh size="sm" className="animate-spin" />
            Сохранение...
          </span>
        ) : lastSavedText ? (
          <span className="flex items-center gap-1.5 text-green-400">
            <IconCheck size="sm" />
            Сохранено {lastSavedText}
          </span>
        ) : null}
      </div>
    </div>
  );
}
