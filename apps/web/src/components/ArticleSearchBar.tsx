import React, { useState, useMemo } from "react";
import { cn } from "../design-system/utils/cn";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;

  // View Toggle
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;

  // Sorting
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;

  // Additional
  onAddArticle?: () => void;
  onOpenAdvancedSearch?: () => void;

  className?: string;
}

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "date", label: "Publication Date" },
  { id: "title", label: "Title" },
  { id: "citations", label: "Citation Count" },
  { id: "added", label: "Date Added" },
];

export default function ArticleSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search in articles...",
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onAddArticle,
  onOpenAdvancedSearch,
  className,
}: SearchBarProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "Sort";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700/50",
        className,
      )}
    >
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="flex-1 relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </form>

      {/* Advanced Search */}
      {onOpenAdvancedSearch && (
        <button
          onClick={onOpenAdvancedSearch}
          className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          title="Advanced Search"
        >
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
        </button>
      )}

      {/* Divider */}
      <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />

      {/* Sort Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSortDropdown(!showSortDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ArrowsUpDownIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{currentSortLabel}</span>
          <ChevronDownIcon
            className={cn(
              "w-4 h-4 transition-transform",
              showSortDropdown && "rotate-180",
            )}
          />
        </button>

        {showSortDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowSortDropdown(false)}
            />
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    if (sortBy === option.id) {
                      onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      onSortByChange(option.id);
                      onSortOrderChange("desc");
                    }
                    setShowSortDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors",
                    sortBy === option.id
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700",
                  )}
                >
                  <span>{option.label}</span>
                  {sortBy === option.id && (
                    <span className="text-xs text-neutral-400">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        <button
          onClick={() => onViewModeChange("list")}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            viewMode === "list"
              ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
          )}
          title="List View"
        >
          <ListBulletIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            viewMode === "grid"
              ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
          )}
          title="Grid View"
        >
          <Squares2X2Icon className="w-4 h-4" />
        </button>
      </div>

      {/* Add Article */}
      {onAddArticle && (
        <button
          onClick={onAddArticle}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Add Article</span>
        </button>
      )}
    </div>
  );
}
