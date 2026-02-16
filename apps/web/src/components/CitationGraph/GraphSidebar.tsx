import React, { useState } from "react";
import {
  IconFilter,
  IconGraph,
  IconSearch,
  IconAdjustments,
  IconChartBar,
  IconCalendar,
  IconRefresh,
  IconSparkles,
  IconCircleStack,
  IconChevronRight,
} from "../FlowbiteIcons";
import type { LevelCounts } from "../../lib/api";

type FilterType = "all" | "selected" | "excluded";
type DepthType = 1 | 2 | 3;
type SourceType = "pubmed" | "doaj" | "wiley";

interface GraphSidebarProps {
  // Filters
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  depth: DepthType;
  onDepthChange: (depth: DepthType) => void;

  // Sources
  selectedSources: SourceType[];
  onSourcesChange: (sources: SourceType[]) => void;

  // Year
  yearFrom?: string;
  yearTo?: string;
  onYearFromChange: (val: string) => void;
  onYearToChange: (val: string) => void;
  onApplyYearFilter: () => void;

  // P-value
  statsQuality: number;
  onStatsQualityChange: (val: number) => void;

  // Stats
  totalNodes: number;
  totalLinks: number;
  levelCounts?: LevelCounts;

  // Actions
  onFetchReferences: () => void;
  fetchingRefs: boolean;
  fetchJobRunning?: boolean;

  // Feature toggles
  onShowSemanticSearch?: () => void;
  onShowMethodologyClusters?: () => void;
  onShowSemanticClusters?: () => void;
  onShowGapAnalysis?: () => void;
  onShowRecommendations?: () => void;

  // Feature panel states
  showSemanticSearch?: boolean;
  showMethodologyClusters?: boolean;
  showSemanticClusters?: boolean;
  showGapAnalysis?: boolean;

  // Recommendations
  recommendationsCount?: number;

