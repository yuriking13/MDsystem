import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tailwindConfig = readFileSync(
  resolve(process.cwd(), "tailwind.config.js"),
  "utf8",
);

describe("light theme tailwind config contract", () => {
  it("keeps dark mode strategy bound to class + data-theme", () => {
    expect(tailwindConfig).toMatch(
      /darkMode:\s*\['class',\s*'\[data-theme="dark"\]'\]/,
    );
  });

  it("keeps primary palette on blue gradient scale", () => {
    expect(tailwindConfig).toMatch(/primary:\s*\{[\s\S]*?50:\s*'#EFF6FF'/);
    expect(tailwindConfig).toMatch(/primary:\s*\{[\s\S]*?500:\s*'#3B82F6'/);
    expect(tailwindConfig).toMatch(/primary:\s*\{[\s\S]*?700:\s*'#1D4ED8'/);
    expect(tailwindConfig).toMatch(/primary:\s*\{[\s\S]*?950:\s*'#172554'/);
  });

  it("keeps neutral palette on slate spectrum", () => {
    expect(tailwindConfig).toMatch(/neutral:\s*\{[\s\S]*?50:\s*'#F8FAFC'/);
    expect(tailwindConfig).toMatch(/neutral:\s*\{[\s\S]*?200:\s*'#E2E8F0'/);
    expect(tailwindConfig).toMatch(/neutral:\s*\{[\s\S]*?600:\s*'#475569'/);
    expect(tailwindConfig).toMatch(/neutral:\s*\{[\s\S]*?900:\s*'#0F172A'/);
    expect(tailwindConfig).toMatch(/neutral:\s*\{[\s\S]*?950:\s*'#020617'/);
  });

  it("does not regress into removed warm primary literals", () => {
    const removedWarmTokens = ["#C87D2A", "#D99A3A", "#F5BA5C", "#FFEFD5"];

    for (const token of removedWarmTokens) {
      expect(tailwindConfig).not.toContain(token);
    }
  });
});
