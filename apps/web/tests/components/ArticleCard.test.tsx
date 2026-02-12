import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArticleCard, { ArticleData } from "../../src/components/ArticleCard";

const mockArticle: ArticleData = {
  id: "1",
  pmid: "12345678",
  doi: "10.1234/test.2024.001",
  title:
    "Effect of Metformin on Glycemic Control in Type 2 Diabetes: A Systematic Review",
  titleRu:
    "Влияние метформина на гликемический контроль при сахарном диабете 2 типа: систематический обзор",
  authors: [
    { name: "Smith J", affiliation: "Harvard Medical School" },
    { name: "Johnson A", affiliation: "MIT" },
    { name: "Williams B", affiliation: "Stanford University" },
    { name: "Brown C", affiliation: "UCLA" },
  ],
  journal: "Journal of Clinical Investigation",
  year: 2024,
  abstract:
    "Background: Metformin is the first-line treatment for type 2 diabetes. This systematic review evaluates its efficacy in glycemic control across different patient populations and treatment durations.",
  abstractRu:
    "Введение: Метформин является препаратом первой линии для лечения сахарного диабета 2 типа. Этот систематический обзор оценивает его эффективность в контроле гликемии в различных популяциях пациентов и при различной продолжительности лечения.",
  publicationType: "systematic_review",
  status: "candidate",
  sourceQuery: "metformin AND diabetes",
  source: "pubmed",
  citationCount: 150,
  hasFullText: true,
  hasFreeFullText: true,
  stats: {
    hasStatistics: true,
    statisticalMethods: ["meta-analysis", "random-effects model"],
    sampleSize: 5000,
    pValues: ["p<0.001", "p=0.02"],
  },
  tags: ["diabetes", "metformin", "glycemic control"],
};