  // Collapsed state
  collapsed: boolean;
  onToggleCollapse: () => void;
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
    <div className="graph-sidebar-section">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="graph-sidebar-collapsible-header"
      >
        <div className="graph-sidebar-section-title-wrap">
          <span className="graph-sidebar-section-icon">{icon}</span>
          {title}
        </div>
        <IconChevronRight
          size="sm"
          className={`graph-sidebar-section-chevron ${
            isOpen ? "graph-sidebar-section-chevron--open" : ""
          }`}
        />
      </button>
      <div
        className={`graph-sidebar-section-content ${
          isOpen ? "graph-sidebar-section-content--open" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function getDepthButtonClass(active: boolean): string {
  return `graph-sidebar-depth-btn ${active ? "graph-sidebar-depth-btn--active" : ""}`;
}

function getFilterOptionClass(active: boolean): string {
  return `graph-sidebar-filter-option ${
    active ? "graph-sidebar-filter-option--active" : ""
  }`;
}

function getRadioCircleClass(active: boolean): string {
  return `graph-sidebar-radio-circle ${
    active ? "graph-sidebar-radio-circle--active" : ""
  }`;
}

function getSourceOptionClass(active: boolean): string {
  return `graph-sidebar-source-option ${
    active ? "graph-sidebar-source-option--active" : ""
  }`;
}

function getSourceBoxClass(active: boolean, source: SourceType): string {
  return [
    "graph-sidebar-source-box",
    `graph-sidebar-source-box--${source}`,
    active ? "graph-sidebar-source-box--checked" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getFeatureButtonClass(active: boolean): string {
  return `graph-sidebar-feature-btn ${
    active ? "graph-sidebar-feature-btn--active" : ""
  }`;
}

const colorLegendItems = [
  { label: "Отобранные", dotClassName: "graph-sidebar-legend-dot--selected" },
  { label: "PubMed", dotClassName: "graph-sidebar-legend-dot--pubmed" },
  { label: "DOAJ", dotClassName: "graph-sidebar-legend-dot--doaj" },
  { label: "Wiley", dotClassName: "graph-sidebar-legend-dot--wiley" },
  { label: "Исключённые", dotClassName: "graph-sidebar-legend-dot--excluded" },
];

export default function GraphSidebar({
  filter,
  onFilterChange,
  depth,
  onDepthChange,
  selectedSources,
  onSourcesChange,
  yearFrom,
  yearTo,
  onYearFromChange,
  onYearToChange,
  onApplyYearFilter,
  statsQuality,
  onStatsQualityChange,
  totalNodes,
  totalLinks,
  levelCounts,
  onFetchReferences,
  fetchingRefs,
  fetchJobRunning,
  onShowSemanticSearch,
  onShowMethodologyClusters,
  onShowSemanticClusters,
  onShowGapAnalysis,
  onShowRecommendations,
  showSemanticSearch,
  showMethodologyClusters,
  showSemanticClusters,
  showGapAnalysis,
  recommendationsCount,
  collapsed,
  onToggleCollapse,
}: GraphSidebarProps) {
  const toggleSourceCheckbox = (source: SourceType) => {
    if (selectedSources.includes(source)) {
      onSourcesChange(selectedSources.filter((s) => s !== source));
      return;
    }
    onSourcesChange([...selectedSources, source]);
  };

  if (collapsed) {
    return (
      <div className="graph-sidebar graph-sidebar--collapsed">
        <div className="graph-sidebar-logo-section graph-sidebar-logo-section--collapsed">
          <button
            onClick={onToggleCollapse}
            className="graph-sidebar-logo-button"
          >
            <IconGraph size="sm" className="graph-sidebar-logo-icon" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="graph-sidebar">
      {/* Logo Section */}
      <div className="graph-sidebar-logo-section">
        <button
          onClick={onToggleCollapse}
          className="graph-sidebar-logo-button"
        >
          <IconGraph size="sm" className="graph-sidebar-logo-icon" />
        </button>
        <div className="graph-sidebar-logo-copy">
          <div className="graph-sidebar-title">Visual Explorer</div>
          <div className="graph-sidebar-subtitle">Граф цитирования</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="graph-sidebar-stats-grid">
        <div className="graph-sidebar-stat-box">
          <div className="graph-sidebar-stat-value">{totalNodes}</div>
          <div className="graph-sidebar-stat-label">Узлов</div>
        </div>
        <div className="graph-sidebar-stat-box">
          <div className="graph-sidebar-stat-value">{totalLinks}</div>
          <div className="graph-sidebar-stat-label">Связей</div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="graph-sidebar-content">
        {/* Depth Section */}
        <CollapsibleSection
          title="Глубина графа"
          icon={<IconCircleStack size="sm" />}
          defaultOpen={true}
        >
          <div className="graph-sidebar-depth-buttons">
            <button
              className={getDepthButtonClass(depth === 1)}
              onClick={() => onDepthChange(1)}
            >
              Проект
            </button>
            <button
              className={getDepthButtonClass(depth === 2)}
              onClick={() => onDepthChange(2)}
            >
              +Ссылки
            </button>
            <button
              className={getDepthButtonClass(depth === 3)}
              onClick={() => onDepthChange(3)}
            >
              +Цит.
            </button>
          </div>
        </CollapsibleSection>

        {/* Status Filter */}
        <CollapsibleSection
          title="Статус статей"
          icon={<IconFilter size="sm" />}
          defaultOpen={true}
        >
          <div
            className={getFilterOptionClass(filter === "all")}
            onClick={() => onFilterChange("all")}
          >
            <div className={getRadioCircleClass(filter === "all")}>
              {filter === "all" && (
                <div className="graph-sidebar-radio-inner" />
              )}
            </div>
            <span className="graph-sidebar-item-label">Все статьи</span>
            {levelCounts && (
              <span className="graph-sidebar-count-muted">
                {(levelCounts.level1 || 0) + (levelCounts.level2 || 0)}
              </span>
            )}
          </div>
          <div
            className={getFilterOptionClass(filter === "selected")}
            onClick={() => onFilterChange("selected")}
          >
            <div className={getRadioCircleClass(filter === "selected")}>
              {filter === "selected" && (
                <div className="graph-sidebar-radio-inner" />
              )}
            </div>
            <span className="graph-sidebar-item-label">Отобранные</span>
            {levelCounts && (
              <span className="graph-sidebar-count-success">
                {levelCounts.level1 || 0}
              </span>
            )}
          </div>
          <div
            className={getFilterOptionClass(filter === "excluded")}
            onClick={() => onFilterChange("excluded")}
          >
            <div className={getRadioCircleClass(filter === "excluded")}>
              {filter === "excluded" && (
                <div className="graph-sidebar-radio-inner" />
              )}
            </div>
            <span className="graph-sidebar-item-label">Исключённые</span>
          </div>
        </CollapsibleSection>

        {/* Sources */}
        <CollapsibleSection
          title="Источники"
          icon={<IconCircleStack size="sm" />}
          defaultOpen={false}
        >
          <div className="graph-sidebar-sources-list">
            <div
              className={getSourceOptionClass(
                selectedSources.includes("pubmed"),
              )}
              onClick={() => toggleSourceCheckbox("pubmed")}
            >
              <div
                className={getSourceBoxClass(
                  selectedSources.includes("pubmed"),
                  "pubmed",
                )}
              >
                {selectedSources.includes("pubmed") && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="graph-sidebar-item-label">PubMed</span>
            </div>
            <div
              className={getSourceOptionClass(selectedSources.includes("doaj"))}
              onClick={() => toggleSourceCheckbox("doaj")}
            >
              <div
                className={getSourceBoxClass(
                  selectedSources.includes("doaj"),
                  "doaj",
                )}
              >
                {selectedSources.includes("doaj") && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="graph-sidebar-item-label">DOAJ</span>
            </div>
            <div
              className={getSourceOptionClass(
                selectedSources.includes("wiley"),
              )}
              onClick={() => toggleSourceCheckbox("wiley")}
            >
              <div
                className={getSourceBoxClass(
                  selectedSources.includes("wiley"),
                  "wiley",
                )}
              >
                {selectedSources.includes("wiley") && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="graph-sidebar-item-label">Wiley</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Year Filter */}
        <CollapsibleSection
          title="Период публикации"
          icon={<IconCalendar size="sm" />}
          defaultOpen={false}
        >
          <div className="graph-sidebar-year-input-row">
            <input
              type="number"
              placeholder="От"
              value={yearFrom || ""}
              onChange={(e) => onYearFromChange(e.target.value)}
              onBlur={onApplyYearFilter}
              className="graph-sidebar-input"
            />
            <span className="graph-sidebar-year-separator">—</span>
            <input
              type="number"
              placeholder="До"
              value={yearTo || ""}
              onChange={(e) => onYearToChange(e.target.value)}
              onBlur={onApplyYearFilter}
              className="graph-sidebar-input"
            />
          </div>
        </CollapsibleSection>

        {/* P-value Filter */}
        <CollapsibleSection
          title="Качество статистики"
          icon={<IconChartBar size="sm" />}
          defaultOpen={false}
        >
          <select
            value={statsQuality}
            onChange={(e) => onStatsQualityChange(parseInt(e.target.value, 10))}
            className="graph-sidebar-select"
          >
            <option value={0}>Все статьи</option>
            <option value={1}>≥ Упомянут P-value</option>
            <option value={2}>≥ Значимые результаты</option>
            <option value={3}>Строгие критерии</option>
          </select>
        </CollapsibleSection>

        {/* Action Button */}
        <div className="graph-sidebar-action-wrap">
          <button
            className="graph-sidebar-action-btn graph-sidebar-action-btn--primary"
            onClick={onFetchReferences}
            disabled={fetchingRefs || fetchJobRunning}
          >
            <IconRefresh
              size="sm"
              className={fetchingRefs ? "graph-sidebar-spin" : undefined}
            />
            {fetchingRefs ? "Загрузка..." : "Обновить связи"}
          </button>
        </div>
      </div>

      {/* Feature Buttons (bottom) */}
      <div className="graph-sidebar-feature-buttons">
        {onShowSemanticSearch && (
          <button
            className={getFeatureButtonClass(showSemanticSearch || false)}
            onClick={onShowSemanticSearch}
          >
            <IconSearch size="sm" />
            <span>Семантический поиск</span>
          </button>
        )}
        {onShowMethodologyClusters && (
          <button
            className={getFeatureButtonClass(showMethodologyClusters || false)}
            onClick={onShowMethodologyClusters}
          >
            <IconAdjustments size="sm" />
            <span>Методологии</span>
          </button>
        )}
        {onShowSemanticClusters && (
          <button
            className={getFeatureButtonClass(showSemanticClusters || false)}
            onClick={onShowSemanticClusters}
          >
            <IconGraph size="sm" />
            <span>Кластеры</span>
          </button>
        )}
        {onShowGapAnalysis && (
          <button
            className={getFeatureButtonClass(showGapAnalysis || false)}
            onClick={onShowGapAnalysis}
          >
            <IconSearch size="sm" />
            <span>Пробелы</span>
          </button>
        )}
        {onShowRecommendations && (
          <button
            className={getFeatureButtonClass(false)}
            onClick={onShowRecommendations}
          >
            <IconSparkles size="sm" />
            <span>Рекомендации</span>
            {(recommendationsCount || 0) > 0 && (
              <span className="graph-sidebar-badge">
                {recommendationsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Color Legend */}
      <div className="graph-sidebar-color-legend">
        <div className="graph-sidebar-color-legend-title">Цветовая легенда</div>
        <div className="graph-sidebar-color-legend-list">
          {colorLegendItems.map((item) => (
            <div key={item.label} className="graph-sidebar-color-legend-item">
              <div
                className={`graph-sidebar-legend-dot ${item.dotClassName}`}
              />
              <span className="graph-sidebar-color-legend-label">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
