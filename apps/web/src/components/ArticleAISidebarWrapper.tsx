/**
 * ArticleAISidebarWrapper - Updated to use new ArticleAIModal
 * Maintains backward compatibility while providing enhanced modal functionality
 */

import React from "react";
import ArticleAIModal from "./ArticleAIModal";

type Article = {
  id: string;
  title: string;
  authors?: string[];
  abstract?: string;
  doi?: string;
  url?: string;
};

type Props = {
  projectId?: string;
  projectName?: string;
  viewStatus?: "candidate" | "selected" | "excluded" | "deleted" | "all";
  candidateCount?: number;
  selectedArticlesCount?: number;
  onAddToSelected?: (articleIds: string[]) => void;
  onHighlightArticle?: (articleId: string) => void;
  className?: string;
  // Legacy props for backward compatibility
  selectedArticles?: Article[];
  onArticleSelect?: (article: Article) => void;
};

export default function ArticleAISidebarWrapper({
  projectId,
  projectName,
  viewStatus = "candidate",
  candidateCount = 0,
  selectedArticlesCount,
  onAddToSelected,
  onHighlightArticle,
  className: _className = "",
  // Legacy props
  selectedArticles = [],
  onArticleSelect: _onArticleSelect,
}: Props) {
  // Convert legacy selectedArticles count if provided
  const articlesCount =
    selectedArticlesCount ?? selectedArticles.length ?? candidateCount;

  return (
    <ArticleAIModal
      projectId={projectId}
      projectName={projectName}
      viewStatus={viewStatus}
      candidateCount={candidateCount}
      selectedArticlesCount={articlesCount}
      onAddToSelected={onAddToSelected}
      onHighlightArticle={onHighlightArticle}
    />
  );
}

// ============================================================================
// Legacy Support Hook
// ============================================================================

export function useLegacyArticleAISidebar(selectedArticles: Article[] = []) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return {
    isOpen,
    toggle,
    close,
    open,
    selectedCount: selectedArticles.length,
  };
}
