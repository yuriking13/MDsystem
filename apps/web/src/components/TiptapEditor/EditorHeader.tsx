import React from "react";
import { cn } from "../../design-system/utils/cn";
import {
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconClock,
} from "../FlowbiteIcons";

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
    <header className={cn("editor-header", className)}>
      {/* Left section: Back button + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Back button */}
        <button onClick={onBackToProject} className="editor-header-btn">
          <IconArrowLeft size="sm" />
          <span className="hidden sm:inline text-xs">Назад</span>
        </button>

        {/* Divider */}
        <div className="toolbar-divider hidden sm:block" />

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          placeholder="Название документа"
          className="editor-header-title"
        />
      </div>

      {/* Right section: Status + Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Status indicators */}
        <div className="flex items-center gap-2 text-xs">
          {/* Bibliography updating */}
          {isUpdatingBibliography && (
            <span className="flex items-center gap-1.5 text-blue-400">
              <IconRefresh size="sm" className="animate-spin" />
              <span className="hidden md:inline">Обновление...</span>
            </span>
          )}

          {/* Save status */}
          {isSaving ? (
            <span
              className="flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <IconRefresh size="sm" className="animate-spin" />
              <span className="hidden md:inline">Сохранение...</span>
            </span>
          ) : (
            !isUpdatingBibliography && (
              <span className="flex items-center gap-1.5 text-green-400">
                <IconCheck size="sm" />
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
              "editor-header-btn",
              isVersionHistoryOpen && "active",
            )}
            title="История версий"
          >
            <IconClock size="sm" />
            <span className="hidden md:inline">Версии</span>
          </button>
        )}

        {/* Additional actions */}
        {additionalActions}
      </div>
    </header>
  );
}
