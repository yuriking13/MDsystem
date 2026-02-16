import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const articlesCss = readFileSync(
  resolve(process.cwd(), "src/styles/articles-section.css"),
  "utf8",
);

describe("articles section layout css regressions", () => {
  it("keeps a shared content width for header, filters, and grid", () => {
    expect(articlesCss).toMatch(
      /\.articles-header,\s*\.articles-page \.search-form-card,\s*\.articles-filters-container,\s*\.articles-grid,\s*\.search-progress-panel\s*\{[^}]*width:\s*var\(--articles-content-width\);[^}]*margin-left:\s*auto;[^}]*margin-right:\s*auto;/s,
    );
  });

  it("defines content width as gutters constrained by max width", () => {
    expect(articlesCss).toMatch(
      /--articles-content-width:\s*min\(\s*calc\(100% - \(var\(--articles-content-gutter\) \* 2\)\),\s*var\(--articles-content-max-width\)\s*\);/s,
    );
  });

  it("renders two cards per row on desktop", () => {
    expect(articlesCss).toMatch(
      /\.articles-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s,
    );
  });

  it("falls back to a single-column grid on mobile widths", () => {
    expect(articlesCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.articles-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
  });
});
