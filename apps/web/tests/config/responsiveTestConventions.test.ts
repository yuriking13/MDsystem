import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appLayoutSuiteSource = readFileSync(
  resolve(process.cwd(), "tests/components/AppLayout.test.tsx"),
  "utf8",
);

const adminLayoutSuiteSource = readFileSync(
  resolve(process.cwd(), "tests/pages/AdminLayout.test.tsx"),
  "utf8",
);

describe("responsive layout test conventions", () => {
  it("keeps layout suites wired to shared viewport utility", () => {
    expect(appLayoutSuiteSource).toContain('from "../utils/viewport"');
    expect(adminLayoutSuiteSource).toContain('from "../utils/viewport"');
    expect(appLayoutSuiteSource).toContain("setViewportWidth");
    expect(adminLayoutSuiteSource).toContain("setViewportWidth");
  });

  it("keeps layout suites importing shared responsive matrix fixtures", () => {
    expect(appLayoutSuiteSource).toContain('from "../utils/responsiveMatrix"');
    expect(adminLayoutSuiteSource).toContain(
      'from "../utils/responsiveMatrix"',
    );
  });

  it("keeps AppLayout and AdminLayout suites bound to shared viewport matrices", () => {
    expect(appLayoutSuiteSource).toContain("TARGET_VIEWPORT_WIDTHS");
    expect(adminLayoutSuiteSource).toContain("TARGET_VIEWPORT_WIDTHS");
  });

  it("keeps layout suites free of hard-coded numeric setViewportWidth calls", () => {
    expect(appLayoutSuiteSource).not.toMatch(/setViewportWidth\(\d+\)/);
    expect(adminLayoutSuiteSource).not.toMatch(/setViewportWidth\(\d+\)/);
  });

  it("keeps layout suites aligned with shared mobile helper semantics", () => {
    expect(appLayoutSuiteSource).toContain("isAppMobileViewport");
    expect(adminLayoutSuiteSource).toContain("isAdminMobileViewport");
  });
});
