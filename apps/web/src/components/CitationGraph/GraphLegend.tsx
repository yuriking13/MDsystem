import React from "react";
import { cn } from "../../design-system/utils/cn";

interface NodeType {
  id: string;
  label: string;
  color: string;
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
  className?: string;
}

export default function GraphLegend({
  nodeTypes,
  onToggle,
  hiddenTypes = [],
  orientation = "horizontal",
  showCounts = true,
  compact = false,
  className,
}: GraphLegendProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        "bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg",
        isHorizontal ? "px-4 py-2" : "p-3",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-4",
          isHorizontal ? "flex-row flex-wrap items-center" : "flex-col",
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
                "flex items-center gap-2 transition-opacity",
                onToggle && "cursor-pointer hover:opacity-80",
                !onToggle && "cursor-default",
                isHidden && "opacity-40",
              )}
              title={type.description}
            >
              {/* Color Dot */}
              <span
                className={cn(
                  "rounded-full flex-shrink-0",
                  compact ? "w-2 h-2" : "w-3 h-3",
                )}
                style={{ backgroundColor: type.color }}
              />

              {/* Label */}
              <span
                className={cn(
                  "text-slate-300",
                  compact ? "text-xs" : "text-sm",
                  isHidden && "line-through",
                )}
              >
                {type.label}
              </span>

              {/* Count */}
              {showCounts && type.count !== undefined && (
                <span
                  className={cn(
                    "text-slate-500",
                    compact ? "text-xs" : "text-sm",
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
  className?: string;
}

export function CitationGraphLegend({
  counts,
  hiddenTypes,
  onToggle,
  theme = "dark",
  className,
}: CitationGraphLegendProps) {
  const colors =
    theme === "dark"
      ? {
          selected: "#22c55e",
          candidate: "#3b82f6",
          excluded: "#ef4444",
          citing: "#ec4899",
          reference: "#f97316",
          related: "#06b6d4",
          pvalue: "#fbbf24",
        }
      : {
          selected: "#C6DDCD",
          candidate: "#ACDBEB",
          excluded: "#FABAAE",
          citing: "#FC9DBF",
          reference: "#F9D7B2",
          related: "#C7DBDA",
          pvalue: "#FBD6E6",
        };

  const nodeTypes: NodeType[] = [
    {
      id: "selected",
      label: "Selected",
      color: colors.selected,
      count: counts.selected,
      description: "Articles included in the review",
    },
    {
      id: "candidate",
      label: "Candidate",
      color: colors.candidate,
      count: counts.candidate,
      description: "Articles pending review",
    },
    {
      id: "excluded",
      label: "Excluded",
      color: colors.excluded,
      count: counts.excluded,
      description: "Articles excluded from the review",
    },
    {
      id: "citing",
      label: "Citing",
      color: colors.citing,
      count: counts.citing,
      description: "Articles citing selected papers",
    },
    {
      id: "reference",
      label: "References",
      color: colors.reference,
      count: counts.reference,
      description: "References from selected papers",
    },
    {
      id: "related",
      label: "Related",
      color: colors.related,
      count: counts.related,
      description: "Semantically related articles",
    },
  ];

  // Add P-value if exists
  if (counts.pvalue && counts.pvalue > 0) {
    nodeTypes.push({
      id: "pvalue",
      label: "P-value",
      color: colors.pvalue,
      count: counts.pvalue,
      description: "Articles with statistical significance",
    });
  }

  return (
    <GraphLegend
      nodeTypes={nodeTypes.filter((t) => t.count !== undefined && t.count > 0)}
      hiddenTypes={hiddenTypes}
      onToggle={onToggle}
      orientation="horizontal"
      showCounts={true}
      compact={false}
      className={cn("absolute bottom-4 left-4 z-10", className)}
    />
  );
}
