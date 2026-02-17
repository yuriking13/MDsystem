import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectDetailSource = readFileSync(
  resolve(process.cwd(), "src/pages/ProjectDetailPage.tsx"),
  "utf8",
);

describe("project tabs contract", () => {
  it("keeps tab type union with all core project tabs", () => {
    expect(projectDetailSource).toMatch(
      /type Tab\s*=\s*[\s\S]*?\|\s*"articles"[\s\S]*?\|\s*"documents"[\s\S]*?\|\s*"files"[\s\S]*?\|\s*"statistics"[\s\S]*?\|\s*"graph"[\s\S]*?\|\s*"team"[\s\S]*?\|\s*"settings";/,
    );
  });

  it("keeps query-param based tab routing with articles as default", () => {
    expect(projectDetailSource).toMatch(
      /const activeTab = \(searchParams\.get\("tab"\) as Tab\) \|\| "articles";/,
    );
    expect(projectDetailSource).toMatch(
      /const setActiveTab = \(tab: Tab\) => setSearchParams\(\{ tab \}\);/,
    );
  });

  it("keeps conditional render branches for all smoke-checklist tabs", () => {
    const requiredBranches = [
      'activeTab === "articles"',
      'activeTab === "documents"',
      'activeTab === "files"',
      'activeTab === "statistics"',
      'activeTab === "graph"',
      'activeTab === "settings"',
    ];

    for (const branch of requiredBranches) {
      expect(projectDetailSource).toContain(branch);
    }
  });
});
