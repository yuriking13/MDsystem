import React, { useState } from "react";
import { cn } from "../design-system/utils/cn";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface FilterSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
}

interface ArticleFilterSidebarProps {
  // Data Sources
  selectedSources: ("pubmed" | "doaj" | "wiley")[];
  onSourcesChange: (sources: ("pubmed" | "doaj" | "wiley")[]) => void;
  sourceCounts?: {
    pubmed?: number;
    doaj?: number;
    wiley?: number;
  };

  // Date Range
  datePreset: string;
  onDatePresetChange: (preset: string) => void;
  customYearFrom?: number;
  customYearTo?: number;
  onCustomYearChange: (from?: number, to?: number) => void;

  // Publication Types
  selectedPubTypes: string[];
  onPubTypesChange: (types: string[]) => void;

  // Text Availability
  textAvailability: string;
  onTextAvailabilityChange: (availability: string) => void;

  // Source Query Filter
  availableSourceQueries: string[];
  selectedSourceQuery: string | null;
  onSourceQueryChange: (query: string | null) => void;

  // Status Filter
  viewStatus: "candidate" | "selected" | "excluded" | "deleted" | "all";
  onViewStatusChange: (
    status: "candidate" | "selected" | "excluded" | "deleted" | "all",
  ) => void;
  statusCounts: {
    candidate: number;
    selected: number;
    excluded: number;
    deleted: number;
  };

  // Stats Filter
  showStatsOnly: boolean;
  onShowStatsOnlyChange: (value: boolean) => void;

  // Reset
  onResetFilters: () => void;

  className?: string;
}

interface CollapsibleFilterSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleFilterSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: CollapsibleFilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-700/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200 text-sm font-medium">
          <span className="w-4 h-4 text-neutral-500 dark:text-neutral-400">
            {icon}
          </span>
          {title}
        </div>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  count?: number;
  disabled?: boolean;
}

function CheckboxItem({
  label,
  checked,
  onChange,
  count,
  disabled,
}: CheckboxItemProps) {
  return (
    <label
      className={cn(
        "flex items-center justify-between py-1.5 cursor-pointer group",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500/50"
        />
        <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-xs text-neutral-400">({count})</span>
      )}
    </label>
  );
}

const DATE_PRESETS = [
  { id: "1m", label: "Last month" },
  { id: "6m", label: "Last 6 months" },
  { id: "1y", label: "Last year" },
  { id: "2y", label: "Last 2 years" },
  { id: "3y", label: "Last 3 years" },
  { id: "5y", label: "Last 5 years" },
  { id: "10y", label: "Last 10 years" },
  { id: "custom", label: "Custom range" },
];

const PUBLICATION_TYPES = [
  { id: "systematic_review", label: "Systematic Review" },
  { id: "meta_analysis", label: "Meta-Analysis" },
  { id: "rct", label: "RCT" },
  { id: "clinical_trial", label: "Clinical Trial" },
  { id: "review", label: "Review" },
  { id: "books", label: "Books" },
];

const TEXT_AVAILABILITY = [
  { id: "any", label: "Any (abstract)" },
  { id: "full", label: "Full text" },
  { id: "free_full", label: "Free full text" },
];

