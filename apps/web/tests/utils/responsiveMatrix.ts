import {
  ADMIN_MOBILE_MAX_WIDTH,
  APP_MOBILE_MAX_WIDTH,
  isAdminMobileViewport,
  isAppMobileViewport,
} from "../../src/lib/responsive";

export const TARGET_VIEWPORT_WIDTHS = [
  360, 390, 768, 1024, 1280, 1440, 1920,
] as const;

export const MOBILE_VIEWPORT_WIDTHS = [360, 390, APP_MOBILE_MAX_WIDTH] as const;
export const DESKTOP_VIEWPORT_WIDTHS = [1024, 1280, 1440, 1920] as const;
export const APP_DRAWER_MAX_WIDTH = APP_MOBILE_MAX_WIDTH;
export const ADMIN_DRAWER_MAX_WIDTH = ADMIN_MOBILE_MAX_WIDTH;
export const APP_DRAWER_BOUNDARY_CASES = [
  [APP_DRAWER_MAX_WIDTH, true],
  [APP_DRAWER_MAX_WIDTH + 1, false],
] as const;
export const ADMIN_DRAWER_BOUNDARY_CASES = [
  [ADMIN_DRAWER_MAX_WIDTH, true],
  [ADMIN_DRAWER_MAX_WIDTH + 1, false],
] as const;
export const APP_DRAWER_VIEWPORT_CASES = TARGET_VIEWPORT_WIDTHS.map(
  (width) => [width, isAppMobileViewport(width)] as const,
);
export const ADMIN_DRAWER_VIEWPORT_CASES = TARGET_VIEWPORT_WIDTHS.map(
  (width) => [width, isAdminMobileViewport(width)] as const,
);

export const PROJECT_TAB_CASES = [
  { tab: "articles", shouldLockLayout: false },
  { tab: "documents", shouldLockLayout: false },
  { tab: "files", shouldLockLayout: false },
  { tab: "statistics", shouldLockLayout: false },
  { tab: "settings", shouldLockLayout: false },
  { tab: "graph", shouldLockLayout: true },
] as const;

export const PROJECT_TABS = PROJECT_TAB_CASES.map((item) => item.tab);

export const PROJECT_CONTEXT_RESET_DESTINATION_CASES = [
  {
    linkLabel: "Go settings",
    pageLabel: "Settings page",
  },
  {
    linkLabel: "Go projects",
    pageLabel: "Projects page",
  },
  {
    linkLabel: "Go docs",
    pageLabel: "Docs page",
  },
] as const;

export const APP_NON_FIXED_ROUTE_CASES = [
  { route: "/projects", pageLabel: "Projects page" },
  { route: "/settings", pageLabel: "Settings page" },
  { route: "/docs", pageLabel: "Docs page" },
] as const;

export const APP_FIXED_ROUTE_CASES = [
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
] as const;

export const APP_AUTH_ROUTE_CASES = [
  { route: "/login", pageLabel: "Login page" },
  { route: "/register", pageLabel: "Register page" },
] as const;

export const APP_ADMIN_NO_SHELL_ROUTE_CASES = [
  { route: "/admin", pageLabel: "Admin route content" },
  { route: "/admin/users", pageLabel: "Admin users content" },
  { route: "/admin/projects", pageLabel: "Admin projects content" },
  { route: "/admin/articles", pageLabel: "Admin articles content" },
  { route: "/admin/activity", pageLabel: "Admin activity content" },
  { route: "/admin/sessions", pageLabel: "Admin sessions content" },
  { route: "/admin/jobs", pageLabel: "Admin jobs content" },
  { route: "/admin/errors", pageLabel: "Admin errors content" },
  { route: "/admin/audit", pageLabel: "Admin audit content" },
  { route: "/admin/system", pageLabel: "Admin system content" },
  { route: "/admin/settings", pageLabel: "Admin settings content" },
] as const;

export const ADMIN_RESPONSIVE_ROUTE_CASES = [
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
] as const;
