import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webPackageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as {
  scripts?: Record<string, string>;
};

const responsiveScript = webPackageJson.scripts?.["test:responsive"] ?? "";

const REQUIRED_RESPONSIVE_TEST_FILES = [
  "src/lib/responsive.test.ts",
  "tests/components/AppLayout.test.tsx",
  "tests/pages/AdminLayout.test.tsx",
  "tests/components/AppSidebar.test.tsx",
  "tests/styles/articlesLayout.test.ts",
  "tests/styles/legacyResponsiveSafeguards.test.ts",
  "tests/styles/layoutResponsiveShell.test.ts",
  "tests/styles/docsAndGraphResponsive.test.ts",
  "tests/styles/projectsAndSettingsResponsive.test.ts",
  "tests/styles/adminPagesResponsive.test.ts",
  "tests/styles/authResponsive.test.ts",
  "tests/utils/responsiveMatrix.test.ts",
  "tests/utils/viewport.test.ts",
  "tests/config/responsiveSuiteContract.test.ts",
  "tests/config/responsiveTestConventions.test.ts",
] as const;

function extractVitestTargets(command: string): string[] {
  const marker = "vitest run";
  const markerIndex = command.indexOf(marker);
  if (markerIndex === -1) {
    return [];
  }

  const targetSlice = command.slice(markerIndex + marker.length).trim();
  if (!targetSlice) {
    return [];
  }

  return targetSlice
    .split(/\s+/)
    .filter((token) => token.endsWith(".ts") || token.endsWith(".tsx"));
}

describe("responsive suite command contract", () => {
  it("keeps test:responsive script with clean-js-mirrors pre-step", () => {
    expect(responsiveScript).toContain(
      "pnpm run clean:js-mirrors && vitest run",
    );
  });

  it("keeps all required responsive regression files in test:responsive", () => {
    const responsiveTargets = extractVitestTargets(responsiveScript);
    expect(responsiveTargets).toEqual(
      expect.arrayContaining(REQUIRED_RESPONSIVE_TEST_FILES),
    );
  });

  it("keeps responsive regression targets unique", () => {
    const responsiveTargets = extractVitestTargets(responsiveScript);
    expect(responsiveTargets.length).toBeGreaterThan(0);
    expect(new Set(responsiveTargets).size).toBe(responsiveTargets.length);
  });
});
