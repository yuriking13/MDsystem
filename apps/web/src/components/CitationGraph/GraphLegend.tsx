import React from "react";
import { cn } from "../../design-system/utils/cn";

interface NodeType {
  id: string;
  label: string;
  count?: number;
  description?: string;
}

interface GraphLegendProps {
  nodeTypes: NodeType[];
  onToggle?: (typeId: string) => void;
  hiddenTypes?: string[];
  orientation?: "horizontal" | "vertical";
  showCounts?: boolean;
  compact?: boolean;
  theme?: "light" | "dark";
  className?: string;
}

export default function GraphLegend({
  nodeTypes,
  onToggle,
  hiddenTypes = [],
  orientation = "horizontal",
  showCounts = true,
  compact = false,
  theme = "dark",
  className,
}: GraphLegendProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        "graph-legend-panel",
        isHorizontal
          ? "graph-legend-panel--horizontal"
          : "graph-legend-panel--vertical",
        compact && "graph-legend-panel--compact",
        theme === "light"
          ? "graph-legend-theme-light"
          : "graph-legend-theme-dark",
        className,
      )}
    >
      <div
        className={cn(
          "graph-legend-items",
          isHorizontal
            ? "graph-legend-items--horizontal"
            : "graph-legend-items--vertical",
          compact && "graph-legend-items--compact",
        )}
      >
        {nodeTypes.map((type) => {
          const isHidden = hiddenTypes.includes(type.id);

          return (
            <button
              key={type.id}
              onClick={() => onToggle?.(type.id)}
              disabled={!onToggle}
              className={cn(
                "graph-legend-item-btn",
                `graph-legend-item-btn--${type.id}`,
                onToggle
                  ? "graph-legend-item-btn--interactive"
                  : "graph-legend-item-btn--static",
                isHidden && "graph-legend-item-btn--hidden",
              )}
              title={type.description}
            >
              {/* Color Dot with glow */}
              <span
                className={cn(
                  "graph-legend-item-dot",
                  compact && "graph-legend-item-dot--compact",
                )}
              />

              {/* Label */}
              <span
                className={cn(
                  "graph-legend-item-label",
                  compact && "graph-legend-item-label--compact",
                )}
              >
                {type.label}
              </span>

              {/* Count */}
              {showCounts && type.count !== undefined && (
                <span
                  className={cn(
                    "graph-legend-item-count",
                    compact && "graph-legend-item-count--compact",
                  )}
                >
                  ({type.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Pre-configured legend for citation graph
interface CitationGraphLegendProps {
  counts: {
    selected?: number;
    candidate?: number;
    excluded?: number;
    citing?: number;
    reference?: number;
    related?: number;
    pvalue?: number;
  };
  hiddenTypes?: string[];
  onToggle?: (typeId: string) => void;
  theme?: "light" | "dark";
}

export function CitationGraphLegend({
  counts,
  hiddenTypes,
  onToggle,
  theme = "dark",
}: CitationGraphLegendProps) {
  const nodeTypes: NodeType[] = [
    {
      id: "selected",
      label: "Selected",
      count: counts.selected,
      description: "Articles included in the review",
    },
    {
      id: "candidate",
      label: "Candidate",
      count: counts.candidate,
      description: "Articles pending review",
    },
    {
      id: "excluded",
      label: "Excluded",
      count: counts.excluded,
      description: "Articles excluded from the review",
    },
    {
      id: "citing",
      label: "Citing",
      count: counts.citing,
      description: "Articles citing selected papers",
    },
    {
      id: "reference",
      label: "References",
      count: counts.reference,
      description: "References from selected papers",
    },
    {
      id: "related",
      label: "Related",
      count: counts.related,
      description: "Semantically related articles",
    },
  ];

  // Add P-value if exists
  if (counts.pvalue && counts.pvalue > 0) {
    nodeTypes.push({
      id: "pvalue",
      label: "P-value",
      count: counts.pvalue,
      description: "Articles with statistical significance",
    });
  }

  return (
    <div className="graph-legend-container">
      <GraphLegend
        nodeTypes={nodeTypes.filter(
          (t) => t.count !== undefined && t.count > 0,
        )}
        hiddenTypes={hiddenTypes}
        onToggle={onToggle}
        orientation="horizontal"
        showCounts={true}
        compact={false}
        theme={theme}
      />
    </div>
  );
}
