import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArticleAISidebar from "../../src/components/ArticleAISidebar";

const mockMessages = [
  {
    id: "1",
    role: "user" as const,
    content: "What are the main findings of the selected articles?",
    timestamp: new Date("2024-01-15T10:30:00"),
    status: "sent" as const,
  },
  {
    id: "2",
    role: "assistant" as const,
    content:
      "Based on my analysis of the 5 selected articles, the main findings are:\n\n1. Metformin shows significant efficacy in reducing HbA1c levels\n2. Treatment duration of 12+ weeks shows better outcomes\n3. Combination therapy is more effective than monotherapy",
    timestamp: new Date("2024-01-15T10:30:15"),
  },
];

const defaultProps = {
  isOpen: true,
  onToggle: vi.fn(),
  onClose: vi.fn(),
  messages: [],
  onSendMessage: vi.fn(),
  isLoading: false,
  selectedArticlesCount: 0,
  projectName: "Diabetes Research",
};

describe("ArticleAISidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("When closed", () => {
    it("renders floating button when closed", () => {
      render(<ArticleAISidebar {...defaultProps} isOpen={false} />);

      expect(screen.getByText("MD Assistant")).toBeInTheDocument();
    });

    it("shows selected count on floating button", () => {
      render(
        <ArticleAISidebar
          {...defaultProps}
          isOpen={false}
          selectedArticlesCount={5}
        />,
      );

      expect(screen.getByText("5 selected")).toBeInTheDocument();
    });

    it("calls onToggle when floating button is clicked", async () => {
      const user = userEvent.setup();
      render(<ArticleAISidebar {...defaultProps} isOpen={false} />);

      await user.click(screen.getByText("MD Assistant"));
      expect(defaultProps.onToggle).toHaveBeenCalled();
    });
  });

  describe("When open", () => {
    it("renders the sidebar header", () => {
      render(<ArticleAISidebar {...defaultProps} />);

      expect(screen.getByText("MD Assistant")).toBeInTheDocument();
      expect(
        screen.getByText("AI-powered research helper"),
      ).toBeInTheDocument();
    });

    it("displays context banner when articles are selected", () => {
      render(<ArticleAISidebar {...defaultProps} selectedArticlesCount={5} />);

      expect(screen.getByText(/5/)).toBeInTheDocument();
      expect(screen.getByText(/articles selected/)).toBeInTheDocument();
      expect(screen.getByText(/Diabetes Research/)).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<ArticleAISidebar {...defaultProps} />);

      // Find the close button (ChevronRightIcon button)
      const closeButton = screen.getByRole("button", { name: "" });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Empty state", () => {
    it("shows welcome message when no messages", () => {
      render(<ArticleAISidebar {...defaultProps} />);

      expect(screen.getByText("How can I help?")).toBeInTheDocument();
      expect(
        screen.getByText(/Ask questions about your articles/),
      ).toBeInTheDocument();
    });

    it("displays quick action buttons", () => {
      render(<ArticleAISidebar {...defaultProps} />);

      expect(screen.getByText("Analyze")).toBeInTheDocument();
      expect(screen.getByText("Summarize")).toBeInTheDocument();
      expect(screen.getByText("Find Similar")).toBeInTheDocument();
      expect(screen.getByText("Criteria")).toBeInTheDocument();
    });

    it("disables analyze and find similar when no articles selected", () => {
      render(<ArticleAISidebar {...defaultProps} selectedArticlesCount={0} />);

      const analyzeButton = screen.getByText("Analyze").closest("button");
      const findSimilarButton = screen
        .getByText("Find Similar")
        .closest("button");

      expect(analyzeButton).toBeDisabled();
      expect(findSimilarButton).toBeDisabled();
    });

    it("enables analyze and find similar when articles are selected", () => {
      render(<ArticleAISidebar {...defaultProps} selectedArticlesCount={3} />);

      const analyzeButton = screen.getByText("Analyze").closest("button");
      const findSimilarButton = screen
        .getByText("Find Similar")
        .closest("button");

      expect(analyzeButton).not.toBeDisabled();
      expect(findSimilarButton).not.toBeDisabled();
    });

    it("displays suggested actions", () => {
      render(<ArticleAISidebar {...defaultProps} />);

      expect(screen.getByText("Analyze selected articles")).toBeInTheDocument();
      expect(screen.getByText("Summarize abstracts")).toBeInTheDocument();
      expect(
        screen.getByText("Suggest inclusion criteria"),
      ).toBeInTheDocument();
      expect(screen.getByText("Find similar articles")).toBeInTheDocument();
    });
  });

  describe("Messages", () => {
    it("renders user messages", () => {
      render(<ArticleAISidebar {...defaultProps} messages={mockMessages} />);

      expect(
        screen.getByText(
          "What are the main findings of the selected articles?",
        ),
      ).toBeInTheDocument();
    });

    it("renders assistant messages", () => {
      render(<ArticleAISidebar {...defaultProps} messages={mockMessages} />);

      expect(
        screen.getByText(/Based on my analysis of the 5 selected articles/),
      ).toBeInTheDocument();
    });

    it("shows message timestamps", () => {
      render(<ArticleAISidebar {...defaultProps} messages={mockMessages} />);

      // Check for time format (10:30)
      expect(screen.getAllByText(/10:30/).length).toBeGreaterThan(0);
    });

    it("shows loading indicator when isLoading", () => {
      render(
        <ArticleAISidebar
          {...defaultProps}
          messages={mockMessages}
          isLoading
        />,
      );

      // Check for loading dots (animate-bounce elements)
      const loadingDots = document.querySelectorAll(".animate-bounce");
      expect(loadingDots.length).toBe(3);
    });
  });

  describe("Input", () => {
    it("renders input textarea", () => {
      render(<ArticleAISidebar {...defaultProps} />);

      expect(
        screen.getByPlaceholderText("Ask about your articles..."),
      ).toBeInTheDocument();
    });

    it("shows helper text", () => {
      render(<ArticleAISidebar {...defaultProps} />);

      expect(screen.getByText(/Press Enter to send/)).toBeInTheDocument();
    });

    it("calls onSendMessage when form is submitted", async () => {
      const user = userEvent.setup();
      render(<ArticleAISidebar {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ask about your articles...");
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      expect(defaultProps.onSendMessage).toHaveBeenCalledWith("Test message");
    });

    it("clears input after sending", async () => {
      const user = userEvent.setup();
      render(<ArticleAISidebar {...defaultProps} />);

      const input = screen.getByPlaceholderText(
        "Ask about your articles...",
      ) as HTMLTextAreaElement;
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      expect(input.value).toBe("");
    });

    it("does not send empty messages", async () => {
      const user = userEvent.setup();
      render(<ArticleAISidebar {...defaultProps} />);

      const input = screen.getByPlaceholderText("Ask about your articles...");
      await user.click(input);
      await user.keyboard("{Enter}");

      expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
    });

    it("does not send when loading", async () => {
      const user = userEvent.setup();
      render(<ArticleAISidebar {...defaultProps} isLoading />);

      const input = screen.getByPlaceholderText("Ask about your articles...");
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
    });

    it("allows multiline with Shift+Enter", async () => {
      const user = userEvent.setup();
      render(<ArticleAISidebar {...defaultProps} />);

      const input = screen.getByPlaceholderText(
        "Ask about your articles...",
      ) as HTMLTextAreaElement;
      await user.type(input, "Line 1");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      await user.type(input, "Line 2");

      expect(input.value).toBe("Line 1\nLine 2");
      expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Quick actions", () => {
    it("calls onAnalyzeSelection when analyze button is clicked", async () => {
      const onAnalyzeSelection = vi.fn();
      const user = userEvent.setup();

      render(
        <ArticleAISidebar
          {...defaultProps}
          selectedArticlesCount={3}
          onAnalyzeSelection={onAnalyzeSelection}
        />,
      );

      await user.click(screen.getByText("Analyze"));
      expect(onAnalyzeSelection).toHaveBeenCalled();
    });

    it("calls onSummarizeAll when summarize button is clicked", async () => {
      const onSummarizeAll = vi.fn();
      const user = userEvent.setup();

      render(
        <ArticleAISidebar {...defaultProps} onSummarizeAll={onSummarizeAll} />,
      );

      await user.click(screen.getByText("Summarize"));
      expect(onSummarizeAll).toHaveBeenCalled();
    });

    it("calls onFindSimilar when find similar button is clicked", async () => {
      const onFindSimilar = vi.fn();
      const user = userEvent.setup();

      render(
        <ArticleAISidebar
          {...defaultProps}
          selectedArticlesCount={3}
          onFindSimilar={onFindSimilar}
        />,
      );

      await user.click(screen.getByText("Find Similar"));
      expect(onFindSimilar).toHaveBeenCalled();
    });

    it("calls onGenerateCriteria when criteria button is clicked", async () => {
      const onGenerateCriteria = vi.fn();
      const user = userEvent.setup();

      render(
        <ArticleAISidebar
          {...defaultProps}
          onGenerateCriteria={onGenerateCriteria}
        />,
      );

      await user.click(screen.getByText("Criteria"));
      expect(onGenerateCriteria).toHaveBeenCalled();
    });
  });

  describe("Custom suggested actions", () => {
    it("renders custom suggested actions", () => {
      const customActions = [
        {
          id: "custom1",
          label: "Custom Action 1",
          icon: <span>🔧</span>,
          description: "This is a custom action",
          onClick: vi.fn(),
        },
      ];

      render(
        <ArticleAISidebar {...defaultProps} suggestedActions={customActions} />,
      );

      expect(screen.getByText("Custom Action 1")).toBeInTheDocument();
      expect(screen.getByText("This is a custom action")).toBeInTheDocument();
    });

    it("calls custom action onClick", async () => {
      const onClick = vi.fn();
      const customActions = [
        {
          id: "custom1",
          label: "Custom Action",
          icon: <span>🔧</span>,
          onClick,
        },
      ];
      const user = userEvent.setup();

      render(
        <ArticleAISidebar {...defaultProps} suggestedActions={customActions} />,
      );

      await user.click(screen.getByText("Custom Action"));
      expect(onClick).toHaveBeenCalled();
    });
  });
});
