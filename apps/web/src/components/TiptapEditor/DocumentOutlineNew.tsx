import React, { useCallback, useMemo } from "react";
import { cn } from "../../design-system/utils/cn";
import {
  IconList,
  IconClose,
  IconDocument,
  IconChevronLeft,
} from "../FlowbiteIcons";

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
          "editor-sidebar flex flex-col h-full border-r w-64",
          className,
        )}
      >
        {/* Header */}
        <div className="editor-sidebar-header">
          <div className="flex items-center gap-2 editor-sidebar-title">
            <IconList size="sm" className="text-blue-400" />
            Оглавление
          </div>
          <button
            onClick={onClose}
            className="editor-header-btn"
            title="Скрыть оглавление"
          >
            <IconClose size="sm" />
          </button>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <IconDocument
            size="lg"
            className="w-12 h-12 mb-3 editor-outline-empty-icon"
          />
          <p className="editor-outline-empty-title">Нет заголовков</p>
          <p className="editor-outline-empty-subtitle">
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
          "editor-sidebar flex flex-col items-center py-4 border-r w-12",
          className,
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="editor-header-btn"
          title="Показать оглавление"
        >
          <IconList size="md" />
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
                  : "bg-neutral-500 hover:bg-blue-400",
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
        "editor-sidebar flex flex-col h-full border-r w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="editor-sidebar-header">
        <div className="flex items-center gap-2 editor-sidebar-title">
          <IconList size="sm" className="text-blue-400" />
          Оглавление
          <span className="text-xs px-1.5 py-0.5 rounded-full editor-outline-count-badge">
            {headings.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="editor-header-btn"
              title="Свернуть панель"
            >
              <IconChevronLeft size="sm" />
            </button>
          )}
          <button
            onClick={onClose}
            className="editor-header-btn"
            title="Скрыть оглавление"
          >
            <IconClose size="sm" />
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
              "hover:bg-blue-500/5",
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
                    : "text-neutral-500",
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
                    : "text-neutral-300",
                  heading.level === 1 && "font-medium",
                  heading.level === 3 && "text-neutral-400",
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
