import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const graphCss = readFileSync(
  resolve(process.cwd(), "src/styles/citation-graph.css"),
  "utf8",
);
const legacyCss = readFileSync(
  resolve(process.cwd(), "src/styles/legacy.css"),
  "utf8",
);

describe("citation graph light-theme visual contract", () => {
  it("keeps light legend panel and text overrides for readability", () => {
    expect(graphCss).toMatch(
      /\.light-theme \.graph-legend-panel,[\s\S]*?background:\s*linear-gradient\(135deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\)\s*0%,\s*rgba\(239,\s*246,\s*255,\s*0\.95\)\s*100%\);/,
    );
    expect(graphCss).toMatch(
      /\.light-theme \.graph-legend-item-label,[\s\S]*?color:\s*#1e293b;/,
    );
    expect(graphCss).toMatch(
      /\.light-theme \.graph-legend-item-count,[\s\S]*?color:\s*#64748b;/,
    );
  });

  it("keeps light graph control surface overrides on blue-white tones", () => {
    expect(graphCss).toMatch(
      /\.light-theme \.quick-stats,[\s\S]*?background:\s*rgba\(239,\s*246,\s*255,\s*0\.8\);/,
    );
    expect(graphCss).toMatch(
      /\.light-theme \.select-input,[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.95\);/,
    );
    expect(graphCss).toMatch(
      /\.light-theme \.toolbar-search-input,[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.95\);/,
    );
    expect(graphCss).toMatch(
      /\.light-theme \.node-quick-link,[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.94\);/,
    );
  });

  it("keeps light legend semantic color slots aligned to updated node palette", () => {
    expect(graphCss).toMatch(
      /\.graph-legend-theme-light\s*\{[\s\S]*?--graph-legend-selected:\s*#22c55e;/,
    );
    expect(graphCss).toMatch(
      /\.graph-legend-theme-light\s*\{[\s\S]*?--graph-legend-candidate:\s*#3b82f6;/,
    );
    expect(graphCss).toMatch(
      /\.graph-legend-theme-light\s*\{[\s\S]*?--graph-legend-citing:\s*#0ea5e9;/,
    );
    expect(graphCss).toMatch(
      /\.graph-legend-theme-light\s*\{[\s\S]*?--graph-legend-reference:\s*#38bdf8;/,
    );
    expect(graphCss).toMatch(
      /\.graph-legend-theme-light\s*\{[\s\S]*?--graph-legend-related:\s*#14b8a6;/,
    );
    expect(graphCss).toMatch(
      /\.graph-legend-theme-light\s*\{[\s\S]*?--graph-legend-pvalue:\s*#f59e0b;/,
    );
  });

  it("keeps legacy legend/help dot classes mapped to graph css variables", () => {
    const variableMappedSelectors = [
      [".legend-dot--pink", "var(--graph-node-citing)"],
      [".legend-dot--blue", "var(--graph-node-candidate-pubmed)"],
      [".legend-dot--orange", "var(--graph-node-reference)"],
      [".legend-dot--cyan", "var(--graph-node-related)"],
      [".legend-dot--amber", "var(--graph-node-pvalue)"],
      [".help-legend-dot--green", "var(--graph-node-selected)"],
      [".help-legend-dot--yellow", "var(--graph-node-candidate-doaj)"],
      [".help-legend-dot--violet", "var(--graph-node-candidate-wiley)"],
      [".help-legend-dot--red", "var(--graph-node-excluded)"],
    ];

    for (const [selector, expectedVariable] of variableMappedSelectors) {
      const pattern = new RegExp(
        `${selector.replace(".", "\\.")}\\s*\\{[\\s\\S]*?background:\\s*${expectedVariable.replace(/[()]/g, "\\$&")};`,
      );
      expect(legacyCss).toMatch(pattern);
    }
  });
});
