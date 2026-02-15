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

interface GraphSidebarProps {
  // Filters
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  depth: DepthType;
  onDepthChange: (depth: DepthType) => void;

  // Sources
  selectedSources: ("pubmed" | "doaj" | "wiley")[];
  onSourcesChange: (sources: ("pubmed" | "doaj" | "wiley")[]) => void;

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

  const sectionStyle: React.CSSProperties = {
    borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "background 0.15s ease",
  };

  const titleContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "13px",
    fontWeight: 500,
  };

  const iconWrapperStyle: React.CSSProperties = {
    width: "18px",
    height: "18px",
    color: "rgba(148, 163, 184, 0.7)",
  };

  const chevronStyle: React.CSSProperties = {
    width: "16px",
    height: "16px",
    color: "rgba(148, 163, 184, 0.5)",
    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
    transition: "transform 0.2s ease",
  };

  const contentStyle: React.CSSProperties = {
    padding: isOpen ? "0 16px 16px" : "0",
    maxHeight: isOpen ? "500px" : "0",
    overflow: "hidden",
    transition: "all 0.2s ease",
    opacity: isOpen ? 1 : 0,
  };

  return (
    <div style={sectionStyle}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={headerStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(148, 163, 184, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div style={titleContainerStyle}>
          <span style={iconWrapperStyle}>{icon}</span>
          {title}
        </div>
        <IconChevronRight size="sm" style={chevronStyle} />
      </button>
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

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
  // Styles
  const sidebarStyle: React.CSSProperties = {
    width: collapsed ? "48px" : "280px",
    height: "100%",
    background:
      "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)",
    borderRight: "1px solid rgba(148, 163, 184, 0.1)",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.3s ease",
    overflow: "hidden",
    flexShrink: 0,
  };

  const logoSectionStyle: React.CSSProperties = {
    padding: "16px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const logoStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    color: "white",
    opacity: collapsed ? 0 : 1,
    transition: "opacity 0.2s ease",
    whiteSpace: "nowrap",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "rgba(148, 163, 184, 0.7)",
    opacity: collapsed ? 0 : 1,
    transition: "opacity 0.2s ease",
    whiteSpace: "nowrap",
  };

  const statsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    padding: "12px 16px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
  };

  const statBoxStyle: React.CSSProperties = {
    background: "rgba(148, 163, 184, 0.05)",
    borderRadius: "8px",
    padding: "10px 12px",
    textAlign: "center",
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    color: "white",
    lineHeight: 1.2,
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: "10px",
    color: "rgba(148, 163, 184, 0.7)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginTop: "2px",
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
  };

  const depthButtonsStyle: React.CSSProperties = {
    display: "flex",
    gap: "6px",
    marginBottom: "12px",
  };

  const depthButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 12px",
    background: active
      ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
      : "rgba(148, 163, 184, 0.1)",
    border: "none",
    borderRadius: "8px",
    color: active ? "white" : "rgba(148, 163, 184, 0.9)",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  const filterOptionStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    background: active ? "rgba(59, 130, 246, 0.15)" : "transparent",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginBottom: "4px",
  });

  const radioCircleStyle = (active: boolean): React.CSSProperties => ({
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: `2px solid ${active ? "#3b82f6" : "rgba(148, 163, 184, 0.3)"}`,
    background: active ? "#3b82f6" : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  });

  const radioInnerStyle: React.CSSProperties = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "white",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.9)",
    flex: 1,
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  };

  const checkboxStyle = (checked: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    background: checked ? "rgba(59, 130, 246, 0.1)" : "transparent",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  const checkboxBoxStyle = (
    checked: boolean,
    color: string,
  ): React.CSSProperties => ({
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    border: `2px solid ${checked ? color : "rgba(148, 163, 184, 0.3)"}`,
    background: checked ? color : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  });

  const inputRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px 12px",
    background: "rgba(148, 163, 184, 0.1)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "8px",
    color: "white",
    fontSize: "13px",
    outline: "none",
    transition: "border-color 0.15s ease",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(148, 163, 184, 0.1)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "8px",
    color: "white",
    fontSize: "13px",
    outline: "none",
    cursor: "pointer",
  };

  const actionButtonStyle = (
    primary: boolean = false,
    active: boolean = false,
  ): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "12px 16px",
    background: primary
      ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
      : active
        ? "rgba(59, 130, 246, 0.2)"
        : "rgba(148, 163, 184, 0.1)",
    border: active
      ? "1px solid rgba(59, 130, 246, 0.5)"
      : "1px solid transparent",
    borderRadius: "10px",
    color: primary || active ? "white" : "rgba(255, 255, 255, 0.9)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginBottom: "8px",
  });

  const featureButtonsStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderTop: "1px solid rgba(148, 163, 184, 0.1)",
    marginTop: "auto",
  };

  const featureButtonStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 12px",
    background: active ? "rgba(59, 130, 246, 0.15)" : "transparent",
    border: "none",
    borderRadius: "8px",
    color: active ? "white" : "rgba(255, 255, 255, 0.8)",
    fontSize: "13px",
    fontWeight: 400,
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginBottom: "4px",
    textAlign: "left" as const,
  });

  const badgeStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    color: "white",
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "10px",
    marginLeft: "auto",
  };

  const collapsedLogoSectionStyle: React.CSSProperties = {
    ...logoSectionStyle,
    justifyContent: "center",
    padding: "12px",
  };

  const logoButtonStyle: React.CSSProperties = {
    ...logoStyle,
    cursor: "pointer",
    border: "none",
  };

  const actionButtonWrapStyle: React.CSSProperties = {
    padding: "12px 16px",
  };

  const colorLegendStyle: React.CSSProperties = {
    padding: "16px",
    borderTop: "1px solid rgba(148, 163, 184, 0.1)",
    background: "rgba(0, 0, 0, 0.2)",
  };

  const colorLegendTitleStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "rgba(148, 163, 184, 0.7)",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const colorLegendListStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  };

  const colorLegendItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const colorLegendLabelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.7)",
  };

  const colorLegendItems = [
    { label: "Отобранные", dotClassName: "graph-sidebar-legend-dot--selected" },
    { label: "PubMed", dotClassName: "graph-sidebar-legend-dot--pubmed" },
    { label: "DOAJ", dotClassName: "graph-sidebar-legend-dot--doaj" },
    { label: "Wiley", dotClassName: "graph-sidebar-legend-dot--wiley" },
    {
      label: "Исключённые",
      dotClassName: "graph-sidebar-legend-dot--excluded",
    },
  ];

  const toggleSourceCheckbox = (source: "pubmed" | "doaj" | "wiley") => {
    if (selectedSources.includes(source)) {
      onSourcesChange(selectedSources.filter((s) => s !== source));
    } else {
      onSourcesChange([...selectedSources, source]);
    }
  };

  if (collapsed) {
    return (
      <div style={sidebarStyle}>
        <div style={collapsedLogoSectionStyle}>
          <button onClick={onToggleCollapse} style={logoButtonStyle}>
            <IconGraph size="sm" className="graph-sidebar-logo-icon" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={sidebarStyle}>
      {/* Logo Section */}
      <div style={logoSectionStyle}>
        <button onClick={onToggleCollapse} style={logoButtonStyle}>
          <IconGraph size="sm" className="graph-sidebar-logo-icon" />
        </button>
        <div>
          <div style={titleStyle}>Visual Explorer</div>
          <div style={subtitleStyle}>Граф цитирования</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={statsGridStyle}>
        <div style={statBoxStyle}>
          <div style={statValueStyle}>{totalNodes}</div>
          <div style={statLabelStyle}>Узлов</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statValueStyle}>{totalLinks}</div>
          <div style={statLabelStyle}>Связей</div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={contentStyle}>
        {/* Depth Section */}
        <CollapsibleSection
          title="Глубина графа"
          icon={<IconCircleStack size="sm" />}
          defaultOpen={true}
        >
          <div style={depthButtonsStyle}>
            <button
              style={depthButtonStyle(depth === 1)}
              onClick={() => onDepthChange(1)}
            >
              Проект
            </button>
            <button
              style={depthButtonStyle(depth === 2)}
              onClick={() => onDepthChange(2)}
            >
              +Ссылки
            </button>
            <button
              style={depthButtonStyle(depth === 3)}
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
            style={filterOptionStyle(filter === "all")}
            onClick={() => onFilterChange("all")}
          >
            <div style={radioCircleStyle(filter === "all")}>
              {filter === "all" && <div style={radioInnerStyle} />}
            </div>
            <span style={labelStyle}>Все статьи</span>
            {levelCounts && (
              <span className="graph-sidebar-count-muted">
                {(levelCounts.level1 || 0) + (levelCounts.level2 || 0)}
              </span>
            )}
          </div>
          <div
            style={filterOptionStyle(filter === "selected")}
            onClick={() => onFilterChange("selected")}
          >
            <div style={radioCircleStyle(filter === "selected")}>
              {filter === "selected" && <div style={radioInnerStyle} />}
            </div>
            <span style={labelStyle}>Отобранные</span>
            {levelCounts && (
              <span className="graph-sidebar-count-success">
                {levelCounts.level1 || 0}
              </span>
            )}
          </div>
          <div
            style={filterOptionStyle(filter === "excluded")}
            onClick={() => onFilterChange("excluded")}
          >
            <div style={radioCircleStyle(filter === "excluded")}>
              {filter === "excluded" && <div style={radioInnerStyle} />}
            </div>
            <span style={labelStyle}>Исключённые</span>
          </div>
        </CollapsibleSection>

        {/* Sources */}
        <CollapsibleSection
          title="Источники"
          icon={<IconCircleStack size="sm" />}
          defaultOpen={false}
        >
          <div style={checkboxContainerStyle}>
            <div
              style={checkboxStyle(selectedSources.includes("pubmed"))}
              onClick={() => toggleSourceCheckbox("pubmed")}
            >
              <div
                style={checkboxBoxStyle(
                  selectedSources.includes("pubmed"),
                  "#3b82f6",
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
              <span style={labelStyle}>PubMed</span>
            </div>
            <div
              style={checkboxStyle(selectedSources.includes("doaj"))}
              onClick={() => toggleSourceCheckbox("doaj")}
            >
              <div
                style={checkboxBoxStyle(
                  selectedSources.includes("doaj"),
                  "#eab308",
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
              <span style={labelStyle}>DOAJ</span>
            </div>
            <div
              style={checkboxStyle(selectedSources.includes("wiley"))}
              onClick={() => toggleSourceCheckbox("wiley")}
            >
              <div
                style={checkboxBoxStyle(
                  selectedSources.includes("wiley"),
                  "#8b5cf6",
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
              <span style={labelStyle}>Wiley</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Year Filter */}
        <CollapsibleSection
          title="Период публикации"
          icon={<IconCalendar size="sm" />}
          defaultOpen={false}
        >
          <div style={inputRowStyle}>
            <input
              type="number"
              placeholder="От"
              value={yearFrom || ""}
              onChange={(e) => onYearFromChange(e.target.value)}
              onBlur={onApplyYearFilter}
              style={inputStyle}
            />
            <span className="graph-sidebar-year-separator">—</span>
            <input
              type="number"
              placeholder="До"
              value={yearTo || ""}
              onChange={(e) => onYearToChange(e.target.value)}
              onBlur={onApplyYearFilter}
              style={inputStyle}
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
            style={selectStyle}
          >
            <option value={0}>Все статьи</option>
            <option value={1}>≥ Упомянут P-value</option>
            <option value={2}>≥ Значимые результаты</option>
            <option value={3}>Строгие критерии</option>
          </select>
        </CollapsibleSection>

        {/* Action Button */}
        <div style={actionButtonWrapStyle}>
          <button
            style={actionButtonStyle(true)}
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
      <div style={featureButtonsStyle}>
        {onShowSemanticSearch && (
          <button
            style={featureButtonStyle(showSemanticSearch || false)}
            onClick={onShowSemanticSearch}
          >
            <IconSearch size="sm" />
            <span>Семантический поиск</span>
          </button>
        )}
        {onShowMethodologyClusters && (
          <button
            style={featureButtonStyle(showMethodologyClusters || false)}
            onClick={onShowMethodologyClusters}
          >
            <IconAdjustments size="sm" />
            <span>Методологии</span>
          </button>
        )}
        {onShowSemanticClusters && (
          <button
            style={featureButtonStyle(showSemanticClusters || false)}
            onClick={onShowSemanticClusters}
          >
            <IconGraph size="sm" />
            <span>Кластеры</span>
          </button>
        )}
        {onShowRecommendations && (
          <button
            style={featureButtonStyle(false)}
            onClick={onShowRecommendations}
          >
            <IconSparkles size="sm" />
            <span>Рекомендации</span>
            {(recommendationsCount || 0) > 0 && (
              <span style={badgeStyle} className="graph-sidebar-badge">
                {recommendationsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Color Legend */}
      <div style={colorLegendStyle}>
        <div style={colorLegendTitleStyle}>Цветовая легенда</div>
        <div style={colorLegendListStyle}>
          {colorLegendItems.map((item) => (
            <div key={item.label} style={colorLegendItemStyle}>
              <div
                className={`graph-sidebar-legend-dot ${item.dotClassName}`}
              />
              <span style={colorLegendLabelStyle}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
