import React, { useState, useCallback, useMemo } from "react";
import { cn } from "../../design-system/utils/cn";
import {
  IconBook,
  IconClose,
  IconSearch,
  IconChevronDown,
  IconChevronsRight,
} from "../FlowbiteIcons";
import type { Citation } from "../../lib/api";
import {
  groupCitationsBySource,
  sortCitationsForDisplay,
  shouldShowSubNumber,
  getDedupeKey,
} from "../../lib/bibliographyManager";

interface BibliographySidebarProps {
  /** List of citations in document */
  citations: Citation[];
  /** Callback to close the sidebar */
  onClose: () => void;
  /** Callback to remove a citation */
  onRemoveCitation?: (citationId: string) => void;
  /** Callback to update citation note */
  onUpdateCitationNote?: (citationId: string, note: string) => void;
  /** Whether sidebar is collapsed */
  isCollapsed?: boolean;
  /** Callback to toggle collapsed state */
  onToggleCollapse?: () => void;
  /** Search query for filtering */
  searchQuery?: string;
  /** Sort mode */
  sortBy?: "number" | "author" | "year" | "title";
  /** Additional className */
  className?: string;
}

type ViewMode = "all" | "bySource";

/**
 * BibliographySidebarNew - Right sidebar showing document bibliography
 *
 * Features:
 * - List of all citations with metadata
 * - View modes: all citations / grouped by source
 * - Click to navigate to citation in text
 * - Edit/remove citation notes
 * - Sortable by number, author, year, title
 * - Searchable
 * - Collapsible
 */
