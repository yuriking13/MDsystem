import React from "react";
import { cn } from "../design-system/utils/cn";
import {
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  LanguageIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  TagIcon,
  FolderIcon,
  BeakerIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;

  // Selection
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isAllSelected: boolean;

  // Status Actions
  onMarkAsSelected: () => void;
  onMarkAsCandidate: () => void;
  onMarkAsExcluded: () => void;
  onDelete: () => void;

  // Batch Operations
  onTranslate: () => void;
  onDetectStats: () => void;
  onExport: () => void;

  // Loading States
  isTranslating?: boolean;
  isDetectingStats?: boolean;
  isExporting?: boolean;

  className?: string;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "success" | "warning" | "danger";
  disabled?: boolean;
  loading?: boolean;
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled,
  loading,
}: ActionButtonProps) {
  const variantStyles = {
    default:
      "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700",
    success:
      "text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
    warning:
      "text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
    danger:
      "text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
        variantStyles[variant],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
      )}
    >
      {loading ? (
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
      ) : (
        <span className="w-4 h-4">{icon}</span>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  isAllSelected,
  onMarkAsSelected,
  onMarkAsCandidate,
  onMarkAsExcluded,
  onDelete,
  onTranslate,
  onDetectStats,
  onExport,
  isTranslating = false,
  isDetectingStats = false,
  isExporting = false,
  className,
}: BulkActionsBarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700/50",
        className,
      )}
    >
      {/* Left Side: Selection Info & Controls */}
      <div className="flex items-center gap-4">
        {/* Selection Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={isAllSelected ? onDeselectAll : onSelectAll}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500/50"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {hasSelection ? (
              <>
                <span className="font-medium">{selectedCount}</span> of{" "}
                {totalCount} selected
              </>
            ) : (
              "Select all"
            )}
          </span>
        </label>

        {/* Clear Selection */}
        {hasSelection && (
          <button
            onClick={onDeselectAll}
            className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Right Side: Actions */}
      <div className="flex items-center gap-1">
        {/* Status Actions */}
        <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
          <ActionButton
            icon={<CheckIcon />}
            label="Select"
            onClick={onMarkAsSelected}
            variant="success"
            disabled={!hasSelection}
          />
          <ActionButton
            icon={<BeakerIcon />}
            label="Candidate"
            onClick={onMarkAsCandidate}
            variant="warning"
            disabled={!hasSelection}
          />
          <ActionButton
            icon={<XMarkIcon />}
            label="Exclude"
            onClick={onMarkAsExcluded}
            variant="danger"
            disabled={!hasSelection}
          />
        </div>

        {/* Batch Operations */}
        <div className="flex items-center gap-1 pl-2">
          <ActionButton
            icon={<LanguageIcon />}
            label="Translate"
            onClick={onTranslate}
            disabled={!hasSelection}
            loading={isTranslating}
          />
          <ActionButton
            icon={<ChartBarIcon />}
            label="Detect Stats"
            onClick={onDetectStats}
            disabled={!hasSelection}
            loading={isDetectingStats}
          />
          <ActionButton
            icon={<DocumentArrowDownIcon />}
            label="Export"
            onClick={onExport}
            disabled={!hasSelection}
            loading={isExporting}
          />
        </div>

        {/* Delete */}
        <div className="pl-3 border-l border-neutral-200 dark:border-neutral-700">
          <ActionButton
            icon={<TrashIcon />}
            label="Delete"
            onClick={onDelete}
            variant="danger"
            disabled={!hasSelection}
          />
        </div>
      </div>
    </div>
  );
}
