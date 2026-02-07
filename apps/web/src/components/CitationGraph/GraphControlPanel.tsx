import React, { useState, useCallback } from "react";
import { cn } from "../../design-system/utils/cn";
import {
  IconChevronDown as ChevronDownIcon,
  IconChevronRight as ChevronRightIcon,
  IconAdjustments as AdjustmentsHorizontalIcon,
  IconFilter as FunnelIcon,
  IconChartBar as ChartBarIcon,
  IconClock as ClockIcon,
  IconSparkles as SparklesIcon,
  IconSearch as MagnifyingGlassIcon,
  IconBeaker as BeakerIcon,
  IconCube as CubeTransparentIcon,
  IconArrowsExpand as ArrowsPointingOutIcon,
  IconArrowsContract as ArrowsPointingInIcon,
  IconPlay as PlayIcon,
  IconPause as PauseIcon,
  IconRefresh as ArrowPathIcon,
  IconDownload as ArrowDownTrayIcon,
} from "../FlowbiteIcons";

type FilterType = "all" | "selected" | "excluded";
type DepthType = 1 | 2 | 3;
type SortType = "citations" | "frequency" | "year" | "default";

interface ControlPanelSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
}

interface GraphControlPanelProps {
  // Filters
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  depth: DepthType;
  onDepthChange: (depth: DepthType) => void;
  yearFrom?: number;
  yearTo?: number;
  onYearChange: (from?: number, to?: number) => void;

  // Sources
  selectedSources: ("pubmed" | "doaj" | "wiley")[];
  onSourcesChange: (sources: ("pubmed" | "doaj" | "wiley")[]) => void;

  // P-value
  highlightPValue: boolean;
  onHighlightPValueChange: (value: boolean) => void;
  statsQuality: number;
  onStatsQualityChange: (value: number) => void;

  // Sorting
  sortBy: SortType;
  onSortByChange: (sort: SortType) => void;

  // Limits
  maxNodes: number;
  onMaxNodesChange: (value: number) => void;
  maxLinksPerNode: number;
  onMaxLinksPerNodeChange: (value: number) => void;
  unlimitedNodes: boolean;
  onUnlimitedNodesChange: (value: boolean) => void;
  unlimitedLinks: boolean;
  onUnlimitedLinksChange: (value: boolean) => void;

  // Clustering
  enableClustering: boolean;
  onEnableClusteringChange: (value: boolean) => void;
  clusterBy: "year" | "journal" | "auto";
  onClusterByChange: (value: "year" | "journal" | "auto") => void;

  // Stats
  totalNodes: number;
  totalLinks: number;
  levelCounts?: {
    citing: number;
    reference: number;
    candidate: number;
    selected: number;
    excluded: number;
    related: number;
  };
  pValueCount?: number;

  // Graph controls
  animationPaused: boolean;
  onAnimationPausedChange: (value: boolean) => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;

  // Language
  globalLang: "en" | "ru";
  onGlobalLangChange: (lang: "en" | "ru") => void;

  // Actions
  onFetchReferences: () => void;
  fetchingRefs: boolean;
  onExport: (format: "png" | "svg" | "pdf") => void;
  onRefreshGraph: () => void;

  // Optional panels toggles
  onShowSemanticSearch?: () => void;
  onShowMethodologyClusters?: () => void;
  onShowSemanticClusters?: () => void;
  onShowGapAnalysis?: () => void;
  onShowRecommendations?: () => void;
  onShowAIAssistant?: () => void;

