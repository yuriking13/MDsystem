import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = resolve(process.cwd(), "src");
const TARGET_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);

const FORBIDDEN_WARM_TOKENS: Array<{ label: string; pattern: RegExp }> = [
  { label: "#C87D2A", pattern: /#C87D2A/gi },
  { label: "#D99A3A", pattern: /#D99A3A/gi },
  { label: "#F5BA5C", pattern: /#F5BA5C/gi },
  { label: "#FFEFD5", pattern: /#FFEFD5/gi },
  { label: "#FFF8EC", pattern: /#FFF8EC/gi },
  { label: "#FDFCFB", pattern: /#FDFCFB/gi },
  { label: "#2D1F10", pattern: /#2D1F10/gi },
  { label: "#6B5744", pattern: /#6B5744/gi },
  { label: "#A89580", pattern: /#A89580/gi },
  {
    label: "rgba(200, 125, 42, ...)",
    pattern: /rgba\(\s*200\s*,\s*125\s*,\s*42\s*,/gi,
  },
  {
    label: "rgba(224, 214, 202, ...)",
    pattern: /rgba\(\s*224\s*,\s*214\s*,\s*202\s*,/gi,
  },
  {
    label: "rgba(245, 186, 92, ...)",
    pattern: /rgba\(\s*245\s*,\s*186\s*,\s*92\s*,/gi,
  },
];

function collectSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && TARGET_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("forbidden warm palette token guard", () => {
  it("keeps removed warm light-theme tokens out of src files", () => {
    const sourceFiles = collectSourceFiles(SRC_DIR);
    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, "utf8");

      for (const { label, pattern } of FORBIDDEN_WARM_TOKENS) {
        const matchCount = content.match(pattern)?.length ?? 0;
        if (matchCount > 0) {
          violations.push(`${label} x${matchCount} in ${filePath}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
