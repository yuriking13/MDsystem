import React, { useState, useCallback } from "react";
import { cn } from "../../design-system/utils/cn";
import DocumentOutlineNew, { type Heading } from "./DocumentOutlineNew";
import BibliographySidebarNew from "./BibliographySidebarNew";
import EditorStatusBar from "./EditorStatusBar";
import type { Citation } from "../../lib/api";
import { IconList, IconBook } from "../FlowbiteIcons";

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
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{ background: "var(--bg-primary)" }}
        >
          {/* Toggle buttons when sidebars are hidden */}
          {(!showOutline || !showBibliography) && (
            <div className="editor-header" style={{ padding: "4px 12px" }}>
              {/* Left toggle (outline) */}
              {!showOutline ? (
                <button
                  onClick={handleToggleOutline}
                  className="editor-header-btn"
                  title="Оглавление (Ctrl+\\)"
                >
                  <IconList size="sm" />
                  Оглавление
                </button>
              ) : (
                <div />
              )}

              {/* Right toggle (bibliography) */}
              {!showBibliography ? (
                <button
                  onClick={handleToggleBibliography}
                  className="editor-header-btn"
                  title="Библиография (Ctrl+])"
                >
                  <IconBook size="sm" />
                  Библиография ({citations.length})
                </button>
              ) : (
                <div />
              )}
            </div>
          )}

          {/* Editor content - scrollable area */}
          <div className="flex-1 overflow-y-auto">{children}</div>
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
