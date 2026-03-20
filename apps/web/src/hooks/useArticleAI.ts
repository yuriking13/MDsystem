/**
 * useArticleAI - Hook for easy ArticleAI modal integration
 * Provides simplified state management and actions
 */

import { useState, useCallback } from "react";
import AgentCoordinator from "../services/AgentCoordinator";

export function useArticleAI() {
  const [isOpen, setIsOpen] = useState(false);
  const agentId = "article-ai-literature";

  const openModal = useCallback(() => {
    AgentCoordinator.updateAgentStatus(
      agentId,
      "active",
      "Opening AI Помощник",
    );
    setIsOpen(true);
  }, [agentId]);

  const closeModal = useCallback(() => {
    AgentCoordinator.updateAgentStatus(agentId, "idle");
    setIsOpen(false);
  }, [agentId]);

  const toggleModal = useCallback(() => {
    if (isOpen) {
      closeModal();
    } else {
      openModal();
    }
  }, [isOpen, closeModal, openModal]);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
}

// Legacy compatibility
export function useLegacyArticleAISidebar(_selectedArticles: unknown[] = []) {
  const { isOpen, openModal, closeModal, toggleModal } = useArticleAI();

  return {
    isOpen,
    toggle: toggleModal,
    close: closeModal,
    open: openModal,
    selectedCount: _selectedArticles.length,
  };
}
