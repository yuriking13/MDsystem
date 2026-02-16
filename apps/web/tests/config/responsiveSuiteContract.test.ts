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

  it("keeps test:responsive script delegated to config-driven runner", () => {
    expect(responsiveScript).toBe("node scripts/run-responsive-suite.mjs");
  });
});
