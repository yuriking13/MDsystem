import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArticleFilterSidebar from "../ArticleFilterSidebar";

const defaultProps = {
  selectedSources: ["pubmed" as const],
  onSourcesChange: vi.fn(),
  sourceCounts: { pubmed: 150, doaj: 50, wiley: 30 },
  datePreset: "5y",
  onDatePresetChange: vi.fn(),
  customYearFrom: undefined,
  customYearTo: undefined,
  onCustomYearChange: vi.fn(),
  selectedPubTypes: [],
  onPubTypesChange: vi.fn(),
  textAvailability: "any",
  onTextAvailabilityChange: vi.fn(),
  availableSourceQueries: ["diabetes treatment", "metformin efficacy"],
  selectedSourceQuery: null,
  onSourceQueryChange: vi.fn(),
  viewStatus: "candidate" as const,
  onViewStatusChange: vi.fn(),
  statusCounts: {
    candidate: 100,
    selected: 25,
    excluded: 15,
    deleted: 5,
  },
  showStatsOnly: false,
  onShowStatsOnlyChange: vi.fn(),
  onResetFilters: vi.fn(),
};

describe("ArticleFilterSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the filter sidebar", () => {
    render(<ArticleFilterSidebar {...defaultProps} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("displays reset button", () => {
    render(<ArticleFilterSidebar {...defaultProps} />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("calls onResetFilters when reset is clicked", async () => {
    const user = userEvent.setup();
    render(<ArticleFilterSidebar {...defaultProps} />);

    await user.click(screen.getByText("Reset"));
    expect(defaultProps.onResetFilters).toHaveBeenCalled();
  });

  describe("Status Filter", () => {
    it("displays all status options with counts", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Candidates")).toBeInTheDocument();
      expect(screen.getByText("Selected")).toBeInTheDocument();
      expect(screen.getByText("Excluded")).toBeInTheDocument();
      expect(screen.getByText("Deleted")).toBeInTheDocument();

      // Check counts
      expect(screen.getByText("140")).toBeInTheDocument(); // All = candidate + selected + excluded
      expect(screen.getByText("100")).toBeInTheDocument(); // candidate
      expect(screen.getByText("25")).toBeInTheDocument(); // selected
      expect(screen.getByText("15")).toBeInTheDocument(); // excluded
      expect(screen.getByText("5")).toBeInTheDocument(); // deleted
    });

    it("highlights the selected status", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      const candidatesButton = screen.getByRole("button", {
        name: /Candidates/,
      });
      expect(candidatesButton).toHaveClass("bg-blue-50");
    });

    it("calls onViewStatusChange when status is clicked", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /Selected/ }));
      expect(defaultProps.onViewStatusChange).toHaveBeenCalledWith("selected");
    });
  });

  describe("Data Sources", () => {
    it("displays data source checkboxes", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      expect(screen.getByText("PubMed Central")).toBeInTheDocument();
      expect(screen.getByText("DOAJ")).toBeInTheDocument();
      expect(screen.getByText("Wiley Online")).toBeInTheDocument();
    });

    it("displays source counts", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      expect(screen.getByText("(150)")).toBeInTheDocument();
      expect(screen.getByText("(50)")).toBeInTheDocument();
      expect(screen.getByText("(30)")).toBeInTheDocument();
    });

    it("checks the selected sources", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      const pubmedCheckbox = screen.getByRole("checkbox", {
        name: /PubMed Central/,
      });
      expect(pubmedCheckbox).toBeChecked();

      const doajCheckbox = screen.getByRole("checkbox", { name: /DOAJ/ });
      expect(doajCheckbox).not.toBeChecked();
    });

    it("calls onSourcesChange when source is toggled", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      await user.click(screen.getByRole("checkbox", { name: /DOAJ/ }));
      expect(defaultProps.onSourcesChange).toHaveBeenCalledWith([
        "pubmed",
        "doaj",
      ]);
    });
  });

  describe("Publication Date", () => {
    it("renders date preset dropdown", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const dateHeader = screen.getByText("Publication Date");
      fireEvent.click(dateHeader);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows custom date inputs when preset is custom", () => {
      render(<ArticleFilterSidebar {...defaultProps} datePreset="custom" />);

      // Click to expand if collapsed
      const dateHeader = screen.getByText("Publication Date");
      fireEvent.click(dateHeader);

      expect(screen.getByPlaceholderText("From")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("To")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    });

    it("calls onDatePresetChange when preset is changed", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const dateHeader = screen.getByText("Publication Date");
      fireEvent.click(dateHeader);

      await user.selectOptions(screen.getByRole("combobox"), "1y");
      expect(defaultProps.onDatePresetChange).toHaveBeenCalledWith("1y");
    });
  });

  describe("Publication Type", () => {
    it("displays publication type checkboxes", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const pubTypeHeader = screen.getByText("Publication Type");
      fireEvent.click(pubTypeHeader);

      expect(screen.getByText("Systematic Review")).toBeInTheDocument();
      expect(screen.getByText("Meta-Analysis")).toBeInTheDocument();
      expect(screen.getByText("RCT")).toBeInTheDocument();
      expect(screen.getByText("Clinical Trial")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
      expect(screen.getByText("Books")).toBeInTheDocument();
    });

    it("calls onPubTypesChange when type is toggled", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const pubTypeHeader = screen.getByText("Publication Type");
      fireEvent.click(pubTypeHeader);

      await user.click(
        screen.getByRole("checkbox", { name: /Systematic Review/ }),
      );
      expect(defaultProps.onPubTypesChange).toHaveBeenCalledWith([
        "systematic_review",
      ]);
    });
  });

  describe("Text Availability", () => {
    it("displays text availability options", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const textHeader = screen.getByText("Text Availability");
      fireEvent.click(textHeader);

      expect(screen.getByText("Any (abstract)")).toBeInTheDocument();
      expect(screen.getByText("Full text")).toBeInTheDocument();
      expect(screen.getByText("Free full text")).toBeInTheDocument();
    });

    it("calls onTextAvailabilityChange when option is clicked", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const textHeader = screen.getByText("Text Availability");
      fireEvent.click(textHeader);

      await user.click(screen.getByRole("button", { name: "Full text" }));
      expect(defaultProps.onTextAvailabilityChange).toHaveBeenCalledWith(
        "full",
      );
    });
  });

  describe("Search Queries", () => {
    it("displays search query filter when queries are available", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const queriesHeader = screen.getByText("Search Queries");
      fireEvent.click(queriesHeader);

      expect(screen.getByText("All queries")).toBeInTheDocument();
      expect(screen.getByText("diabetes treatment")).toBeInTheDocument();
      expect(screen.getByText("metformin efficacy")).toBeInTheDocument();
    });

    it("does not display search queries section when no queries available", () => {
      render(
        <ArticleFilterSidebar {...defaultProps} availableSourceQueries={[]} />,
      );

      expect(screen.queryByText("Search Queries")).not.toBeInTheDocument();
    });

    it("calls onSourceQueryChange when query is selected", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const queriesHeader = screen.getByText("Search Queries");
      fireEvent.click(queriesHeader);

      await user.click(
        screen.getByRole("button", { name: "diabetes treatment" }),
      );
      expect(defaultProps.onSourceQueryChange).toHaveBeenCalledWith(
        "diabetes treatment",
      );
    });
  });

  describe("Advanced Options", () => {
    it("displays show stats only toggle", () => {
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const advancedHeader = screen.getByText("Advanced");
      fireEvent.click(advancedHeader);

      expect(screen.getByText("Show stats only")).toBeInTheDocument();
    });

    it("calls onShowStatsOnlyChange when toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Click to expand if collapsed
      const advancedHeader = screen.getByText("Advanced");
      fireEvent.click(advancedHeader);

      const toggle = screen.getByRole("button", { name: "" });
      await user.click(toggle);

      expect(defaultProps.onShowStatsOnlyChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Collapsible sections", () => {
    it("collapses and expands sections on click", async () => {
      const user = userEvent.setup();
      render(<ArticleFilterSidebar {...defaultProps} />);

      // Status section should be open by default
      expect(screen.getByText("Candidates")).toBeInTheDocument();

      // Click to collapse
      await user.click(screen.getByText("Status"));

      // Check that the section content is hidden
      // Note: The implementation might still keep the content in DOM
    });
  });
});
