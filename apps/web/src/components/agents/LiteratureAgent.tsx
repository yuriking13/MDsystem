/**
 * LiteratureAgent - Поиск и анализ научной литературы
 * Специализированный агент для работы с академическими источниками
 */

import React, { useState, useEffect, useRef } from "react";
import { useAgentWindow } from "../AgentWindow";
import AgentWindow from "../AgentWindow";
import AgentCoordinator from "../../services/AgentCoordinator";

type SearchResult = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  journal: string;
  doi?: string;
  url?: string;
  relevanceScore: number;
  tags: string[];
  citationCount: number;
};

type SearchFilters = {
  years: { from: number; to: number };
  journals: string[];
  authors: string[];
  keywords: string[];
  minCitations: number;
  language: string;
};

type Props = {
  agentId?: string;
  onArticleSelect?: (article: SearchResult) => void;
  initialQuery?: string;
};

export default function LiteratureAgent({
  agentId = "literature-agent",
  onArticleSelect,
  initialQuery = "",
}: Props) {
  const { isOpen, openWindow, closeWindow } = useAgentWindow(
    agentId,
    "literature",
    "Literature Research Agent",
  );

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<SearchResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    years: { from: 2020, to: new Date().getFullYear() },
    journals: [],
    authors: [],
    keywords: [],
    minCitations: 0,
    language: "en",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<
    "search" | "analyze" | "compare"
  >("search");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when window opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Report agent status to coordinator
  useEffect(() => {
    if (isLoading) {
      AgentCoordinator.updateAgentStatus(
        agentId,
        "busy",
        "Searching literature",
      );
    } else {
      AgentCoordinator.updateAgentStatus(agentId, "idle");
    }
  }, [isLoading, agentId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    AgentCoordinator.updateAgentStatus(
      agentId,
      "active",
      `Searching: ${searchQuery}`,
    );

    try {
      // Add to search history
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory((prev) => [searchQuery, ...prev.slice(0, 9)]);
      }

      // Simulate API call - replace with actual literature search API
      await simulateLiteratureSearch(searchQuery, filters);

      AgentCoordinator.reportTaskCompleted(
        agentId,
        Date.now() - performance.now(),
        true,
      );
    } catch (error) {
      console.error("Literature search failed:", error);
      AgentCoordinator.reportTaskCompleted(
        agentId,
        Date.now() - performance.now(),
        false,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const simulateLiteratureSearch = async (
    query: string,
    filters: SearchFilters,
  ): Promise<void> => {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 1500 + Math.random() * 1000),
    );

    // Mock search results
    const mockResults: SearchResult[] = [
      {
        id: "1",
        title: `Advanced Analysis of ${query} in Modern Research`,
        authors: ["Dr. Jane Smith", "Prof. John Doe"],
        abstract: `This paper presents a comprehensive study on ${query} using novel methodologies. Our findings demonstrate significant improvements in research outcomes through innovative approaches...`,
        year: 2023,
        journal: "Nature Research",
        doi: "10.1038/s41586-023-06234-6",
        url: "https://example.com/article1",
        relevanceScore: 95,
        tags: ["methodology", "innovation", query.toLowerCase()],
        citationCount: 247,
      },
      {
        id: "2",
        title: `Systematic Review: ${query} Applications`,
        authors: ["Dr. Maria Garcia", "Dr. Ahmed Hassan", "Prof. Lisa Chen"],
        abstract: `A systematic review of current applications and future prospects of ${query}. This meta-analysis covers 150 studies across multiple disciplines...`,
        year: 2023,
        journal: "Science Advances",
        doi: "10.1126/sciadv.abcd1234",
        relevanceScore: 89,
        tags: ["systematic-review", "meta-analysis", query.toLowerCase()],
        citationCount: 156,
      },
      {
        id: "3",
        title: `Emerging Trends in ${query} Research`,
        authors: ["Dr. Robert Kim"],
        abstract: `This study identifies emerging trends and future directions in ${query} research through bibliometric analysis and expert surveys...`,
        year: 2024,
        journal: "Research Trends Quarterly",
        relevanceScore: 78,
        tags: ["trends", "bibliometrics", query.toLowerCase()],
        citationCount: 43,
      },
    ];

    setSearchResults(mockResults);
  };

  const handleArticleSelect = (article: SearchResult) => {
    setSelectedArticle(article);
    onArticleSelect?.(article);

    // Notify other agents
    AgentCoordinator.broadcastMessage(agentId, "notification", {
      type: "article-selected",
      article: {
        title: article.title,
        authors: article.authors,
        year: article.year,
        doi: article.doi,
      },
    });
  };

  const handleAnalyzeArticle = async (article: SearchResult) => {
    setAnalysisMode("analyze");
    setIsLoading(true);

    try {
      AgentCoordinator.updateAgentStatus(
        agentId,
        "active",
        `Analyzing: ${article.title}`,
      );

      // Simulate analysis
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Send analysis to Writing Agent
      AgentCoordinator.sendMessage(agentId, "writing-agent", "request", {
        type: "analysis-result",
        article,
        analysis: {
          methodology: "Quantitative approach with statistical validation",
          findings: "Significant correlation found between variables",
          limitations: "Limited sample size, geographical bias",
          relevance: "Highly relevant for current research objectives",
        },
      });

      AgentCoordinator.reportTaskCompleted(
        agentId,
        Date.now() - performance.now(),
        true,
      );
    } catch (error) {
      AgentCoordinator.reportTaskCompleted(
        agentId,
        Date.now() - performance.now(),
        false,
      );
    } finally {
      setIsLoading(false);
      setAnalysisMode("search");
    }
  };

  const clearFilters = () => {
    setFilters({
      years: { from: 2020, to: new Date().getFullYear() },
      journals: [],
      authors: [],
      keywords: [],
      minCitations: 0,
      language: "en",
    });
  };

  const windowContent = (
    <div className="flex flex-col h-full">
      {/* Search Section */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-2 mb-3">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search scientific literature..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Search
              </div>
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 mb-3">
          {(["search", "analyze", "compare"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setAnalysisMode(mode)}
              className={`px-3 py-1 rounded text-sm capitalize ${
                analysisMode === mode
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
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
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
              />
            </svg>
            Filters
          </button>

          {searchHistory.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && setSearchQuery(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Recent searches</option>
              {searchHistory.map((query, index) => (
                <option key={index} value={query}>
                  {query.length > 30 ? `${query.substring(0, 30)}...` : query}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block font-medium mb-1">Year Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.years.from}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        years: {
                          ...prev.years,
                          from: parseInt(e.target.value) || 2020,
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                  <span className="self-center">-</span>
                  <input
                    type="number"
                    value={filters.years.to}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        years: {
                          ...prev.years,
                          to:
                            parseInt(e.target.value) ||
                            new Date().getFullYear(),
                        },
                      }))
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Min Citations</label>
                <input
                  type="number"
                  value={filters.minCitations}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minCitations: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                  min="0"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-auto">
        {searchResults.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <p>Start searching for literature</p>
              <p className="text-sm">Enter keywords, authors, or topics</p>
            </div>
          </div>
        )}

        {searchResults.map((article) => (
          <div
            key={article.id}
            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
              selectedArticle?.id === article.id
                ? "bg-blue-50 border-l-4 border-l-blue-500"
                : ""
            }`}
            onClick={() => handleArticleSelect(article)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm text-gray-900 leading-tight">
                {article.title}
              </h3>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  {article.relevanceScore}%
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnalyzeArticle(article);
                  }}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  disabled={isLoading}
                >
                  Analyze
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-600 mb-2">
              <span className="font-medium">{article.authors.join(", ")}</span>
              <span className="mx-2">•</span>
              <span>
                {article.journal} ({article.year})
              </span>
              <span className="mx-2">•</span>
              <span>{article.citationCount} citations</span>
            </div>

            <p className="text-xs text-gray-700 mb-2 leading-relaxed">
              {article.abstract}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {article.doi && (
                <a
                  href={`https://doi.org/${article.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  DOI: {article.doi}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            {analysisMode === "analyze"
              ? "Analyzing article..."
              : "Searching literature..."}
          </div>
        ) : (
          <div className="flex justify-between">
            <span>
              {searchResults.length} articles found
              {selectedArticle &&
                ` • Selected: ${selectedArticle.title.substring(0, 40)}...`}
            </span>
            <span>Literature Agent v1.0</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <AgentWindow
        agentId={agentId}
        agentType="literature"
        title="Literature Research Agent"
        isOpen={isOpen}
        onClose={closeWindow}
        minWidth={400}
        minHeight={500}
        maxWidth={700}
        maxHeight={800}
      >
        {windowContent}
      </AgentWindow>

      {/* External trigger button when closed */}
      {!isOpen && (
        <button
          onClick={openWindow}
          className="fixed bottom-4 left-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 z-50"
          title="Open Literature Agent"
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </button>
      )}
    </>
  );
}