describe("ArticleCard", () => {
  const defaultProps = {
    article: mockArticle,
    isSelected: false,
    onSelect: vi.fn(),
    onStatusChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders article title correctly", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.getByText(mockArticle.title)).toBeInTheDocument();
  });

  it("renders Russian title when language is ru", () => {
    render(<ArticleCard {...defaultProps} language="ru" />);
    expect(screen.getByText(mockArticle.titleRu!)).toBeInTheDocument();
  });

  it("displays status badge correctly", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.getByTitle("Candidate")).toBeInTheDocument();
  });

  it("displays source badge", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.getByText("PUBMED")).toBeInTheDocument();
  });

  it("shows publication type badge", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.getByText("Systematic Review")).toBeInTheDocument();
  });

  it("shows stats badge when article has statistics", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });

  it("does not render free full text badge in current layout", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.queryByText("Free Full Text")).not.toBeInTheDocument();
  });

  it("displays year", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it("displays first 3 authors with indication of more", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(
      screen.getByText(/Smith J, Johnson A, Williams B/),
    ).toBeInTheDocument();
    expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
  });

  it("displays journal name", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(
      screen.getByText("Journal of Clinical Investigation"),
    ).toBeInTheDocument();
  });

  it("renders PMID link", () => {
    render(<ArticleCard {...defaultProps} />);
    const pmidLink = screen.getByRole("link", { name: /PMID: 12345678/i });
    expect(pmidLink).toHaveAttribute(
      "href",
      "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    );
  });

  it("renders DOI link", () => {
    render(<ArticleCard {...defaultProps} />);
    const doiLink = screen.getByRole("link", { name: /^DOI$/i });
    expect(doiLink).toHaveAttribute(
      "href",
      "https://doi.org/10.1234/test.2024.001",
    );
  });

  it("does not render citation count text in current layout", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.queryByText(/150 citations/i)).not.toBeInTheDocument();
  });

  it("does not render tags in current layout", () => {
    render(<ArticleCard {...defaultProps} />);
    expect(screen.queryByText("diabetes")).not.toBeInTheDocument();
    expect(screen.queryByText("metformin")).not.toBeInTheDocument();
  });

  it("calls onSelect when checkbox is clicked", async () => {
    const user = userEvent.setup();
    render(<ArticleCard {...defaultProps} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(defaultProps.onSelect).toHaveBeenCalledWith("1");
  });

  it("applies selected styles when isSelected is true", () => {
    render(<ArticleCard {...defaultProps} isSelected={true} />);

    const card = screen.getByRole("checkbox").closest("article");
    expect(card).toHaveClass("article-card--selected");
    expect(card).toBeInTheDocument();
  });

  it("expands abstract when show more is clicked", async () => {
    const user = userEvent.setup();
    const longAbstract =
      mockArticle.abstract! + " ".repeat(200) + "Additional content.";
    const articleWithLongAbstract = { ...mockArticle, abstract: longAbstract };

    render(<ArticleCard {...defaultProps} article={articleWithLongAbstract} />);

    const showMoreButton = screen.getByText("Show more");
    await user.click(showMoreButton);

    expect(screen.getByText("Hide")).toBeInTheDocument();
  });

  it("calls onStatusChange with 'selected' when select button is clicked", async () => {
    const user = userEvent.setup();
    render(<ArticleCard {...defaultProps} />);

    // Hover to show action bar
    const card = screen.getByText(mockArticle.title).closest("div");
    fireEvent.mouseEnter(card!);

    const selectButton = screen.getByTitle("Select");
    await user.click(selectButton);

    expect(defaultProps.onStatusChange).toHaveBeenCalledWith("1", "selected");
  });

  it("calls onStatusChange with 'excluded' when exclude button is clicked", async () => {
    const user = userEvent.setup();
    render(<ArticleCard {...defaultProps} />);

    // Hover to show action bar
    const card = screen.getByText(mockArticle.title).closest("div");
    fireEvent.mouseEnter(card!);

    const excludeButton = screen.getByTitle("Exclude");
    await user.click(excludeButton);

    expect(defaultProps.onStatusChange).toHaveBeenCalledWith("1", "excluded");
  });

  it("calls onOpenDetails when title is clicked", async () => {
    const onOpenDetails = vi.fn();
    const user = userEvent.setup();

    render(<ArticleCard {...defaultProps} onOpenDetails={onOpenDetails} />);

    await user.click(screen.getByText(mockArticle.title));

    expect(onOpenDetails).toHaveBeenCalledWith("1");
  });

  it("calls onTranslate when translate button is clicked", async () => {
    const onTranslate = vi.fn();
    const articleWithoutTranslation = { ...mockArticle, titleRu: undefined };
    const user = userEvent.setup();

    render(
      <ArticleCard
        {...defaultProps}
        article={articleWithoutTranslation}
        onTranslate={onTranslate}
      />,
    );

    // Hover to show action bar
    const card = screen.getByText(mockArticle.title).closest("div");
    fireEvent.mouseEnter(card!);

    const translateButton = screen.getByTitle("Translate");
    await user.click(translateButton);

    expect(onTranslate).toHaveBeenCalledWith("1");
  });

  it("calls onDetectStats when detect stats button is clicked", async () => {
    const onDetectStats = vi.fn();
    const articleWithoutStats = { ...mockArticle, stats: undefined };
    const user = userEvent.setup();

    render(
      <ArticleCard
        {...defaultProps}
        article={articleWithoutStats}
        onDetectStats={onDetectStats}
      />,
    );

    // Hover to show action bar
    const card = screen.getByText(mockArticle.title).closest("div");
    fireEvent.mouseEnter(card!);

    const detectStatsButton = screen.getByTitle("Detect Statistics");
    await user.click(detectStatsButton);

    expect(onDetectStats).toHaveBeenCalledWith("1");
  });

  it("calls onCopyToClipboard when copy button is clicked", async () => {
    const onCopyToClipboard = vi.fn();
    const user = userEvent.setup();

    render(
      <ArticleCard {...defaultProps} onCopyToClipboard={onCopyToClipboard} />,
    );

    // Hover to show action bar
    const card = screen.getByText(mockArticle.title).closest("div");
    fireEvent.mouseEnter(card!);

    const copyButton = screen.getByTitle("Copy Citation");
    await user.click(copyButton);

    expect(onCopyToClipboard).toHaveBeenCalledWith("1");
  });

  it("renders compact version correctly", () => {
    render(<ArticleCard {...defaultProps} compact={true} />);

    // Abstract should not be visible in compact mode
    expect(screen.queryByText(/Background:/)).not.toBeInTheDocument();
  });

  it("hides translate button when article already has Russian translation", () => {
    render(<ArticleCard {...defaultProps} onTranslate={vi.fn()} />);

    // Hover to show action bar
    const card = screen.getByText(mockArticle.title).closest("div");
    fireEvent.mouseEnter(card!);

    expect(screen.queryByTitle("Translate")).not.toBeInTheDocument();
  });

  it("hides detect stats button when article already has stats", () => {
    render(<ArticleCard {...defaultProps} onDetectStats={vi.fn()} />);

    // Hover to show action bar
    const card = screen.getByText(mockArticle.title).closest("div");
    fireEvent.mouseEnter(card!);

    expect(screen.queryByTitle("Detect Statistics")).not.toBeInTheDocument();
  });
});
