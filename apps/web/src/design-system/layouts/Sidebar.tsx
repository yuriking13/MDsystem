import { type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SidebarProps {
  /** Sidebar content */
  children: ReactNode;
  /** Position of the sidebar */
  position?: "left" | "right";
  /** Width of the sidebar */
  width?: number | string;
  /** Whether the sidebar is collapsible */
  collapsible?: boolean;
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Additional class name */
  className?: string;
  /** Sticky sidebar */
  sticky?: boolean;
}

/**
 * Sidebar component for layouts
 *
 * @example
 * ```tsx
 * <Sidebar position="left" width={280}>
 *   <nav>Navigation items</nav>
 * </Sidebar>
 * ```
 */
export function Sidebar({
  children,
  position = "left",
  width = 280,
  collapsible = false,
  collapsed = false,
  onCollapsedChange,
  className,
  sticky = false,
}: SidebarProps) {
  const widthValue = typeof width === "number" ? `${width}px` : width;

  return (
    <aside
      className={cn(
        "shrink-0 overflow-y-auto border-neutral-200 dark:border-neutral-800",
        position === "left" ? "border-r" : "border-l",
        sticky && "sticky top-0 h-screen",
        className,
      )}
      style={{
        width: collapsed ? "0" : widthValue,
        minWidth: collapsed ? "0" : widthValue,
        maxWidth: collapsed ? "0" : widthValue,
        transition: "width 200ms ease-in-out",
      }}
    >
      {!collapsed && (
        <div className="h-full">
          {children}
          {collapsible && onCollapsedChange && (
            <button
              className="absolute top-4 right-4 rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => onCollapsedChange(true)}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={position === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
