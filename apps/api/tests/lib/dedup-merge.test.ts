import { describe, expect, it } from "vitest";
import { dedupArticles, normalizeDoi } from "../../src/lib/dedup-merge.js";

describe("normalizeDoi", () => {
  it("normalizes doi urls", () => {
    expect(normalizeDoi("https://doi.org/10.1000/XYZ123")).toBe(
      "10.1000/xyz123",
    );
  });

  it("strips doi prefix", () => {
    expect(normalizeDoi("DOI:10.1000/xyz123")).toBe("10.1000/xyz123");
  });
});

describe("dedupArticles", () => {
  it("deduplicates by doi case-insensitively", () => {
    const { unique, duplicates } = dedupArticles(
      [
        { doi: "10.1/ABC", title: "one" },
        { doi: "10.1/abc", title: "two" },
      ],
      { enableSoft: true },
    );
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  it("soft-dedups by title/year/author", () => {
    const { unique, duplicates } = dedupArticles(
      [
        {
          doi: null,
          title: "Effect of statins on risk",
          year: 2020,
          authors: "Smith J",
        },
        {
          doi: null,
          title: "Effect of statins on risk!",
          year: 2020,
          authors: "Smith J",
        },
      ],
      { enableSoft: true },
    );
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });
});
