import React from "react";

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
}: GraphLegendProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: 12,
        padding: isHorizontal ? "10px 16px" : "12px",
        boxShadow:
          "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: compact ? 12 : 16,
          flexDirection: isHorizontal ? "row" : "column",
          flexWrap: isHorizontal ? "wrap" : "nowrap",
          alignItems: isHorizontal ? "center" : "flex-start",
        }}
      >
        {nodeTypes.map((type) => {
          const isHidden = hiddenTypes.includes(type.id);

          return (
            <button
              key={type.id}
              onClick={() => onToggle?.(type.id)}
              disabled={!onToggle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                borderRadius: 6,
                cursor: onToggle ? "pointer" : "default",
                opacity: isHidden ? 0.4 : 1,
                transition: "all 0.2s ease",
              }}
              title={type.description}
              onMouseEnter={(e) => {
                if (onToggle) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Color Dot with glow */}
              <span
                style={{
                  width: compact ? 10 : 12,
                  height: compact ? 10 : 12,
                  borderRadius: "50%",
                  backgroundColor: type.color,
                  boxShadow: `0 0 8px ${type.color}60`,
                  flexShrink: 0,
                }}
              />

              {/* Label */}
              <span
                style={{
                  color: "rgba(226, 232, 240, 0.9)",
                  fontSize: compact ? 12 : 13,
                  fontWeight: 500,
                  textDecoration: isHidden ? "line-through" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {type.label}
              </span>

              {/* Count */}
              {showCounts && type.count !== undefined && (
                <span
                  style={{
                    color: "rgba(148, 163, 184, 0.8)",
                    fontSize: compact ? 11 : 12,
                  }}
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
    <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10 }}>
      <GraphLegend
        nodeTypes={nodeTypes.filter(
          (t) => t.count !== undefined && t.count > 0,
        )}
        hiddenTypes={hiddenTypes}
        onToggle={onToggle}
        orientation="horizontal"
        showCounts={true}
        compact={false}
      />
    </div>
  );
}
