import React, { useState, useCallback } from "react";
import { cn } from "../../design-system/utils/cn";
import DocumentOutlineNew, { type Heading } from "./DocumentOutlineNew";
import BibliographySidebarNew from "./BibliographySidebarNew";
import EditorStatusBar from "./EditorStatusBar";
import type { Citation } from "../../lib/api";

interface EditorLayoutWrapperProps {
  /** Document headings for outline */
  headings: Heading[];
  /** Callback when heading is clicked for navigation */
  onNavigateToHeading: (id: string) => void;
  /** Currently active heading ID (for scroll sync) */
  activeHeadingId?: string;
  /** Citations for bibliography */
  citations: Citation[];
  /** Callback to remove citation */
  onRemoveCitation?: (citationId: string) => void;
  /** Callback to update citation note */
  onUpdateCitationNote?: (citationId: string, note: string) => void;
  /** Word count */
  wordCount: number;
  /** Word count goal */
  wordCountGoal?: number;
  /** Character count */
  characterCount: number;
  /** Page count */
  pageCount?: number;
  /** Whether saving */
  isSaving?: boolean;
  /** Last saved timestamp */
  lastSaved?: Date | null;
  /** Whether bibliography is updating */
  isUpdatingBibliography?: boolean;
  /** Editor content (children) */
  children: React.ReactNode;
  /** Initial outline visibility */
  showOutline?: boolean;
  /** Initial bibliography visibility */
  showBibliography?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * EditorLayoutWrapper - Three-panel layout for document editor
 *
 * Layout:
 * - Left sidebar: Document outline (collapsible)
 * - Center: Editor content
 * - Right sidebar: Bibliography (collapsible)
 * - Bottom: Status bar
 *
 * Features:
 * - Collapsible sidebars with smooth transitions
 * - Responsive behavior
 * - Keyboard shortcuts
 */
export default function EditorLayoutWrapper({
  headings,
  onNavigateToHeading,
  activeHeadingId,
  citations,
  onRemoveCitation,
  onUpdateCitationNote,
  wordCount,
  wordCountGoal,
  characterCount,
  pageCount,
  isSaving,
  lastSaved,
  isUpdatingBibliography,
  children,
  showOutline: initialShowOutline = true,
  showBibliography: initialShowBibliography = true,
  className,
}: EditorLayoutWrapperProps) {
  const [showOutline, setShowOutline] = useState(initialShowOutline);
  const [isOutlineCollapsed, setIsOutlineCollapsed] = useState(false);
  const [showBibliography, setShowBibliography] = useState(
    initialShowBibliography,
  );
  const [isBibliographyCollapsed, setIsBibliographyCollapsed] = useState(false);

  // Toggle handlers
  const handleToggleOutline = useCallback(() => {
    setShowOutline((prev) => !prev);
  }, []);

  const handleToggleOutlineCollapse = useCallback(() => {
    setIsOutlineCollapsed((prev) => !prev);
  }, []);

  const handleToggleBibliography = useCallback(() => {
    setShowBibliography((prev) => !prev);
  }, []);

  const handleToggleBibliographyCollapse = useCallback(() => {
    setIsBibliographyCollapsed((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + \ = Toggle outline
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        handleToggleOutline();
      }
      // Cmd/Ctrl + ] = Toggle bibliography
      if ((e.metaKey || e.ctrlKey) && e.key === "]") {
        e.preventDefault();
        handleToggleBibliography();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggleOutline, handleToggleBibliography]);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Main content area with sidebars */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Outline */}
        {showOutline && (
          <DocumentOutlineNew
            headings={headings}
            onNavigate={onNavigateToHeading}
            onClose={handleToggleOutline}
            activeHeadingId={activeHeadingId}
            isCollapsed={isOutlineCollapsed}
            onToggleCollapse={handleToggleOutlineCollapse}
          />
        )}

        {/* Center: Editor */}
        <main
          className={cn(
            "flex-1 flex flex-col min-w-0 overflow-hidden",
            "bg-neutral-950",
          )}
        >
          {/* Toggle buttons when sidebars are hidden */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-800 bg-neutral-900/80">
            {/* Left toggle (outline) */}
            {!showOutline && (
              <button
                onClick={handleToggleOutline}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 text-xs",
                  "text-neutral-500 hover:text-neutral-300",
                  "hover:bg-neutral-800 rounded-lg transition-colors",
                )}
                title="Оглавление (Ctrl+\\)"
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
                    d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                Оглавление
              </button>
            )}

            {showOutline && <div />}

            {/* Right toggle (bibliography) */}
            {!showBibliography && (
              <button
                onClick={handleToggleBibliography}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 text-xs",
                  "text-neutral-500 hover:text-neutral-300",
                  "hover:bg-neutral-800 rounded-lg transition-colors",
                )}
                title="Библиография (Ctrl+])"
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
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
                Библиография ({citations.length})
              </button>
            )}

            {showBibliography && <div />}
          </div>

          {/* Editor content - scrollable area */}
          <div className="flex-1 overflow-y-auto">
            <div
              className={cn(
                "max-w-4xl mx-auto my-8",
                "bg-neutral-900",
                "shadow-xl shadow-black/30",
                "rounded-xl",
                "min-h-[calc(100vh-200px)]",
              )}
            >
              {children}
            </div>
          </div>
        </main>

        {/* Right sidebar: Bibliography */}
        {showBibliography && (
          <BibliographySidebarNew
            citations={citations}
            onClose={handleToggleBibliography}
            onRemoveCitation={onRemoveCitation}
            onUpdateCitationNote={onUpdateCitationNote}
            isCollapsed={isBibliographyCollapsed}
            onToggleCollapse={handleToggleBibliographyCollapse}
          />
        )}
      </div>

      {/* Bottom: Status bar */}
      <EditorStatusBar
        wordCount={wordCount}
        wordCountGoal={wordCountGoal}
        characterCount={characterCount}
        pageCount={pageCount}
        isSaving={isSaving}
        lastSaved={lastSaved}
        isUpdatingBibliography={isUpdatingBibliography}
        citationCount={citations.length}
      />
    </div>
  );
}

// Export sub-components for flexible usage
export { DocumentOutlineNew, BibliographySidebarNew, EditorStatusBar };
