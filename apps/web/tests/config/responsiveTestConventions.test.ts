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

  it("keeps AppLayout suite anchored to shared width and boundary fixtures", () => {
    expect(appLayoutSuiteSource).toContain("MOBILE_VIEWPORT_WIDTHS");
    expect(appLayoutSuiteSource).toContain("DESKTOP_VIEWPORT_WIDTHS");
    expect(appLayoutSuiteSource).toContain("TARGET_VIEWPORT_WIDTHS");
    expect(appLayoutSuiteSource).toContain("APP_DRAWER_BOUNDARY_CASES");
  });

  it("keeps AdminLayout suite anchored to shared width and boundary fixtures", () => {
    expect(adminLayoutSuiteSource).toContain("MOBILE_VIEWPORT_WIDTHS");
    expect(adminLayoutSuiteSource).toContain("TARGET_VIEWPORT_WIDTHS");
    expect(adminLayoutSuiteSource).toContain("ADMIN_DRAWER_VIEWPORT_CASES");
    expect(adminLayoutSuiteSource).toContain("ADMIN_DRAWER_BOUNDARY_CASES");
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

  it("keeps layout suites free of inline numeric viewport arrays in loops", () => {
    expect(appLayoutSuiteSource).not.toMatch(
      /for\s*\(\s*const\s+\w+\s+of\s+\[[^\]]*\d/,
    );
    expect(adminLayoutSuiteSource).not.toMatch(
      /for\s*\(\s*const\s+\w+\s+of\s+\[[^\]]*\d/,
    );
    expect(appLayoutSuiteSource).not.toMatch(/(it|test)\.each\(\s*\[[^\]]*\d/);
    expect(adminLayoutSuiteSource).not.toMatch(
      /(it|test)\.each\(\s*\[[^\]]*\d/,
    );
  });

  it("keeps AppLayout suite exercising required route matrices across target widths", () => {
    expect(appLayoutSuiteSource).toMatch(
      /it\.each\(APP_NON_FIXED_ROUTE_CASES\)/,
    );
    expect(appLayoutSuiteSource).toMatch(/it\.each\(APP_FIXED_ROUTE_CASES\)/);
    expect(appLayoutSuiteSource).toMatch(/it\.each\(PROJECT_TABS\)/);
    expect(appLayoutSuiteSource).toMatch(/it\.each\(APP_AUTH_ROUTE_CASES\)/);
    expect(appLayoutSuiteSource).toMatch(
      /it\.each\(APP_ADMIN_NO_SHELL_ROUTE_CASES\)/,
    );
    expect(appLayoutSuiteSource).toMatch(
      /for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
    );
  });

  it("keeps AdminLayout suite exercising route and title matrices across shared widths", () => {
    expect(adminLayoutSuiteSource).toMatch(
      /it\.each\(\s*ADMIN_RESPONSIVE_ROUTE_CASES\.map\(\(\{\s*route,\s*pageLabel\s*\}\)\s*=>\s*\[/,
    );
    expect(adminLayoutSuiteSource).toMatch(
      /it\.each\(\s*ADMIN_RESPONSIVE_ROUTE_CASES\.map\(\(\{\s*route,\s*pageLabel,\s*mobileTitle\s*\}\)\s*=>\s*\[/,
    );
    expect(adminLayoutSuiteSource).toMatch(
      /for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
    );
    expect(adminLayoutSuiteSource).toMatch(
      /for\s*\(\s*const\s+\w+\s+of\s+MOBILE_VIEWPORT_WIDTHS\s*\)/,
    );
  });
});
