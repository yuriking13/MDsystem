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

  it("keeps AI sidebar and FAB safe-area aware by default", () => {
    expect(articlesCss).toMatch(
      /\.article-ai-fab\s*\{[\s\S]*?bottom:\s*calc\(24px \+ env\(safe-area-inset-bottom,\s*0px\)\);[\s\S]*?right:\s*calc\(24px \+ env\(safe-area-inset-right,\s*0px\)\);[\s\S]*?max-width:\s*calc\(100vw - 48px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\);/,
    );
    expect(articlesCss).toMatch(
      /\.article-ai-sidebar\s*\{[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\);[\s\S]*?padding-right:\s*env\(safe-area-inset-right,\s*0px\);/,
    );
  });

  it("keeps AI sidebar mobile paddings safe-area aware at 768px", () => {
    expect(articlesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.article-ai-sidebar\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?padding-top:\s*0;[\s\S]*?padding-right:\s*0;/,
    );
    expect(articlesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.article-ai-header\s*\{[\s\S]*?padding:\s*calc\(14px \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(16px \+ env\(safe-area-inset-right,\s*0px\)\)\s*14px\s*calc\(16px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(articlesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.article-ai-input-area\s*\{[\s\S]*?padding:\s*12px calc\(16px \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(14px \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(16px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });

  it("keeps AI sidebar compact mobile paddings safe-area aware at 640px", () => {
    expect(articlesCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.article-ai-fab\s*\{[\s\S]*?max-width:\s*calc\(100vw - 24px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\);/,
    );
    expect(articlesCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.article-ai-input-area\s*\{[\s\S]*?padding:\s*10px calc\(12px \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(12px \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(12px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });

  it("keeps ai-sidebar shift width synchronized at medium breakpoint", () => {
    expect(articlesCss).toMatch(
      /@media\s*\(max-width:\s*1100px\)\s*\{[\s\S]*?\.article-ai-sidebar\s*\{[\s\S]*?width:\s*360px;[\s\S]*?\}[\s\S]*?\.articles-page-main--shifted\s*\{[\s\S]*?margin-right:\s*360px;/,
    );
  });
});
