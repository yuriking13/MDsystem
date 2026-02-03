import React from "react";
import { cn } from "../../design-system/utils/cn";

interface GraphMiniMapProps {
  // Viewport state
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;

  // Graph bounds
  graphWidth: number;
  graphHeight: number;

  // Nodes for rendering (simplified)
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    color?: string;
  }>;

  // Interaction
  onViewportChange?: (x: number, y: number) => void;

  // Styling
  width?: number;
  height?: number;
  className?: string;
}

export default function GraphMiniMap({
  viewportX,
  viewportY,
  viewportWidth,
  viewportHeight,
  graphWidth,
  graphHeight,
  nodes,
  onViewportChange,
  width = 160,
  height = 120,
  className,
}: GraphMiniMapProps) {
  const padding = 8;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Calculate scale to fit graph in minimap
  const scaleX = innerWidth / graphWidth;
  const scaleY = innerHeight / graphHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  // Calculate viewport rectangle
  const vpWidth = viewportWidth * scale;
  const vpHeight = viewportHeight * scale;
  const vpX = padding + (viewportX + graphWidth / 2) * scale - vpWidth / 2;
  const vpY = padding + (viewportY + graphHeight / 2) * scale - vpHeight / 2;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onViewportChange) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - padding) / scale - graphWidth / 2;
    const y = (e.clientY - rect.top - padding) / scale - graphHeight / 2;
    onViewportChange(x, y);
  };

  return (
    <div
      className={cn(
        "absolute bottom-4 right-4 z-10",
        "bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-lg",
        "overflow-hidden",
        className,
      )}
    >
      <svg
        width={width}
        height={height}
        onClick={handleClick}
        className="cursor-pointer"
      >
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="rgba(15, 23, 42, 0.5)"
        />

        {/* Nodes */}
        <g
          transform={`translate(${padding + (innerWidth - graphWidth * scale) / 2}, ${padding + (innerHeight - graphHeight * scale) / 2})`}
        >
          {nodes.map((node) => (
            <circle
              key={node.id}
              cx={(node.x + graphWidth / 2) * scale}
              cy={(node.y + graphHeight / 2) * scale}
              r={1.5}
              fill={node.color || "#3B82F6"}
              opacity={0.7}
            />
          ))}
        </g>

        {/* Viewport Rectangle */}
        <rect
          x={Math.max(0, vpX)}
          y={Math.max(0, vpY)}
          width={Math.min(vpWidth, width - Math.max(0, vpX))}
          height={Math.min(vpHeight, height - Math.max(0, vpY))}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3B82F6"
          strokeWidth={1}
          rx={2}
        />

        {/* Border */}
        <rect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          fill="none"
          stroke="rgba(71, 85, 105, 0.5)"
          rx={7}
        />
      </svg>
    </div>
  );
}
