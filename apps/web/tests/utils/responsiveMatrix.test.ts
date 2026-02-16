import { describe, expect, it } from "vitest";
import {
  ADMIN_DRAWER_BOUNDARY_CASES,
  ADMIN_DRAWER_MAX_WIDTH,
  ADMIN_DRAWER_VIEWPORT_CASES,
  ADMIN_RESPONSIVE_ROUTE_CASES,
  APP_DRAWER_BOUNDARY_CASES,
  APP_DRAWER_MAX_WIDTH,
  APP_DRAWER_VIEWPORT_CASES,
  APP_ADMIN_NO_SHELL_ROUTE_CASES,
  APP_AUTH_ROUTE_CASES,
  DESKTOP_VIEWPORT_WIDTHS,
  APP_FIXED_ROUTE_CASES,
  APP_NON_FIXED_ROUTE_CASES,
  MOBILE_VIEWPORT_WIDTHS,
  PROJECT_TAB_CASES,
  PROJECT_TABS,
  TARGET_VIEWPORT_WIDTHS,
} from "./responsiveMatrix";

describe("responsive matrix test fixtures", () => {
  it("keeps target viewport widths sorted and unique", () => {
    expect(TARGET_VIEWPORT_WIDTHS).toEqual([
      360, 390, 768, 1024, 1280, 1440, 1920,
    ]);
  });

  it("keeps mobile viewport widths as a subset of target widths", () => {
    expect(APP_DRAWER_MAX_WIDTH).toBe(768);
    expect(ADMIN_DRAWER_MAX_WIDTH).toBe(900);
    expect(MOBILE_VIEWPORT_WIDTHS).toEqual([360, 390, APP_DRAWER_MAX_WIDTH]);
    expect(DESKTOP_VIEWPORT_WIDTHS).toEqual([1024, 1280, 1440, 1920]);
    expect(APP_DRAWER_BOUNDARY_CASES).toEqual([
      [APP_DRAWER_MAX_WIDTH, true],
      [APP_DRAWER_MAX_WIDTH + 1, false],
    ]);
    expect(ADMIN_DRAWER_BOUNDARY_CASES).toEqual([
      [ADMIN_DRAWER_MAX_WIDTH, true],
      [ADMIN_DRAWER_MAX_WIDTH + 1, false],
    ]);
    expect(APP_DRAWER_VIEWPORT_CASES).toEqual([
      [360, true],
      [390, true],
      [768, true],
      [1024, false],
      [1280, false],
      [1440, false],
      [1920, false],
    ]);
    expect(ADMIN_DRAWER_VIEWPORT_CASES).toEqual([
      [360, true],
      [390, true],
      [768, true],
      [1024, false],
      [1280, false],
      [1440, false],
      [1920, false],
    ]);
    expect(
      MOBILE_VIEWPORT_WIDTHS.every((width) =>
        TARGET_VIEWPORT_WIDTHS.includes(width),
      ),
    ).toBe(true);
  });

  it("keeps project tab coverage and lock-layout mapping", () => {
    expect(PROJECT_TABS).toEqual([
      "articles",
      "documents",
      "files",
      "statistics",
      "settings",
      "graph",
    ]);
    expect(PROJECT_TAB_CASES).toEqual([
      { tab: "articles", shouldLockLayout: false },
      { tab: "documents", shouldLockLayout: false },
      { tab: "files", shouldLockLayout: false },
      { tab: "statistics", shouldLockLayout: false },
      { tab: "settings", shouldLockLayout: false },
      { tab: "graph", shouldLockLayout: true },
    ]);
  });

  it("keeps app shell route matrices for non-fixed, fixed, and auth routes", () => {
    expect(APP_NON_FIXED_ROUTE_CASES.map(({ route }) => route)).toEqual([
      "/projects",
      "/settings",
      "/docs",
    ]);
    expect(APP_FIXED_ROUTE_CASES).toEqual([
      {
        route: "/projects/p1/documents/d1",
        pageLabel: "Document editor page",
        shouldLockLayout: true,
      },
      {
        route: "/projects/p1?tab=graph",
        pageLabel: "Project details page",
        shouldLockLayout: true,
      },
    ]);
    expect(APP_AUTH_ROUTE_CASES.map(({ route }) => route)).toEqual([
      "/login",
      "/register",
    ]);
  });

  it("keeps app admin no-shell route coverage matrix", () => {
    expect(APP_ADMIN_NO_SHELL_ROUTE_CASES.map(({ route }) => route)).toEqual([
      "/admin",
      "/admin/users",
      "/admin/projects",
      "/admin/articles",
      "/admin/activity",
      "/admin/sessions",
      "/admin/jobs",
      "/admin/errors",
      "/admin/audit",
      "/admin/system",
      "/admin/settings",
    ]);
  });

  it("keeps admin responsive route matrix aligned with mobile titles", () => {
    expect(ADMIN_RESPONSIVE_ROUTE_CASES).toEqual([
      {
        route: "/admin",
        pageLabel: "Admin dashboard",
        mobileTitle: "Дашборд",
      },
      {
        route: "/admin/users",
        pageLabel: "Users page",
        mobileTitle: "Пользователи",
      },
      {
        route: "/admin/projects",
        pageLabel: "Projects page",
        mobileTitle: "Проекты",
      },
      {
        route: "/admin/articles",
        pageLabel: "Articles page",
        mobileTitle: "Статьи",
      },
      {
        route: "/admin/activity",
        pageLabel: "Activity page",
        mobileTitle: "Активность",
      },
      {
        route: "/admin/sessions",
        pageLabel: "Sessions page",
        mobileTitle: "Сессии",
      },
      {
        route: "/admin/jobs",
        pageLabel: "Jobs page",
        mobileTitle: "Задачи",
      },
      {
        route: "/admin/errors",
        pageLabel: "Errors page",
        mobileTitle: "Ошибки",
      },
      {
        route: "/admin/audit",
        pageLabel: "Audit page",
        mobileTitle: "Аудит",
      },
      {
        route: "/admin/system",
        pageLabel: "System page",
        mobileTitle: "Система",
      },
      {
        route: "/admin/settings",
        pageLabel: "Settings page",
        mobileTitle: "Настройки",
      },
    ]);
  });
});
