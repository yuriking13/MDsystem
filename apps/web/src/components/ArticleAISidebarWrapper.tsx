/**
 * ArticleAISidebarWrapper - Обертка для интеграции AgentWindow с существующим ArticleAISidebar
 * Обеспечивает плавный переход от старой системы к новой без потери функциональности
 */

import React, { useState, useRef } from "react";
import AgentWindow, { useAgentWindow } from "./AgentWindow";
import AgentCoordinator, { AgentType } from "../services/AgentCoordinator";

// Import the original ArticleAISidebar component
// This assumes the original component exists
type Article = {
  id: string;
  title: string;
  authors?: string[];
  abstract?: string;
  doi?: string;
  url?: string;
};

type OriginalArticleAISidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  selectedArticles: Article[];
  onArticleSelect: (article: Article) => void;
  // Add other props as needed based on the original component
};

// Mock the original component for now - replace with actual import
const OriginalArticleAISidebar: React.FC<OriginalArticleAISidebarProps> = (
  props,
) => {
  return (
    <div className="p-4 h-full bg-white">
      <h2 className="text-lg font-semibold mb-4">Article AI Assistant</h2>
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Selected articles: {props.selectedArticles.length}
        </div>
        {/* Original sidebar content goes here */}
        <div className="space-y-2">
          <button className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Analyze Articles
          </button>
          <button className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600">
            Generate Summary
          </button>
          <button className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600">
            Extract Citations
          </button>
        </div>
      </div>
    </div>
  );
};

type Props = {
  selectedArticles: Article[];
  onArticleSelect: (article: Article) => void;
  className?: string;
  agentType?: AgentType;
  agentTitle?: string;
};

export default function ArticleAISidebarWrapper({
  selectedArticles,
  onArticleSelect,
  className = "",
  agentType = "literature",
  agentTitle = "Article AI Assistant",
}: Props) {
  const agentId = `article-ai-${agentType}`;
  const { isOpen, openWindow, closeWindow } = useAgentWindow(
    agentId,
    agentType,
    agentTitle,
  );

  // Track performance metrics
  const startTimeRef = useRef<number>(0);

  const handleOpenAgent = () => {
    startTimeRef.current = Date.now();
    AgentCoordinator.updateAgentStatus(
      agentId,
      "active",
      "Analyzing selected articles",
    );
    openWindow();
  };

  const handleCloseAgent = () => {
    if (startTimeRef.current > 0) {
      const responseTime = Date.now() - startTimeRef.current;
      AgentCoordinator.reportTaskCompleted(agentId, responseTime, true);
      startTimeRef.current = 0;
    }
    closeWindow();
  };

  const handleTaskStart = (taskName: string) => {
    startTimeRef.current = Date.now();
    AgentCoordinator.updateAgentStatus(agentId, "busy", taskName);
  };

  const handleTaskComplete = (success: boolean = true) => {
    if (startTimeRef.current > 0) {
      const responseTime = Date.now() - startTimeRef.current;
      AgentCoordinator.reportTaskCompleted(agentId, responseTime, success);
      startTimeRef.current = 0;
    }
    AgentCoordinator.updateAgentStatus(agentId, "idle");
  };

  return (
    <>
      {/* Floating Action Button - replaces the old sidebar trigger */}
      <button
        onClick={handleOpenAgent}
        className={`
          fixed bottom-6 right-6 z-40
          w-14 h-14 bg-blue-600 hover:bg-blue-700 
          text-white rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-200 hover:scale-110
          ${className}
        `}
        title="Open Article AI Assistant"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>

        {/* Badge for selected articles count */}
        {selectedArticles.length > 0 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center border-2 border-white">
            {selectedArticles.length}
          </div>
        )}
      </button>

      {/* Agent Window */}
      <AgentWindow
        agentId={agentId}
        agentType={agentType}
        title={agentTitle}
        isOpen={isOpen}
        onClose={handleCloseAgent}
        minWidth={450}
        minHeight={600}
        maxWidth={800}
        maxHeight={900}
        className="font-sans"
      >
        {/* Enhanced version of original sidebar content */}
        <div className="flex flex-col h-full">
          {/* Header with context info */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                Active Session
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Selected: {selectedArticles.length} articles
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto">
            <OriginalArticleAISidebar
              isOpen={isOpen}
              onToggle={() => {}} // Not used in modal mode
              selectedArticles={selectedArticles}
              onArticleSelect={onArticleSelect}
            />
          </div>

          {/* Enhanced action bar */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  handleTaskStart("Deep Analysis");
                  // Simulate task completion after delay
                  setTimeout(() => handleTaskComplete(true), 2000);
                }}
                className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Deep Analysis
              </button>

              <button
                onClick={() => {
                  handleTaskStart("Generate Insights");
                  setTimeout(() => handleTaskComplete(true), 3000);
                }}
                className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                Generate Insights
              </button>

              <button
                onClick={() => {
                  handleTaskStart("Cross-Reference");
                  setTimeout(() => handleTaskComplete(true), 1500);
                }}
                className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
              >
                Cross-Reference
              </button>

              <button
                onClick={() => {
                  handleTaskStart("Export Results");
                  setTimeout(() => handleTaskComplete(true), 1000);
                }}
                className="px-3 py-2 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 transition-colors"
              >
                Export Results
              </button>
            </div>

            {/* Performance indicator */}
            <div className="mt-3 text-xs text-gray-500 text-center">
              Agent Status:{" "}
              <span className="font-medium text-blue-600">Ready</span>
            </div>
          </div>
        </div>
      </AgentWindow>
    </>
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
