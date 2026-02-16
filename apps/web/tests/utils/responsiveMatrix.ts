export const TARGET_VIEWPORT_WIDTHS = [
  360, 390, 768, 1024, 1280, 1440, 1920,
] as const;

export const MOBILE_VIEWPORT_WIDTHS = [360, 390, 768] as const;

export const PROJECT_TAB_CASES = [
  { tab: "articles", shouldLockLayout: false },
  { tab: "documents", shouldLockLayout: false },
  { tab: "files", shouldLockLayout: false },
  { tab: "statistics", shouldLockLayout: false },
  { tab: "settings", shouldLockLayout: false },
  { tab: "graph", shouldLockLayout: true },
] as const;

export const PROJECT_TABS = PROJECT_TAB_CASES.map((item) => item.tab);

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