  // Feature panel states
  showSemanticSearch?: boolean;
  showMethodologyClusters?: boolean;
  showSemanticClusters?: boolean;
  showGapAnalysis?: boolean;
  showRecommendations?: boolean;
  showAIAssistant?: boolean;

  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
          <span className="w-5 h-5 text-slate-400">{icon}</span>
          {title}
        </div>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: ToggleSwitchProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-300 group-hover:text-slate-200">
          {label}
        </span>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-3 shrink-0",
          checked ? "bg-blue-500" : "bg-slate-600",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  infinity?: boolean;
  onInfinityToggle?: () => void;
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  infinity,
  onInfinityToggle,
}: SliderInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            {disabled ? "∞" : value.toLocaleString()}
          </span>
          {onInfinityToggle && (
            <button
              onClick={onInfinityToggle}
              className={cn(
                "text-xs px-1.5 py-0.5 rounded transition-colors",
                disabled
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600",
              )}
            >
              ∞
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          "w-full h-1.5 rounded-full appearance-none cursor-pointer",
          "bg-slate-700",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-3",
          "[&::-webkit-slider-thumb]:h-3",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-blue-500",
          "[&::-webkit-slider-thumb]:hover:bg-blue-400",
          "[&::-webkit-slider-thumb]:transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
    </div>
  );
}

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectInput({ label, value, onChange, options }: SelectInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CheckboxGroupProps {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: CheckboxGroupProps) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-300">{label}</label>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => handleToggle(opt.value)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-200 flex-1">
              {opt.label}
            </span>
            {opt.count !== undefined && (
              <span className="text-xs text-slate-500">({opt.count})</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function GraphControlPanel({
  // Filters
  filter,
  onFilterChange,
  depth,
  onDepthChange,
  yearFrom,
  yearTo,
  onYearChange,
  selectedSources,
  onSourcesChange,
  highlightPValue,
  onHighlightPValueChange,
  statsQuality,
  onStatsQualityChange,
  sortBy,
  onSortByChange,

  // Limits
  maxNodes,
  onMaxNodesChange,
  maxLinksPerNode,
  onMaxLinksPerNodeChange,
  unlimitedNodes,
  onUnlimitedNodesChange,
  unlimitedLinks,
  onUnlimitedLinksChange,

  // Clustering
  enableClustering,
  onEnableClusteringChange,
  clusterBy,
  onClusterByChange,

  // Stats
  totalNodes,
  totalLinks,
  levelCounts,
  pValueCount,

  // Graph controls
  animationPaused,
  onAnimationPausedChange,
  isFullscreen,
  onFullscreenToggle,

  // Language
  globalLang,
  onGlobalLangChange,

  // Actions
  onFetchReferences,
  fetchingRefs,
  onExport,
  onRefreshGraph,

  // Feature panels
  onShowSemanticSearch,
  onShowMethodologyClusters,
  onShowSemanticClusters,
  onShowGapAnalysis,
  onShowRecommendations,
  onShowAIAssistant,

  showSemanticSearch,
  showMethodologyClusters,
  showSemanticClusters,
  showGapAnalysis,
  showRecommendations,
  showAIAssistant,

  className,
  collapsed = false,
  onCollapsedChange,
}: GraphControlPanelProps) {
  const [yearFromInput, setYearFromInput] = useState(
    yearFrom?.toString() || "",
  );
  const [yearToInput, setYearToInput] = useState(yearTo?.toString() || "");

  const handleYearApply = useCallback(() => {
    const from = yearFromInput ? parseInt(yearFromInput, 10) : undefined;
    const to = yearToInput ? parseInt(yearToInput, 10) : undefined;
    onYearChange(from, to);
  }, [yearFromInput, yearToInput, onYearChange]);

  if (collapsed) {
    return (
      <div
        className={cn(
          "w-12 bg-slate-900 border-r border-slate-700/50 flex flex-col items-center py-4 gap-2",
          className,
        )}
      >
        <button
          onClick={() => onCollapsedChange?.(false)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Expand panel"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <div className="flex flex-col gap-1 text-center">
          <span className="text-xs font-mono text-slate-500">{totalNodes}</span>
          <span className="text-[10px] text-slate-600">nodes</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-72 bg-slate-900 border-r border-slate-700/50 flex flex-col overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-200">Graph Controls</h2>
        <button
          onClick={() => onCollapsedChange?.(true)}
          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          title="Collapse panel"
        >
          <ChevronDownIcon className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold text-slate-200">
              {totalNodes.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Nodes</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-200">
              {totalLinks.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Links</div>
          </div>
          {pValueCount !== undefined && pValueCount > 0 && (
            <div>
              <div className="text-lg font-semibold text-amber-400">
                {pValueCount}
              </div>
              <div className="text-xs text-slate-500">P-value</div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Node Filters */}
        <CollapsibleSection title="Nodes" icon={<FunnelIcon />} defaultOpen>
          <SelectInput
            label="Status Filter"
            value={filter}
            onChange={(v) => onFilterChange(v as FilterType)}
            options={[
              { value: "all", label: "All Nodes" },
              { value: "selected", label: "Selected Only" },
              { value: "excluded", label: "Excluded Only" },
            ]}
          />

          <SelectInput
            label="Depth Level"
            value={depth.toString()}
            onChange={(v) => onDepthChange(Number(v) as DepthType)}
            options={[
              { value: "1", label: "1 Level" },
              { value: "2", label: "2 Levels" },
              { value: "3", label: "3 Levels" },
            ]}
          />

          <CheckboxGroup
            label="Sources"
            options={[
              {
                value: "pubmed",
                label: "PubMed",
                count: levelCounts?.candidate,
              },
              { value: "doaj", label: "DOAJ" },
              { value: "wiley", label: "Wiley" },
            ]}
            selected={selectedSources}
            onChange={(selected) =>
              onSourcesChange(selected as ("pubmed" | "doaj" | "wiley")[])
            }
          />

          <ToggleSwitch
            checked={highlightPValue}
            onChange={onHighlightPValueChange}
            label="Highlight P-value"
            description="Show articles with statistics"
          />
        </CollapsibleSection>

        {/* Date Filters */}
        <CollapsibleSection
          title="Date Range"
          icon={<ClockIcon />}
          defaultOpen={false}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="From"
              value={yearFromInput}
              onChange={(e) => setYearFromInput(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <span className="text-slate-500">—</span>
            <input
              type="number"
              placeholder="To"
              value={yearToInput}
              onChange={(e) => setYearToInput(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button
            onClick={handleYearApply}
            className="w-full px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            Apply Date Range
          </button>
        </CollapsibleSection>

        {/* Analytics */}
        <CollapsibleSection
          title="Analytics"
          icon={<ChartBarIcon />}
          defaultOpen={false}
        >
          {levelCounts && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-slate-300">Selected</span>
                </span>
                <span className="text-slate-400">{levelCounts.selected}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-300">Candidate</span>
                </span>
                <span className="text-slate-400">{levelCounts.candidate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-300">Excluded</span>
                </span>
                <span className="text-slate-400">{levelCounts.excluded}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span className="text-slate-300">Citing</span>
                </span>
                <span className="text-slate-400">{levelCounts.citing}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-slate-300">Reference</span>
                </span>
                <span className="text-slate-400">{levelCounts.reference}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className="text-slate-300">Related</span>
                </span>
                <span className="text-slate-400">{levelCounts.related}</span>
              </div>
            </div>
          )}

          <SelectInput
            label="Sort By"
            value={sortBy}
            onChange={(v) => onSortByChange(v as SortType)}
            options={[
              { value: "citations", label: "Citations" },
              { value: "frequency", label: "Frequency" },
              { value: "year", label: "Year" },
              { value: "default", label: "Default" },
            ]}
          />
        </CollapsibleSection>

        {/* Graph Settings */}
        <CollapsibleSection
          title="Settings"
          icon={<AdjustmentsHorizontalIcon />}
          defaultOpen={false}
        >
          <SliderInput
            label="Max Nodes"
            value={maxNodes}
            onChange={onMaxNodesChange}
            min={100}
            max={5000}
            step={100}
            disabled={unlimitedNodes}
            infinity
            onInfinityToggle={() => onUnlimitedNodesChange(!unlimitedNodes)}
          />

          <SliderInput
            label="Links per Node"
            value={maxLinksPerNode}
            onChange={onMaxLinksPerNodeChange}
            min={5}
            max={50}
            step={5}
            disabled={unlimitedLinks}
            infinity
            onInfinityToggle={() => onUnlimitedLinksChange(!unlimitedLinks)}
          />

          <ToggleSwitch
            checked={enableClustering}
            onChange={onEnableClusteringChange}
            label="Enable Clustering"
          />

          {enableClustering && (
            <SelectInput
              label="Cluster By"
              value={clusterBy}
              onChange={(v) =>
                onClusterByChange(v as "year" | "journal" | "auto")
              }
              options={[
                { value: "auto", label: "Automatic" },
                { value: "year", label: "Year" },
                { value: "journal", label: "Journal" },
              ]}
            />
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() =>
                onGlobalLangChange(globalLang === "en" ? "ru" : "en")
              }
              className={cn(
                "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                globalLang === "en"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600",
              )}
            >
              EN
            </button>
            <button
              onClick={() =>
                onGlobalLangChange(globalLang === "ru" ? "en" : "ru")
              }
              className={cn(
                "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                globalLang === "ru"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600",
              )}
            >
              RU
            </button>
          </div>
        </CollapsibleSection>

        {/* AI & Tools */}
        <CollapsibleSection
          title="AI & Tools"
          icon={<SparklesIcon />}
          defaultOpen
        >
          <div className="space-y-2">
            {onShowAIAssistant && (
              <button
                onClick={onShowAIAssistant}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  showAIAssistant
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                )}
              >
                <span className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  AI Assistant
                </span>
                {showAIAssistant && (
                  <span className="text-xs opacity-75">Active</span>
                )}
              </button>
            )}

            {onShowSemanticSearch && (
              <button
                onClick={onShowSemanticSearch}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  showSemanticSearch
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                )}
              >
                <span className="flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Semantic Search
                </span>
              </button>
            )}

            {onShowSemanticClusters && (
              <button
                onClick={onShowSemanticClusters}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  showSemanticClusters
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                )}
              >
                <span className="flex items-center gap-2">
                  <CubeTransparentIcon className="w-4 h-4" />
                  Semantic Clusters
                </span>
              </button>
            )}

            {onShowMethodologyClusters && (
              <button
                onClick={onShowMethodologyClusters}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  showMethodologyClusters
                    ? "bg-amber-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                )}
              >
                <span className="flex items-center gap-2">
                  <BeakerIcon className="w-4 h-4" />
                  Methodology Analysis
                </span>
              </button>
            )}

            {onShowGapAnalysis && (
              <button
                onClick={onShowGapAnalysis}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  showGapAnalysis
                    ? "bg-rose-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                )}
              >
                <span className="flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4" />
                  Gap Analysis
                </span>
              </button>
            )}

            {onShowRecommendations && (
              <button
                onClick={onShowRecommendations}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  showRecommendations
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                )}
              >
                <span className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  Recommendations
                </span>
              </button>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-700/50 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAnimationPausedChange(!animationPaused)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
              animationPaused
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-slate-300",
            )}
          >
            {animationPaused ? (
              <>
                <PlayIcon className="w-4 h-4" />
                Resume
              </>
            ) : (
              <>
                <PauseIcon className="w-4 h-4" />
                Pause
              </>
            )}
          </button>

          <button
            onClick={onFullscreenToggle}
            className="flex items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-4 h-4" />
            ) : (
              <ArrowsPointingOutIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        <button
          onClick={onFetchReferences}
          disabled={fetchingRefs}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
            fetchingRefs
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white",
          )}
        >
          {fetchingRefs ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <ArrowPathIcon className="w-4 h-4" />
              Fetch References
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshGraph}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>

          <div className="relative group">
            <button className="flex items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors">
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block">
              <div className="bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 min-w-25">
                <button
                  onClick={() => onExport("png")}
                  className="w-full px-3 py-1.5 text-sm text-left text-slate-300 hover:bg-slate-700"
                >
                  PNG
                </button>
                <button
                  onClick={() => onExport("svg")}
                  className="w-full px-3 py-1.5 text-sm text-left text-slate-300 hover:bg-slate-700"
                >
                  SVG
                </button>
                <button
                  onClick={() => onExport("pdf")}
                  className="w-full px-3 py-1.5 text-sm text-left text-slate-300 hover:bg-slate-700"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
