import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const graphComponent = readFileSync(
  resolve(process.cwd(), "src/components/CitationGraph/CitationGraph.tsx"),
  "utf8",
);

describe("citation graph component contract", () => {
  it("keeps theme-dependent graph colors sourced from utility token getters", () => {
    expect(graphComponent).toMatch(
      /const nodeColors = getGraphNodeColors\(\);/,
    );
    expect(graphComponent).toMatch(
      /const backgroundColors = getGraphBackgroundColors\(\);/,
    );
    expect(graphComponent).toMatch(
      /bg:\s*backgroundColors\.normal,[\s\S]*bgFullscreen:\s*backgroundColors\.fullscreen,[\s\S]*linkColor:\s*backgroundColors\.linkColor,/,
    );
  });

  it("keeps stats bar legend dots bound to graphColors semantic keys", () => {
    expect(graphComponent).toMatch(
      /getLegendDotClassName\(graphColors\.citing\)/,
    );
    expect(graphComponent).toMatch(
      /getLegendDotClassName\(graphColors\.candidatePubmed\)/,
    );
    expect(graphComponent).toMatch(
      /getLegendDotClassName\(graphColors\.reference\)/,
    );
    expect(graphComponent).toMatch(
      /getLegendDotClassName\(graphColors\.related\)/,
    );
    expect(graphComponent).toMatch(
      /getLegendDotClassName\(graphColors\.pvalue\)/,
    );
  });

  it("keeps help legend color keys wired to graphColors semantic slots", () => {
    expect(graphComponent).toMatch(
      /getHelpLegendDotClassName\(\s*graphColors\.selected,\s*\)/,
    );
    expect(graphComponent).toMatch(
      /getHelpLegendDotClassName\(\s*graphColors\.candidatePubmed,\s*\)/,
    );
    expect(graphComponent).toMatch(
      /getHelpLegendDotClassName\(\s*graphColors\.candidateDoaj,\s*\)/,
    );
    expect(graphComponent).toMatch(
      /getHelpLegendDotClassName\(\s*graphColors\.candidateWiley,\s*\)/,
    );
    expect(graphComponent).toMatch(
      /getHelpLegendDotClassName\(\s*graphColors\.excluded,\s*\)/,
    );
    expect(graphComponent).toMatch(
      /getHelpLegendDotClassName\(\s*graphColors\.reference,\s*\)/,
    );
    expect(graphComponent).toMatch(
      /getHelpLegendDotClassName\(\s*graphColors\.citing,\s*\)/,
    );
  });

  it("keeps color map lookups normalized to lowercase keys", () => {
    expect(graphComponent).toMatch(
      /const normalizeColorKey = \(color: string\): string =>[\s\S]*?color\.trim\(\)\.toLowerCase\(\);/,
    );
    expect(graphComponent).toMatch(
      /LEGEND_DOT_COLOR_CLASS_MAP\[normalizeColorKey\(background\)\]/,
    );
    expect(graphComponent).toMatch(
      /LEGEND_VALUE_COLOR_CLASS_MAP\[normalizeColorKey\(color\)\]/,
    );
    expect(graphComponent).toMatch(
      /HELP_LEGEND_DOT_COLOR_CLASS_MAP\[normalizeColorKey\(color\)\]/,
    );
    expect(graphComponent).toMatch(
      /CLUSTER_COLOR_CLASS_MAP\[normalizeColorKey\(color\)\]/,
    );
  });
});
