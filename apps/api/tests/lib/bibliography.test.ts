import { describe, it, expect } from "vitest";
import {
  formatGOST,
  formatAPA,
  formatVancouver,
  formatCitation,
  formatBibliography,
  type BibliographyArticle,
  type CitationStyle,
} from "../../src/lib/bibliography.js";

const sampleArticle: BibliographyArticle = {
  title_en: "Effect of Metformin on Glycemic Control in Type 2 Diabetes",
  title_ru: "Влияние метформина на гликемический контроль при СД 2 типа",
  authors: ["Smith John", "Johnson Mary", "Williams Robert"],
  journal: "Journal of Clinical Investigation",
  year: 2024,
  volume: "15",
  issue: "3",
  pages: "125-140",
  doi: "10.1234/jci.2024.001",
  pmid: "12345678",
};

describe("formatGOST", () => {
  it("should format a complete article citation", () => {
    const result = formatGOST(sampleArticle);

    expect(result).toContain("Smith J.");
    expect(result).toContain("Effect of Metformin");
    expect(result).toContain("// Journal of Clinical Investigation");
    expect(result).toContain("2024");
    expect(result).toContain("Vol. 15");
    expect(result).toContain("No. 3");
    expect(result).toContain("P. 125-140");
    expect(result).toContain("DOI: 10.1234/jci.2024.001");
    expect(result.endsWith(".")).toBe(true);
  });

  it("should handle article with more than 3 authors", () => {
    const manyAuthors: BibliographyArticle = {
      ...sampleArticle,
      authors: [
        "Author One",
        "Author Two",
        "Author Three",
        "Author Four",
        "Author Five",
      ],
    };
    const result = formatGOST(manyAuthors);

    expect(result).toContain("et al.");
    // Should only show first 3 authors
    expect(result).not.toContain("Four");
    expect(result).not.toContain("Five");
  });

  it("should handle article without authors", () => {
    const noAuthors: BibliographyArticle = {
      ...sampleArticle,
      authors: null,
    };
    const result = formatGOST(noAuthors);

    expect(result).toContain("Effect of Metformin");
    expect(result).not.toContain("Smith");
  });

  it("should handle article without DOI", () => {
    const noDoi: BibliographyArticle = {
      ...sampleArticle,
      doi: null,
    };
    const result = formatGOST(noDoi);

    expect(result).not.toContain("DOI");
  });

  it("should handle article with only required fields", () => {
    const minimal: BibliographyArticle = {
      title_en: "Test Article Title",
    };
    const result = formatGOST(minimal);

    expect(result).toBe("Test Article Title.");
  });
});

describe("formatAPA", () => {
  it("should format a complete article citation", () => {
    const result = formatAPA(sampleArticle);

    expect(result).toContain("Smith, J.");
    expect(result).toContain("Johnson, M.");
    expect(result).toContain("(2024)");
    expect(result).toContain("Effect of Metformin");
    expect(result).toContain("Journal of Clinical Investigation");
    expect(result).toContain("15(3)");
    expect(result).toContain("125-140");
    expect(result).toContain("https://doi.org/10.1234/jci.2024.001");
  });

  it("should format single author correctly", () => {
    const singleAuthor: BibliographyArticle = {
      ...sampleArticle,
      authors: ["Smith John"],
    };
    const result = formatAPA(singleAuthor);

    expect(result).toContain("Smith, J.");
    expect(result).not.toContain("&");
  });

  it("should format two authors with ampersand", () => {
    const twoAuthors: BibliographyArticle = {
      ...sampleArticle,
      authors: ["Smith John", "Johnson Mary"],
    };
    const result = formatAPA(twoAuthors);

    expect(result).toContain("Smith, J. & Johnson, M.");
  });

  it("should format multiple authors with serial comma and ampersand", () => {
    const result = formatAPA(sampleArticle);

    // Should have comma before & for 3+ authors
    expect(result).toMatch(/Smith, J\., Johnson, M\., & Williams, R\./);
  });
});

describe("formatVancouver", () => {
  it("should format a complete article citation", () => {
    const result = formatVancouver(sampleArticle);

    expect(result).toContain("Smith J");
    expect(result).toContain("Johnson M");
    expect(result).toContain("Effect of Metformin");
    expect(result).toContain("Journal of Clinical Investigation");
    expect(result).toContain("2024");
    expect(result).toContain(";15(3):125-140");
    expect(result).toContain("doi:10.1234/jci.2024.001");
  });

  it("should truncate after 6 authors and add et al", () => {
    const manyAuthors: BibliographyArticle = {
      ...sampleArticle,
      authors: [
        "A One",
        "B Two",
        "C Three",
        "D Four",
        "E Five",
        "F Six",
        "G Seven",
        "H Eight",
      ],
    };
    const result = formatVancouver(manyAuthors);

    expect(result).toContain("et al");
    expect(result).not.toContain("Seven");
    expect(result).not.toContain("Eight");
  });

  it("should handle article without volume/issue", () => {
    const noVolume: BibliographyArticle = {
      ...sampleArticle,
      volume: null,
      issue: null,
    };
    const result = formatVancouver(noVolume);

    expect(result).toContain("2024");
    expect(result).not.toContain(";");
    expect(result).not.toContain("(");
  });
});

describe("formatCitation", () => {
  it("should use GOST format when style is gost", () => {
    const result = formatCitation(sampleArticle, "gost");
    expect(result).toContain("//"); // GOST uses // before journal
  });

  it("should use APA format when style is apa", () => {
    const result = formatCitation(sampleArticle, "apa");
    expect(result).toContain("https://doi.org/"); // APA uses full DOI URL
  });

  it("should use Vancouver format when style is vancouver", () => {
    const result = formatCitation(sampleArticle, "vancouver");
    expect(result).toContain("doi:"); // Vancouver uses doi: prefix
  });

  it("should default to GOST for unknown style", () => {
    const result = formatCitation(sampleArticle, "unknown" as CitationStyle);
    expect(result).toContain("//"); // Should fall back to GOST
  });
});

describe("formatBibliography", () => {
  const articles: BibliographyArticle[] = [
    {
      title_en: "First Article",
      authors: ["Author A"],
      year: 2024,
    },
    {
      title_en: "Second Article",
      authors: ["Author B"],
      year: 2023,
    },
    {
      title_en: "Third Article",
      authors: ["Author C"],
      year: 2022,
    },
  ];

  it("should number citations starting from 1", () => {
    const result = formatBibliography(articles, "gost");

    expect(result[0].startsWith("1.")).toBe(true);
    expect(result[1].startsWith("2.")).toBe(true);
    expect(result[2].startsWith("3.")).toBe(true);
  });

  it("should return array of formatted citations", () => {
    const result = formatBibliography(articles, "gost");

    expect(result).toHaveLength(3);
    expect(result[0]).toContain("First Article");
    expect(result[1]).toContain("Second Article");
    expect(result[2]).toContain("Third Article");
  });

  it("should format all citations in the same style", () => {
    const result = formatBibliography(articles, "apa");

    // All APA citations should have year in parentheses
    result.forEach((citation) => {
      expect(citation).toMatch(/\(\d{4}\)/);
    });
  });

  it("should handle empty array", () => {
    const result = formatBibliography([], "gost");
    expect(result).toEqual([]);
  });
});
