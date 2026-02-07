import React from "react";
import { cn } from "../../design-system/utils/cn";
import {
  IconSearch,
  IconMinus,
  IconPlus,
  IconArrowsExpand,
  IconTarget,
  IconSettings,
} from "../FlowbiteIcons";

interface GraphToolbarProps {
  // Zoom controls
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCenter: () => void;
  zoomLevel?: number;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  searchResults?: number;

  // Layout
  layoutType: "force" | "dagre" | "circular";
  onLayoutChange: (type: "force" | "dagre" | "circular") => void;

  // Optional actions
  onSettingsClick?: () => void;

  className?: string;
}

export default function GraphToolbar({
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenter,
  zoomLevel,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchResults,
  layoutType,
  onLayoutChange,
  onSettingsClick,
  className,
}: GraphToolbarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearchSubmit();
    }
  };

  return (
    <div
      className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-10",
        "flex items-center gap-2 px-3 py-2",
        "bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-lg",
        className,
      )}
    >
      {/* Search */}
      <div className="relative">
        <IconSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          size="sm"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes..."
          className={cn(
            "w-48 pl-9 pr-3 py-1.5 text-sm",
            "bg-slate-800/50 border border-slate-700 rounded-lg",
            "text-slate-200 placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
          )}
        />
        {searchResults !== undefined && searchResults > 0 && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {searchResults}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom Out"
        >
          <IconMinus className="w-4 h-4" size="sm" />
        </button>

        {zoomLevel !== undefined && (
          <span className="text-xs text-slate-400 font-mono min-w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
        )}

        <button
          onClick={onZoomIn}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom In"
        >
          <IconPlus className="w-4 h-4" size="sm" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700" />

      {/* View Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onFitView}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Fit to View"
        >
          <IconArrowsExpand className="w-4 h-4" size="sm" />
        </button>

        <button
          onClick={onCenter}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Center Graph"
        >
          <IconTarget className="w-4 h-4" size="sm" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700" />

      {/* Layout Selector */}
      <div className="flex items-center gap-1">
        <select
          value={layoutType}
          onChange={(e) =>
            onLayoutChange(e.target.value as "force" | "dagre" | "circular")
          }
          className={cn(
            "px-2 py-1 text-xs",
            "bg-slate-800/50 border border-slate-700 rounded-lg",
            "text-slate-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          )}
        >
          <option value="force">Force Layout</option>
          <option value="dagre">Hierarchical</option>
          <option value="circular">Circular</option>
        </select>
      </div>

      {/* Settings */}
      {onSettingsClick && (
        <>
          <div className="w-px h-6 bg-slate-700" />
          <button
            onClick={onSettingsClick}
            className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Graph Settings"
          >
            <IconSettings className="w-4 h-4" size="sm" />
          </button>
        </>
      )}
    </div>
  );
}
