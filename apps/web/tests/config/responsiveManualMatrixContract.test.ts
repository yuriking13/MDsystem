import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_RESPONSIVE_ROUTE_CASES,
  APP_ADMIN_NO_SHELL_ROUTE_CASES,
  APP_AUTH_ROUTE_CASES,
  APP_FIXED_ROUTE_CASES,
  APP_NON_FIXED_ROUTE_CASES,
  PROJECT_TABS,
  TARGET_VIEWPORT_WIDTHS,
} from "../utils/responsiveMatrix";

type ResponsiveManualMatrixConfig = {
  viewportWidths: number[];
  userRoutes: {
    auth: string[];
    shell: string[];
    projectTabs: string[];
    projectDocumentRoutePattern: string;
    projectGraphRoutePattern: string;
  };
  adminRoutes: string[];
};

const matrixConfig = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "tests/config/responsiveManualMatrix.json"),
    "utf8",
  ),
) as ResponsiveManualMatrixConfig;

describe("responsive manual matrix contract", () => {
  it("keeps matrix config structurally valid and unique", () => {
    expect(matrixConfig.viewportWidths.length).toBeGreaterThan(0);
    expect(new Set(matrixConfig.viewportWidths).size).toBe(
      matrixConfig.viewportWidths.length,
    );
    expect(new Set(matrixConfig.userRoutes.auth).size).toBe(
      matrixConfig.userRoutes.auth.length,
    );
    expect(new Set(matrixConfig.userRoutes.shell).size).toBe(
      matrixConfig.userRoutes.shell.length,
    );
    expect(new Set(matrixConfig.userRoutes.projectTabs).size).toBe(
      matrixConfig.userRoutes.projectTabs.length,
    );
    expect(new Set(matrixConfig.adminRoutes).size).toBe(
      matrixConfig.adminRoutes.length,
    );
  });

  it("keeps viewport matrix aligned with shared responsive fixture widths", () => {
    expect(matrixConfig.viewportWidths).toEqual(TARGET_VIEWPORT_WIDTHS);
  });

  it("keeps user auth and shell route matrix aligned with AppLayout fixtures", () => {
    expect(matrixConfig.userRoutes.auth).toEqual(
      APP_AUTH_ROUTE_CASES.map(({ route }) => route),
    );
    expect(matrixConfig.userRoutes.shell).toEqual(
      APP_NON_FIXED_ROUTE_CASES.map(({ route }) => route),
    );
  });

  it("keeps project tab and fixed route matrix aligned with AppLayout fixtures", () => {
    expect(matrixConfig.userRoutes.projectTabs).toEqual(PROJECT_TABS);

    const documentRoutePattern = new RegExp(
      matrixConfig.userRoutes.projectDocumentRoutePattern,
    );
    const graphRoutePattern = new RegExp(
      matrixConfig.userRoutes.projectGraphRoutePattern,
    );

    expect(
      APP_FIXED_ROUTE_CASES.some(({ route }) =>
        documentRoutePattern.test(route),
      ),
    ).toBe(true);
    expect(
      APP_FIXED_ROUTE_CASES.some(({ route }) => graphRoutePattern.test(route)),
    ).toBe(true);
  });

  it("keeps admin route matrix aligned between app and admin fixtures", () => {
    expect(matrixConfig.adminRoutes).toEqual(
      APP_ADMIN_NO_SHELL_ROUTE_CASES.map(({ route }) => route),
    );
    expect(matrixConfig.adminRoutes).toEqual(
      ADMIN_RESPONSIVE_ROUTE_CASES.map(({ route }) => route),
    );
  });
});
