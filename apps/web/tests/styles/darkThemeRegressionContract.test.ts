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
      /\[data-theme="dark"\]\s*\{[\s\S]*?--color-background:\s*10 22 40;\s*\/\* #0A1628 \*\/[\s\S]*?--color-background-secondary:\s*13 27 42;\s*\/\* #0D1B2A \*\/[\s\S]*?--color-background-tertiary:\s*22 34 54;\s*\/\* #162236 \*\//,
    );
    expect(indexCss).toMatch(
      /\[data-theme="dark"\]\s*\{[\s\S]*?--color-text-primary:\s*248 250 252;\s*\/\* #F8FAFC \*\/[\s\S]*?--color-text-secondary:\s*203 213 225;\s*\/\* #CBD5E1 \*\/[\s\S]*?--color-text-tertiary:\s*148 163 184;\s*\/\* #94A3B8 \*\//,
    );
  });

  it("keeps default body fallback in dark mode colors", () => {
    expect(indexCss).toMatch(
      /body\s*\{[\s\S]*?@apply text-neutral-50;[\s\S]*?background-color:\s*#0a1628;/,
    );
  });

  it("keeps legacy root dark palette tokens for glass surfaces and accents", () => {
    expect(rootDarkBlockMatch).not.toBeNull();
    expect(rootDarkBlock).toMatch(/--bg-primary:\s*#0a1628;/);
    expect(rootDarkBlock).toMatch(
      /--bg-secondary:\s*rgba\(13,\s*27,\s*42,\s*0\.9\);/,
    );
    expect(rootDarkBlock).toMatch(/--text-primary:\s*#e8f0ff;/);
    expect(rootDarkBlock).toMatch(/--accent:\s*#4b74ff;/);
    expect(rootDarkBlock).toMatch(
      /--accent-gradient:\s*linear-gradient\(135deg,\s*#4b74ff,\s*#7c3aed\);/,
    );
  });

  it("keeps dark graph tokens and prevents light graph canvas bleed into dark root", () => {
    expect(rootDarkBlock).toMatch(/--graph-bg:\s*#0b0f19;/);
    expect(rootDarkBlock).toMatch(/--graph-bg-fullscreen:\s*#050810;/);
    expect(rootDarkBlock).toMatch(/--graph-panel-bg:\s*#0f172a;/);
    expect(rootDarkBlock).toMatch(
      /--graph-link-color:\s*rgba\(100,\s*130,\s*180,\s*0\.25\);/,
    );

    expect(rootDarkBlock).not.toMatch(/--graph-bg:\s*#F8FBFF;/);
    expect(rootDarkBlock).not.toMatch(/--graph-bg-fullscreen:\s*#F1F6FF;/);
    expect(rootDarkBlock).not.toMatch(/--graph-panel-bg:\s*#F7FAFF;/);
  });
});
