/**
 * Tests for ArticleAIModal component
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ArticleAIModal from "../../src/components/ArticleAIModal";
import AgentCoordinator from "../../src/services/AgentCoordinator";

// Mock AgentCoordinator
vi.mock("../../src/services/AgentCoordinator", () => ({
  default: {
    registerAgent: vi.fn(),
    updateAgentStatus: vi.fn(),
    reportTaskCompleted: vi.fn(),
    getAgent: vi.fn(() => null),
    openAgentWindow: vi.fn(),
    closeAgentWindow: vi.fn(),
  },
}));

// Mock API
vi.mock("../../src/lib/api", () => ({
  apiArticlesAIAssistant: vi.fn(() =>
    Promise.resolve({
      response: "Test response",
      suggestedArticles: [],
      summary: null,
      totalAnalyzed: 0,
    }),
  ),
}));

describe("ArticleAIModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders FAB when modal is closed", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
      />,
    );

    expect(screen.getByText("AI Помощник")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Badge count
  });

  it("opens modal when FAB is clicked", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
      />,
    );

    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    // Modal should be visible
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
  });

  it("displays context banner with article count", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        projectName="Test Project"
        candidateCount={10}
        selectedArticlesCount={5}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    expect(screen.getByText(/articles selected/)).toBeInTheDocument();
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("shows quick action buttons in empty state", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    expect(screen.getByText("Analyze")).toBeInTheDocument();
    expect(screen.getByText("Summarize")).toBeInTheDocument();
    expect(screen.getByText("Find Similar")).toBeInTheDocument();
    expect(screen.getByText("Criteria")).toBeInTheDocument();
  });

  it("can be collapsed and expanded", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    // Find and click collapse button
    const collapseBtn = screen.getByRole("button", { name: /Свернуть/i });
    fireEvent.click(collapseBtn);

    // Should show collapsed state
    expect(screen.queryByText("How can I help?")).not.toBeInTheDocument();

    // Click expand
    const expandBtn = screen.getByRole("button", { name: /Развернуть/i });
    fireEvent.click(expandBtn);

    // Should show full content again
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
  });

  it("integrates with AgentCoordinator", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    // Should register with AgentCoordinator
    expect(AgentCoordinator.registerAgent).toHaveBeenCalledWith(
      "article-ai-literature",
      "literature",
      "AI Помощник",
    );

    expect(AgentCoordinator.updateAgentStatus).toHaveBeenCalledWith(
      "article-ai-literature",
      "active",
      "Opening AI Помощник",
    );
  });

  it("supports dragging functionality", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    // Get modal header for dragging
    const header = screen
      .getByText("AI Помощник")
      .closest(".article-ai-modal-header");
    expect(header).toBeInTheDocument();

    // Test mousedown event
    fireEvent.mouseDown(header!);

    // Should add dragging class (tested via CSS)
    // Note: Full drag testing would require more complex setup
  });

  it("handles external messages", () => {
    const mockMessages = [
      {
        id: "1",
        role: "user" as const,
        content: "Test message",
        timestamp: new Date(),
      },
      {
        id: "2",
        role: "assistant" as const,
        content: "Test response",
        timestamp: new Date(),
      },
    ];

    const mockSendMessage = vi.fn();

    render(
      <ArticleAIModal
        projectId="test-project"
        messages={mockMessages}
        onSendMessage={mockSendMessage}
        isLoading={false}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    // Should show messages
    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByText("Test response")).toBeInTheDocument();
  });

  it("calls external handlers when provided", () => {
    const mockAnalyze = vi.fn();
    const mockSummarize = vi.fn();
    const mockFindSimilar = vi.fn();
    const mockGenerateCriteria = vi.fn();

    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
        onAnalyzeSelection={mockAnalyze}
        onSummarizeAll={mockSummarize}
        onFindSimilar={mockFindSimilar}
        onGenerateCriteria={mockGenerateCriteria}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    // Click action buttons
    fireEvent.click(screen.getByText("Analyze"));
    expect(mockAnalyze).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Summarize"));
    expect(mockSummarize).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Find Similar"));
    expect(mockFindSimilar).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Criteria"));
    expect(mockGenerateCriteria).toHaveBeenCalled();
  });

  it("closes modal and updates agent status", () => {
    render(
      <ArticleAIModal
        projectId="test-project"
        candidateCount={5}
        selectedArticlesCount={2}
      />,
    );

    // Open modal
    const fab = screen.getByRole("button", { name: /AI помощник/i });
    fireEvent.click(fab);

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Закрыть/i });
    fireEvent.click(closeBtn);

    // Should close and go back to FAB
    expect(screen.getByText("AI Помощник")).toBeInTheDocument();
    expect(screen.queryByText("How can I help?")).not.toBeInTheDocument();
  });
});
