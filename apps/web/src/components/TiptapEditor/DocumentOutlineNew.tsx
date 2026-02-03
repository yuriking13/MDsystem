import React, { useCallback, useMemo } from "react";
import { cn } from "../../design-system/utils/cn";

export interface Heading {
  level: number;
  text: string;
  id: string;
  pos?: number; // Position in document for scroll sync
}

interface DocumentOutlineProps {
  /** List of headings extracted from document */
  headings: Heading[];
  /** Callback when user clicks a heading to navigate */
  onNavigate: (id: string) => void;
  /** Callback to close the outline panel */
  onClose: () => void;
  /** Currently active heading ID (for scroll sync) */
  activeHeadingId?: string;
  /** Whether outline is collapsed */
  isCollapsed?: boolean;
  /** Callback to toggle collapsed state */
  onToggleCollapse?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * DocumentOutline - Left sidebar showing document structure
 *
 * Features:
 * - Tree view of headings (H1, H2, H3)
 * - Click to navigate
 * - Active heading highlight (scroll sync)
 * - Collapsible panel
 * - Smooth hover effects
 */
export default function DocumentOutline({
  headings,
  onNavigate,
  onClose,
  activeHeadingId,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: DocumentOutlineProps) {
  // Generate hierarchical numbering for headings
  const numberedHeadings = useMemo(() => {
    const counters = [0, 0, 0];

    return headings.map((heading) => {
      // Reset lower level counters when higher level appears
      if (heading.level === 1) {
        counters[0]++;
        counters[1] = 0;
        counters[2] = 0;
      } else if (heading.level === 2) {
        counters[1]++;
        counters[2] = 0;
      } else if (heading.level === 3) {
        counters[2]++;
      }

      // Generate number string based on level
      let number = "";
      if (heading.level === 1) {
        number = `${counters[0]}`;
      } else if (heading.level === 2) {
        number = `${counters[0]}.${counters[1]}`;
      } else if (heading.level === 3) {
        number = `${counters[0]}.${counters[1]}.${counters[2]}`;
      }

      return { ...heading, number };
    });
  }, [headings]);

  const handleNavigate = useCallback(
    (id: string) => {
      onNavigate(id);
    },
    [onNavigate],
  );

  if (headings.length === 0 && !isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col h-full",
          "bg-white dark:bg-neutral-900",
          "border-r border-neutral-200 dark:border-neutral-700",
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            Outline
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded transition-colors"
            title="Hide outline"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <svg
            className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No headings yet
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Add headings to see document structure
          </p>
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center py-4",
          "bg-white dark:bg-neutral-900",
          "border-r border-neutral-200 dark:border-neutral-700",
          "w-12",
          className,
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          title="Show outline"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </button>

        {/* Mini indicators for headings */}
        <div className="mt-4 space-y-1">
          {numberedHeadings.slice(0, 8).map((heading, idx) => (
            <button
              key={heading.id}
              onClick={() => handleNavigate(heading.id)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                activeHeadingId === heading.id
                  ? "bg-blue-500"
                  : "bg-neutral-300 dark:bg-neutral-600 hover:bg-blue-400",
              )}
              title={heading.text}
            />
          ))}
          {numberedHeadings.length > 8 && (
            <div className="text-[10px] text-neutral-400 text-center">
              +{numberedHeadings.length - 8}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "bg-white dark:bg-neutral-900",
        "border-r border-neutral-200 dark:border-neutral-700",
        "w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          Outline
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            ({headings.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded transition-colors"
              title="Collapse panel"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded transition-colors"
            title="Hide outline"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto py-2">
        {numberedHeadings.map((heading) => (
          <button
            key={heading.id}
            onClick={() => handleNavigate(heading.id)}
            className={cn(
              "w-full text-left px-4 py-2 text-sm transition-colors",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800",
              // Active state
              activeHeadingId === heading.id &&
                "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
              // Indentation based on level
              heading.level === 2 && "pl-6",
              heading.level === 3 && "pl-8",
            )}
            title={heading.text}
          >
            <div className="flex items-start gap-2">
              {/* Number */}
              <span
                className={cn(
                  "shrink-0 font-mono text-xs",
                  activeHeadingId === heading.id
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-neutral-400 dark:text-neutral-500",
                  heading.level === 1 && "font-semibold",
                )}
              >
                {heading.number}
              </span>

              {/* Text */}
              <span
                className={cn(
                  "flex-1 truncate",
                  activeHeadingId === heading.id
                    ? "text-blue-700 dark:text-blue-300 font-medium"
                    : "text-neutral-700 dark:text-neutral-300",
                  heading.level === 1 && "font-medium",
                  heading.level === 3 &&
                    "text-neutral-500 dark:text-neutral-400",
                )}
              >
                {heading.text || "(Untitled)"}
              </span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}
