import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webPackageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as {
  scripts?: Record<string, string>;
};

const responsiveScript = webPackageJson.scripts?.["test:responsive"] ?? "";

const requiredResponsiveTargetsRaw = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "tests/config/responsiveSuiteTargets.json"),
    "utf8",
  ),
) as unknown;

const REQUIRED_RESPONSIVE_TEST_FILES = Array.isArray(
  requiredResponsiveTargetsRaw,
)
  ? requiredResponsiveTargetsRaw.filter(
      (target): target is string => typeof target === "string",
    )
  : [];

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
  it("loads required responsive targets from shared config list", () => {
    expect(REQUIRED_RESPONSIVE_TEST_FILES.length).toBeGreaterThan(0);
    expect(new Set(REQUIRED_RESPONSIVE_TEST_FILES).size).toBe(
      REQUIRED_RESPONSIVE_TEST_FILES.length,
    );
  });

  it("keeps all configured responsive target files present in web workspace", () => {
    for (const target of REQUIRED_RESPONSIVE_TEST_FILES) {
      const targetPath = resolve(process.cwd(), target);
      expect(() => readFileSync(targetPath, "utf8")).not.toThrow();
    }
  });

  it("keeps test:responsive script with clean-js-mirrors pre-step", () => {
    expect(responsiveScript).toContain(
      "pnpm run clean:js-mirrors && vitest run",
    );
  });

  it("keeps all required responsive regression files in test:responsive", () => {
    const responsiveTargets = extractVitestTargets(responsiveScript);
    expect(responsiveTargets).toEqual(REQUIRED_RESPONSIVE_TEST_FILES);
  });

  it("keeps responsive regression targets unique", () => {
    const responsiveTargets = extractVitestTargets(responsiveScript);
    expect(responsiveTargets.length).toBeGreaterThan(0);
    expect(new Set(responsiveTargets).size).toBe(responsiveTargets.length);
  });
});
