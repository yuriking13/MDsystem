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

const rootDarkBlockMatch = legacyCss.match(
  /:root\s*\{([\s\S]*?)\/\* ===== LIGHT THEME ===== \*\//,
);
const rootDarkBlock = rootDarkBlockMatch?.[1] ?? "";

describe("dark theme regression contract", () => {
  it("keeps index.css dark theme token hierarchy intact", () => {
    expect(indexCss).toMatch(
      /\[data-theme="dark"\]\s*\{[\s\S]*?--color-background:\s*2 26 25;\s*\/\* #021A19 \*\/[\s\S]*?--color-background-secondary:\s*3 31 29;\s*\/\* #031F1D \*\/[\s\S]*?--color-background-tertiary:\s*5 45 42;\s*\/\* #052D2A \*\//,
    );
    expect(indexCss).toMatch(
      /\[data-theme="dark"\]\s*\{[\s\S]*?--color-text-primary:\s*248 250 252;\s*\/\* #F8FAFC \*\/[\s\S]*?--color-text-secondary:\s*203 213 225;\s*\/\* #CBD5E1 \*\/[\s\S]*?--color-text-tertiary:\s*148 163 184;\s*\/\* #94A3B8 \*\//,
    );
  });

  it("keeps default body fallback in dark mode colors", () => {
    expect(indexCss).toMatch(
      /body\s*\{[\s\S]*?@apply text-neutral-50;[\s\S]*?background-color:\s*#021A19;/,
    );
  });

  it("keeps legacy root dark palette tokens for glass surfaces and accents", () => {
    expect(rootDarkBlockMatch).not.toBeNull();
    expect(rootDarkBlock).toMatch(/--bg-primary:\s*#021A19;/);
    expect(rootDarkBlock).toMatch(
      /--bg-secondary:\s*rgba\(3, 31, 29,\s*0\.9\);/,
    );
    expect(rootDarkBlock).toMatch(/--text-primary:\s*#e8f0ff;/);
    expect(rootDarkBlock).toMatch(/--accent:\s*#00D4C8;/);
    expect(rootDarkBlock).toMatch(
      /--accent-gradient:\s*linear-gradient\(135deg,\s*#00D4C8,\s*#0D9488\);/,
    );
  });

  it("keeps dark graph tokens and prevents light graph canvas bleed into dark root", () => {
    expect(rootDarkBlock).toMatch(/--graph-bg:\s*#0b0f19;/);
    expect(rootDarkBlock).toMatch(/--graph-bg-fullscreen:\s*#050810;/);
    expect(rootDarkBlock).toMatch(/--graph-panel-bg:\s*#0f172a;/);
    expect(rootDarkBlock).toMatch(
      /--graph-link-color:\s*rgba\(100,\s*130,\s*180,\s*0\.25\);/,
    );

    expect(rootDarkBlock).not.toMatch(/--graph-bg:\s*#F5FFFE;/);
    expect(rootDarkBlock).not.toMatch(/--graph-bg-fullscreen:\s*#F0FFFD;/);
    expect(rootDarkBlock).not.toMatch(/--graph-panel-bg:\s*#F7FAFF;/);
  });
});
