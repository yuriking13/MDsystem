import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexCss = readFileSync(
  resolve(process.cwd(), "src/styles/index.css"),
  "utf8",
);
const legacyCss = readFileSync(
  resolve(process.cwd(), "src/styles/legacy.css"),
  "utf8",
);
const graphCss = readFileSync(
  resolve(process.cwd(), "src/styles/citation-graph.css"),
  "utf8",
);
const pagesCss = readFileSync(
  resolve(process.cwd(), "src/styles/pages.css"),
  "utf8",
);
const graphComponent = readFileSync(
  resolve(process.cwd(), "src/components/CitationGraph/CitationGraph.tsx"),
  "utf8",
);

describe("light theme blue/white palette safeguards", () => {
  it("keeps primary Tailwind scale on blue spectrum", () => {
    expect(indexCss).toMatch(/--color-primary-50:\s*#EFF6FF;/);
    expect(indexCss).toMatch(/--color-primary-500:\s*#3B82F6;/);
    expect(indexCss).toMatch(/--color-primary-600:\s*#2563EB;/);
    expect(indexCss).toMatch(/--color-primary-950:\s*#172554;/);
  });

  it("keeps core light design tokens on neutral blue-white palette", () => {
    expect(indexCss).toMatch(
      /--color-background:\s*248 251 255;\s*\/\* #F8FBFF \*\//,
    );
    expect(indexCss).toMatch(
      /--color-border:\s*191 219 254;\s*\/\* #BFDBFE \*\//,
    );
    expect(indexCss).toMatch(
      /--color-text-primary:\s*15 23 42;\s*\/\* #0F172A \*\//,
    );
    expect(indexCss).toMatch(
      /--color-primary:\s*37 99 235;\s*\/\* #2563EB \*\//,
    );
  });

  it("keeps legacy light theme accent and graph variables aligned to blue theme", () => {
    expect(legacyCss).toMatch(/--accent:\s*#2563EB;/);
    expect(legacyCss).toMatch(/--accent-secondary:\s*#3B82F6;/);
    expect(legacyCss).toMatch(/--graph-bg:\s*#F8FBFF;/);
    expect(legacyCss).toMatch(/--graph-node-candidate-pubmed:\s*#3B82F6;/);
    expect(legacyCss).toMatch(/--graph-node-reference:\s*#38BDF8;/);
    expect(legacyCss).toMatch(/--graph-node-pvalue:\s*#F59E0B;/);
  });

  it("keeps citation graph light legend tokens synchronized with updated node palette", () => {
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
      /\.graph-legend-theme-light\s*\{[\s\S]*?--graph-legend-pvalue:\s*#f59e0b;/,
    );
  });

  it("keeps docs submenu styles present for menu + submenu navigation", () => {
    expect(pagesCss).toMatch(/\.docs-subnav\s*\{/);
    expect(pagesCss).toMatch(/\.docs-subnav-list\s*\{/);
    expect(pagesCss).toMatch(/\.docs-subnav-item\.active\s*\{/);
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.docs-subnav-list\s*\{/,
    );
  });

  it("keeps graph component free from legacy warm pastel constants", () => {
    expect(graphComponent).not.toMatch(/const pastelColors\s*=\s*\{/);
    expect(graphComponent).not.toMatch(/#FDFCFB/);
    expect(graphComponent).not.toMatch(/#FFF8EC/);
    expect(graphComponent).not.toMatch(/#F5BA5C/);
    expect(graphComponent).not.toMatch(/#FFEFD5/);
    expect(graphComponent).not.toMatch(/#C87D2A/);
    expect(graphComponent).not.toMatch(/#D99A3A/);
  });

  it("keeps key style files free from removed warm palette literals", () => {
    const styleBundle = [indexCss, legacyCss, graphCss, pagesCss].join("\n");
    const removedWarmTokens = [
      /#C87D2A/,
      /#D99A3A/,
      /#FFEFD5/,
      /#FFF8EC/,
      /rgba\(200,\s*125,\s*42/,
      /rgba\(224,\s*214,\s*202/,
    ];

    for (const token of removedWarmTokens) {
      expect(styleBundle).not.toMatch(token);
    }
  });
});