export default function BibliographySidebarNew({
  citations = [],
  onClose,
  onRemoveCitation,
  onUpdateCitationNote,
  isCollapsed = false,
  onToggleCollapse,
  searchQuery = "",
  sortBy = "number",
  className,
}: BibliographySidebarProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Safe citations array
  const safeCitations = useMemo(() => citations || [], [citations]);

  // Filter by search
  const filteredCitations = useMemo(() => {
    if (!localSearchQuery.trim()) return safeCitations;
    const query = localSearchQuery.toLowerCase();
    return safeCitations.filter(
      (c) =>
        c.article?.title_en?.toLowerCase().includes(query) ||
        c.article?.authors?.some((a) => a.toLowerCase().includes(query)) ||
        c.article?.journal?.toLowerCase().includes(query) ||
        c.note?.toLowerCase().includes(query),
    );
  }, [safeCitations, localSearchQuery]);

  // Sort citations
  const sortedCitations = useMemo(() => {
    const sorted = sortCitationsForDisplay(filteredCitations);
    // Additional sorting based on sortBy
    if (sortBy === "author") {
      return [...sorted].sort((a, b) => {
        const authorA = a.article?.authors?.[0] || "";
        const authorB = b.article?.authors?.[0] || "";
        return authorA.localeCompare(authorB);
      });
    }
    if (sortBy === "year") {
      return [...sorted].sort(
        (a, b) => (b.article?.year || 0) - (a.article?.year || 0),
      );
    }
    if (sortBy === "title") {
      return [...sorted].sort((a, b) => {
        const titleA = a.article?.title_en || "";
        const titleB = b.article?.title_en || "";
        return titleA.localeCompare(titleB);
      });
    }
    return sorted;
  }, [filteredCitations, sortBy]);

  // Group by source
  const groupedCitations = useMemo(
    () => groupCitationsBySource(filteredCitations),
    [filteredCitations],
  );

  // Unique sources count
  const uniqueSourcesCount = useMemo(() => {
    const dedupeKeys = new Set<string>();
    for (const c of safeCitations) {
      const key = getDedupeKey(c.article) || `id:${c.article_id}`;
      dedupeKeys.add(key);
    }
    return dedupeKeys.size;
  }, [safeCitations]);

  const startEditNote = (citation: Citation) => {
    setEditingNoteId(citation.id);
    setNoteText(citation.note || "");
  };

  const saveNote = (citationId: string) => {
    if (onUpdateCitationNote) {
      onUpdateCitationNote(citationId, noteText);
    }
    setEditingNoteId(null);
    setNoteText("");
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNoteText("");
  };

  // Navigate to citation in text
  const handleCitationClick = useCallback((citationId: string) => {
    const citationEl = document.querySelector(
      `.citation-ref[data-citation-id="${citationId}"]`,
    );

    if (citationEl) {
      citationEl.scrollIntoView({ behavior: "smooth", block: "center" });
      citationEl.classList.add("citation-highlight");
      setTimeout(() => {
        citationEl.classList.remove("citation-highlight");
      }, 2000);
    }
  }, []);

  // Format display number
  const formatDisplayNumber = (citation: Citation): string => {
    const showSub = shouldShowSubNumber(safeCitations, citation.article_id);
    const subNum = citation.sub_number || 1;

    if (showSub) {
      return `${citation.inline_number}#${subNum}`;
    }
    return String(citation.inline_number);
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <div
        className={cn(
          "editor-sidebar flex flex-col items-center py-4",
          "w-12",
          className,
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="editor-header-btn p-2"
          title="Показать библиографию"
        >
          <IconBook size="md" />
        </button>

        {/* Citation count indicator */}
        {safeCitations.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-neutral-400">
              {uniqueSourcesCount}
            </span>
            <span className="text-[10px] text-neutral-500">ист.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("editor-sidebar flex flex-col h-full", "w-80", className)}
    >
      {/* Header */}
      <div className="editor-sidebar-header flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
          <IconBook size="sm" className="text-blue-400" />
          Библиография
          <span
            className="px-1.5 py-0.5 text-xs rounded"
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-muted)",
            }}
          >
            {uniqueSourcesCount}/{safeCitations.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="editor-header-btn p-1.5"
              title="Свернуть панель"
            >
              <IconChevronsRight size="sm" />
            </button>
          )}
          <button
            onClick={onClose}
            className="editor-header-btn p-1.5"
            title="Скрыть библиографию"
          >
            <IconClose size="sm" />
          </button>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div
        className="px-4 py-2 space-y-2"
        style={{ borderBottom: "1px solid var(--border-glass)" }}
      >
        {/* Search */}
        <div className="relative">
          <IconSearch
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
            style={{ width: 14, height: 14 }}
          />
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="Поиск цитат..."
            className="toolbar-select w-full pl-7 pr-3 py-1.5 text-sm rounded-lg"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-between">
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border-glass)" }}
          >
            <button
              onClick={() => setViewMode("all")}
              className={cn(
                "px-3 py-1 text-xs transition-colors",
                viewMode === "all"
                  ? "bg-blue-500 text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
              style={
                viewMode !== "all"
                  ? { background: "var(--bg-secondary)" }
                  : undefined
              }
            >
              Все
            </button>
            <button
              onClick={() => setViewMode("bySource")}
              className={cn(
                "px-3 py-1 text-xs transition-colors",
                viewMode === "bySource"
                  ? "bg-blue-500 text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
              style={
                viewMode !== "bySource"
                  ? {
                      background: "var(--bg-secondary)",
                      borderLeft: "1px solid var(--border-glass)",
                    }
                  : { borderLeft: "1px solid var(--border-glass)" }
              }
            >
              По источнику
            </button>
          </div>
        </div>
      </div>

      {/* Citations list */}
      <div className="flex-1 overflow-y-auto">
        {sortedCitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <IconBook size="lg" className="w-12 h-12 text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-400">
              {localSearchQuery ? "Цитаты не найдены" : "Нет цитат"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Используйте кнопку "Цитировать" для добавления
            </p>
          </div>
        ) : viewMode === "all" ? (
          // All citations view
          <div
            className="divide-y"
            style={
              {
                "--tw-divide-opacity": 1,
                borderColor: "var(--border-glass)",
              } as React.CSSProperties
            }
          >
            {sortedCitations.map((citation) => (
              <CitationItem
                key={citation.id}
                citation={citation}
                displayNumber={formatDisplayNumber(citation)}
                isEditingNote={editingNoteId === citation.id}
                noteText={noteText}
                onNoteChange={setNoteText}
                onStartEditNote={() => startEditNote(citation)}
                onSaveNote={() => saveNote(citation.id)}
                onCancelEditNote={cancelEditNote}
                onNavigate={() => handleCitationClick(citation.id)}
                onRemove={
                  onRemoveCitation
                    ? () => onRemoveCitation(citation.id)
                    : undefined
                }
                canEditNote={!!onUpdateCitationNote}
              />
            ))}
          </div>
        ) : (
          // Grouped by source view
          <div
            className="divide-y"
            style={
              {
                "--tw-divide-opacity": 1,
                borderColor: "var(--border-glass)",
              } as React.CSSProperties
            }
          >
            {Array.from(groupedCitations.entries())
              .sort((a, b) => (a[1][0]?.number || 0) - (b[1][0]?.number || 0))
              .map(([dedupeKey, citationInfos]) => {
                const firstInfo = citationInfos[0];
                if (!firstInfo) return null;

                const firstCitation = safeCitations.find(
                  (c) => c.id === firstInfo.citationId,
                );
                if (!firstCitation) return null;

                return (
                  <SourceGroup
                    key={dedupeKey}
                    citations={safeCitations}
                    citationInfos={citationInfos}
                    firstCitation={firstCitation}
                    onNavigate={handleCitationClick}
                    onRemove={onRemoveCitation}
                    onStartEditNote={startEditNote}
                    editingNoteId={editingNoteId}
                    noteText={noteText}
                    onNoteChange={setNoteText}
                    onSaveNote={saveNote}
                    onCancelEditNote={cancelEditNote}
                    canEditNote={!!onUpdateCitationNote}
                  />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// Highlight citation in editor text on hover (sidebar → editor)
function highlightCitationInEditor(citationId: string, highlight: boolean) {
  const els = document.querySelectorAll(
    `.citation-ref[data-citation-id="${citationId}"]`,
  );
  els.forEach((el) => {
    if (highlight) {
      el.classList.add("citation-hover-highlight");
    } else {
      el.classList.remove("citation-hover-highlight");
    }
  });
}

// Citation item component
interface CitationItemProps {
  citation: Citation;
  displayNumber: string;
  isEditingNote: boolean;
  noteText: string;
  onNoteChange: (text: string) => void;
  onStartEditNote: () => void;
  onSaveNote: () => void;
  onCancelEditNote: () => void;
  onNavigate: () => void;
  onRemove?: () => void;
  canEditNote: boolean;
}

function CitationItem({
  citation,
  displayNumber,
  isEditingNote,
  noteText,
  onNoteChange,
  onStartEditNote,
  onSaveNote,
  onCancelEditNote,
  onNavigate,
  onRemove,
  canEditNote,
}: CitationItemProps) {
  return (
    <div
      className="p-3 hover:bg-neutral-50 dark:hover:bg-blue-500/5 transition-colors group"
      data-sidebar-citation-id={citation.id}
      onMouseEnter={() => highlightCitationInEditor(citation.id, true)}
      onMouseLeave={() => highlightCitationInEditor(citation.id, false)}
    >
      <div className="flex items-start gap-2">
        {/* Number badge */}
        <button
          onClick={onNavigate}
          className="shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          title="Go to citation in text"
        >
          [{displayNumber}]
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Authors */}
          {citation.article?.authors && citation.article.authors.length > 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {citation.article.authors.slice(0, 3).join(", ")}
              {citation.article.authors.length > 3 && " et al."}
            </p>
          )}

          {/* Title */}
          <p className="text-sm text-neutral-800 dark:text-neutral-200 line-clamp-2 mt-0.5">
            {citation.article?.title_en || "Untitled"}
          </p>

          {/* Journal & Year */}
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
            {citation.article?.journal && (
              <span className="truncate max-w-37.5">
                {citation.article.journal}
              </span>
            )}
            {citation.article?.year && (
              <span className="shrink-0">{citation.article.year}</span>
            )}
          </div>

          {/* Note */}
          {isEditingNote ? (
            <div className="mt-2">
              <textarea
                value={noteText}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Add quote from text..."
                className={cn(
                  "w-full p-2 text-xs",
                  "bg-neutral-50 dark:bg-[var(--bg-secondary)]",
                  "border border-neutral-200 dark:border-[var(--border-glass)] rounded",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500",
                  "resize-none",
                )}
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={onSaveNote}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEditNote}
                  className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : citation.note ? (
            <p
              onClick={canEditNote ? onStartEditNote : undefined}
              className={cn(
                "mt-2 text-xs text-neutral-600 dark:text-neutral-400 italic",
                "border-l-2 border-neutral-300 dark:border-neutral-600 pl-2",
                canEditNote && "cursor-pointer hover:border-blue-400",
              )}
              title={canEditNote ? "Click to edit" : undefined}
            >
              "{citation.note}"
            </p>
          ) : canEditNote ? (
            <button
              onClick={onStartEditNote}
              className="mt-2 text-xs text-neutral-400 hover:text-blue-500 transition-colors"
            >
              + Add quote...
            </button>
          ) : null}
        </div>

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all"
            title="Remove citation"
          >
            <IconClose size="sm" />
          </button>
        )}
      </div>
    </div>
  );
}

// Source group component for grouped view
interface SourceGroupProps {
  citations: Citation[];
  citationInfos: Array<{
    citationId: string;
    number: number;
    subNumber: number;
  }>;
  firstCitation: Citation;
  onNavigate: (id: string) => void;
  onRemove?: (id: string) => void;
  onStartEditNote: (citation: Citation) => void;
  editingNoteId: string | null;
  noteText: string;
  onNoteChange: (text: string) => void;
  onSaveNote: (id: string) => void;
  onCancelEditNote: () => void;
  canEditNote: boolean;
}

function SourceGroup({
  citations,
  citationInfos,
  firstCitation,
  onNavigate,
  onRemove,
  onStartEditNote,
  editingNoteId,
  noteText,
  onNoteChange,
  onSaveNote,
  onCancelEditNote,
  canEditNote,
}: SourceGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inlineNumber = citationInfos[0]?.number || 1;

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: "var(--border-glass)" }}
    >
      {/* Source header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left hover:bg-blue-500/5 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
            [{inlineNumber}]
          </span>

          <div className="flex-1 min-w-0">
            {firstCitation.article?.authors &&
              firstCitation.article.authors.length > 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {firstCitation.article.authors.slice(0, 3).join(", ")}
                  {firstCitation.article.authors.length > 3 && " et al."}
                </p>
              )}
            <p className="text-sm text-neutral-800 dark:text-neutral-200 line-clamp-2">
              {firstCitation.article?.title_en || "Untitled"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {citationInfos.length > 1 && (
              <span className="text-xs text-neutral-400">
                x{citationInfos.length}
              </span>
            )}
            <IconChevronDown
              size="sm"
              className={cn(
                "text-neutral-400 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </div>
        </div>
      </button>

      {/* Expanded citations */}
      {isExpanded && (
        <div className="pl-10 pr-3 pb-3 space-y-2">
          {citationInfos.map((info) => {
            const citation = citations.find((c) => c.id === info.citationId);
            if (!citation) return null;

            const isEditing = editingNoteId === citation.id;

            return (
              <div
                key={citation.id}
                className="flex items-start gap-2 p-2 rounded"
                style={{ background: "var(--bg-secondary)" }}
                data-sidebar-citation-id={citation.id}
                onMouseEnter={() =>
                  highlightCitationInEditor(citation.id, true)
                }
                onMouseLeave={() =>
                  highlightCitationInEditor(citation.id, false)
                }
              >
                <button
                  onClick={() => onNavigate(citation.id)}
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  #{info.subNumber}
                </button>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div>
                      <textarea
                        value={noteText}
                        onChange={(e) => onNoteChange(e.target.value)}
                        placeholder="Add quote..."
                        className={cn(
                          "w-full p-2 text-xs",
                          "bg-white dark:bg-[var(--bg-primary)]",
                          "border border-neutral-200 dark:border-[var(--border-glass)] rounded",
                          "focus:outline-none focus:ring-1 focus:ring-blue-500",
                          "resize-none",
                        )}
                        rows={2}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => onSaveNote(citation.id)}
                          className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={onCancelEditNote}
                          className="px-2 py-0.5 text-xs text-neutral-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : citation.note ? (
                    <p
                      onClick={
                        canEditNote
                          ? () => onStartEditNote(citation)
                          : undefined
                      }
                      className={cn(
                        "text-xs text-neutral-600 dark:text-neutral-400 italic",
                        canEditNote &&
                          "cursor-pointer hover:text-neutral-800 dark:hover:text-neutral-200",
                      )}
                    >
                      "{citation.note}"
                    </p>
                  ) : (
                    canEditNote && (
                      <button
                        onClick={() => onStartEditNote(citation)}
                        className="text-xs text-neutral-400 hover:text-blue-500"
                      >
                        + Add quote
                      </button>
                    )
                  )}
                </div>

                {onRemove && (
                  <button
                    onClick={() => onRemove(citation.id)}
                    className="p-1 text-neutral-400 hover:text-red-500"
                  >
                    <IconClose size="sm" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
