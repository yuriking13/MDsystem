import { type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SplitPaneLayoutProps {
  /** Left pane content */
  left: ReactNode;
  /** Right pane content */
  right: ReactNode;
  /** Split ratio (0-100) */
  splitRatio?: number;
  /** Allow resizing */
  resizable?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Split pane layout for side-by-side content
 * Used in Chart Builder for data input and preview
 *
 * @example
 * ```tsx
 * <SplitPaneLayout
 *   left={<DataGrid />}
 *   right={<ChartPreview />}
 *   splitRatio={50}
 * />
 * ```
 */
export function SplitPaneLayout({
  left,
  right,
  splitRatio = 50,
  resizable = false,
  className,
}: SplitPaneLayoutProps) {
  // TODO: Add resize functionality later
  return (
    <div className={cn("flex h-full w-full", className)}>
      {/* Left pane */}
      <div
        className="overflow-auto border-r border-neutral-200 dark:border-neutral-800"
        style={{ width: `${splitRatio}%` }}
      >
        {left}
      </div>

      {/* Right pane */}
      <div className="overflow-auto" style={{ width: `${100 - splitRatio}%` }}>
        {right}
      </div>
    </div>
  );
}