export default function ArticleFilterSidebar({
  selectedSources,
  onSourcesChange,
  sourceCounts,
  datePreset,
  onDatePresetChange,
  customYearFrom,
  customYearTo,
  onCustomYearChange,
  selectedPubTypes,
  onPubTypesChange,
  textAvailability,
  onTextAvailabilityChange,
  availableSourceQueries,
  selectedSourceQuery,
  onSourceQueryChange,
  viewStatus,
  onViewStatusChange,
  statusCounts,
  showStatsOnly,
  onShowStatsOnlyChange,
  onResetFilters,
  className,
}: ArticleFilterSidebarProps) {
  const [yearFromInput, setYearFromInput] = useState(
    customYearFrom?.toString() || "",
  );
  const [yearToInput, setYearToInput] = useState(
    customYearTo?.toString() || "",
  );

  const handleSourceToggle = (source: "pubmed" | "doaj" | "wiley") => {
    if (selectedSources.includes(source)) {
      if (selectedSources.length === 1) return; // Keep at least one
      onSourcesChange(selectedSources.filter((s) => s !== source));
    } else {
      onSourcesChange([...selectedSources, source]);
    }
  };

  const handlePubTypeToggle = (type: string) => {
    if (selectedPubTypes.includes(type)) {
      onPubTypesChange(selectedPubTypes.filter((t) => t !== type));
    } else {
      onPubTypesChange([...selectedPubTypes, type]);
    }
  };

  const handleYearApply = () => {
    const from = yearFromInput ? parseInt(yearFromInput, 10) : undefined;
    const to = yearToInput ? parseInt(yearToInput, 10) : undefined;
    onCustomYearChange(from, to);
  };

  return (
    <div
      className={cn(
        "w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700/50 flex flex-col overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700/50">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Filters
          </h3>
        </div>
        <button
          onClick={onResetFilters}
          className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Status Filter */}
        <CollapsibleFilterSection
          title="Status"
          icon={<DocumentTextIcon />}
          defaultOpen
        >
          <div className="space-y-1">
            {[
              {
                id: "all",
                label: "All",
                count:
                  statusCounts.candidate +
                  statusCounts.selected +
                  statusCounts.excluded,
              },
              {
                id: "candidate",
                label: "Candidates",
                count: statusCounts.candidate,
              },
              {
                id: "selected",
                label: "Selected",
                count: statusCounts.selected,
              },
              {
                id: "excluded",
                label: "Excluded",
                count: statusCounts.excluded,
              },
              { id: "deleted", label: "Deleted", count: statusCounts.deleted },
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => onViewStatusChange(status.id as any)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
                  viewStatus === status.id
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                )}
              >
                <span>{status.label}</span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    viewStatus === status.id
                      ? "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200"
                      : "bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400",
                  )}
                >
                  {status.count}
                </span>
              </button>
            ))}
          </div>
        </CollapsibleFilterSection>

        {/* Data Sources */}
        <CollapsibleFilterSection
          title="Data Sources"
          icon={<MagnifyingGlassIcon />}
          defaultOpen
        >
          <div className="space-y-1">
            <CheckboxItem
              label="PubMed Central"
              checked={selectedSources.includes("pubmed")}
              onChange={() => handleSourceToggle("pubmed")}
              count={sourceCounts?.pubmed}
            />
            <CheckboxItem
              label="DOAJ"
              checked={selectedSources.includes("doaj")}
              onChange={() => handleSourceToggle("doaj")}
              count={sourceCounts?.doaj}
            />
            <CheckboxItem
              label="Wiley Online"
              checked={selectedSources.includes("wiley")}
              onChange={() => handleSourceToggle("wiley")}
              count={sourceCounts?.wiley}
            />
          </div>
        </CollapsibleFilterSection>

        {/* Publication Date */}
        <CollapsibleFilterSection
          title="Publication Date"
          icon={<CalendarIcon />}
          defaultOpen={false}
        >
          <select
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>

          {datePreset === "custom" && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="From"
                  value={yearFromInput}
                  onChange={(e) => setYearFromInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <span className="text-neutral-400">—</span>
                <input
                  type="number"
                  placeholder="To"
                  value={yearToInput}
                  onChange={(e) => setYearToInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <button
                onClick={handleYearApply}
                className="w-full px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </CollapsibleFilterSection>

        {/* Publication Type */}
        <CollapsibleFilterSection
          title="Publication Type"
          icon={<DocumentTextIcon />}
          defaultOpen={false}
        >
          <div className="space-y-1">
            {PUBLICATION_TYPES.map((type) => (
              <CheckboxItem
                key={type.id}
                label={type.label}
                checked={selectedPubTypes.includes(type.id)}
                onChange={() => handlePubTypeToggle(type.id)}
              />
            ))}
          </div>
        </CollapsibleFilterSection>

        {/* Text Availability */}
        <CollapsibleFilterSection
          title="Text Availability"
          icon={<DocumentTextIcon />}
          defaultOpen={false}
        >
          <div className="space-y-1">
            {TEXT_AVAILABILITY.map((option) => (
              <button
                key={option.id}
                onClick={() => onTextAvailabilityChange(option.id)}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left",
                  textAvailability === option.id
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CollapsibleFilterSection>

        {/* Search Query Filter */}
        {availableSourceQueries.length > 0 && (
          <CollapsibleFilterSection
            title="Search Queries"
            icon={<MagnifyingGlassIcon />}
            defaultOpen={false}
          >
            <div className="space-y-1">
              <button
                onClick={() => onSourceQueryChange(null)}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left",
                  selectedSourceQuery === null
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                )}
              >
                All queries
              </button>
              {availableSourceQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => onSourceQueryChange(query)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left truncate",
                    selectedSourceQuery === query
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  )}
                  title={query}
                >
                  {query.length > 25 ? `${query.substring(0, 25)}...` : query}
                </button>
              ))}
            </div>
          </CollapsibleFilterSection>
        )}

        {/* Advanced */}
        <CollapsibleFilterSection
          title="Advanced"
          icon={<AdjustmentsHorizontalIcon />}
          defaultOpen={false}
        >
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Show stats only
            </span>
            <button
              onClick={() => onShowStatsOnlyChange(!showStatsOnly)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                showStatsOnly
                  ? "bg-blue-500"
                  : "bg-neutral-300 dark:bg-neutral-600",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  showStatsOnly ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </label>
        </CollapsibleFilterSection>
      </div>
    </div>
  );
}
