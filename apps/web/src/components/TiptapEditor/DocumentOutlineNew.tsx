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
          "bg-slate-900/95 backdrop-blur-sm",
          "border-r border-slate-700/50",
          "w-64",
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <svg
              className="w-4 h-4 text-blue-400"
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
            Оглавление
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Скрыть оглавление"
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
            className="w-12 h-12 text-slate-600 mb-3"
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
          <p className="text-sm text-slate-400">Нет заголовков</p>
          <p className="text-xs text-slate-500 mt-1">
            Добавьте заголовки H1, H2, H3 для структуры
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
          "bg-slate-900/95 backdrop-blur-sm",
          "border-r border-slate-700/50",
          "w-12",
          className,
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Показать оглавление"
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

        {/* Mini indicators for headings - vertical dots */}
        <div className="mt-3 flex flex-col items-center gap-1.5 overflow-y-auto max-h-[calc(100vh-120px)]">
          {numberedHeadings.map((heading) => (
            <button
              key={heading.id}
              onClick={() => handleNavigate(heading.id)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors shrink-0",
                activeHeadingId === heading.id
                  ? "bg-blue-400 ring-2 ring-blue-400/30"
                  : "bg-slate-500 hover:bg-blue-400",
              )}
              title={heading.text}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "bg-slate-900/95 backdrop-blur-sm",
        "border-r border-slate-700/50",
        "w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <svg
            className="w-4 h-4 text-blue-400"
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
          Оглавление
          <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded-full">
            {headings.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Свернуть панель"
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
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Скрыть оглавление"
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
              "w-full text-left px-4 py-2 text-sm transition-all",
              "hover:bg-slate-800/50",
              "focus:outline-none focus:bg-slate-800/50",
              // Active state
              activeHeadingId === heading.id &&
                "bg-blue-500/10 border-l-2 border-blue-500",
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
                    ? "text-blue-400"
                    : "text-slate-500",
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
                    ? "text-blue-300 font-medium"
                    : "text-slate-300",
                  heading.level === 1 && "font-medium",
                  heading.level === 3 && "text-slate-400",
                )}
              >
                {heading.text || "(Без названия)"}
              </span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}
