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

describe("light theme variable contract", () => {
  it("keeps index light-mode body foreground/background on blue-neutral pair", () => {
    expect(indexCss).toMatch(
      /body\.light-theme,\s*\[data-theme="light"\] body\s*\{[\s\S]*?background-color:\s*#F8FBFF;[\s\S]*?color:\s*#0F172A;/,
    );
  });

  it("keeps light global CSS variable values for background and text hierarchy", () => {
    expect(indexCss).toMatch(
      /--color-background:\s*248 251 255;\s*\/\* #F8FBFF \*\//,
    );
    expect(indexCss).toMatch(
      /--color-background-secondary:\s*240 247 255;\s*\/\* #F0F7FF \*\//,
    );
    expect(indexCss).toMatch(
      /--color-background-tertiary:\s*234 243 255;\s*\/\* #EAF3FF \*\//,
    );
    expect(indexCss).toMatch(
      /--color-text-primary:\s*15 23 42;\s*\/\* #0F172A \*\//,
    );
    expect(indexCss).toMatch(
      /--color-text-secondary:\s*51 65 85;\s*\/\* #334155 \*\//,
    );
    expect(indexCss).toMatch(
      /--color-text-tertiary:\s*100 116 139;\s*\/\* #64748B \*\//,
    );
  });

  it("keeps legacy light accent stack in blue gradient family", () => {
    expect(legacyCss).toMatch(/--accent:\s*#2563EB;/);
    expect(legacyCss).toMatch(/--accent-secondary:\s*#3B82F6;/);
    expect(legacyCss).toMatch(
      /--accent-gradient:\s*linear-gradient\(135deg,\s*#2563EB,\s*#3B82F6\);/,
    );
    expect(legacyCss).toMatch(
      /--accent-gradient-hover:\s*linear-gradient\(135deg,\s*#1D4ED8,\s*#2563EB\);/,
    );
  });

  it("keeps legacy graph tokens on updated cool spectrum", () => {
    expect(legacyCss).toMatch(/--graph-node-citing:\s*#0EA5E9;/);
    expect(legacyCss).toMatch(/--graph-node-selected:\s*#22C55E;/);
    expect(legacyCss).toMatch(/--graph-node-candidate-pubmed:\s*#3B82F6;/);
    expect(legacyCss).toMatch(/--graph-node-candidate-doaj:\s*#93C5FD;/);
    expect(legacyCss).toMatch(/--graph-node-candidate-wiley:\s*#6366F1;/);
    expect(legacyCss).toMatch(/--graph-node-reference:\s*#38BDF8;/);
    expect(legacyCss).toMatch(/--graph-node-related:\s*#14B8A6;/);
    expect(legacyCss).toMatch(/--graph-node-pvalue:\s*#F59E0B;/);
    expect(legacyCss).toMatch(/--graph-bg:\s*#F8FBFF;/);
    expect(legacyCss).toMatch(/--graph-bg-fullscreen:\s*#F1F6FF;/);
    expect(legacyCss).toMatch(
      /--graph-link-color:\s*rgba\(37,\s*99,\s*235,\s*0\.22\);/,
    );
  });
});
