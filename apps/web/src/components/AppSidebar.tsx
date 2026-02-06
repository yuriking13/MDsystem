import React, { useState, useEffect } from "react";
import {
  NavLink,
  useLocation,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { cn } from "../design-system/utils/cn";
import {
  FolderIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ArchiveBoxIcon,
  FolderOpenIcon,
  ChartBarIcon,
  ShareIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ListBulletIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../lib/AuthContext";
import { useProjectContext, type ArticleViewStatus } from "./AppLayout";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab?: string;
  path?: string;
}

interface AppSidebarProps {
  className?: string;
  projectName?: string;
  projectRole?: string;
  projectUpdatedAt?: string;
}

export default function AppSidebar({
  className,
  projectName,
  projectRole,
  projectUpdatedAt,
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: projectId } = useParams<{ id: string }>();
  const [collapsed, setCollapsed] = useState(false);
  const [articlesSubMenuOpen, setArticlesSubMenuOpen] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    const theme = localStorage.getItem("theme");
    return theme !== "light";
  });

  const { articleCounts, articleViewStatus, setArticleViewStatus } =
    useProjectContext();

  // Sync collapsed state to body class for CSS positioning
  React.useEffect(() => {
    if (collapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [collapsed]);

  // Check if we're inside a project
  const isInProject = location.pathname.startsWith("/projects/") && projectId;
  const currentTab = searchParams.get("tab") || "articles";

  // Article status sub-menu items
  const articleStatusItems: {
    id: ArticleViewStatus;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }[] = [
    {
      id: "candidate",
      label: "Кандидаты",
      icon: ClipboardDocumentListIcon,
      count: articleCounts.candidate,
    },
    {
      id: "selected",
      label: "Отобранные",
      icon: CheckCircleIcon,
      count: articleCounts.selected,
    },
    {
      id: "excluded",
      label: "Исключённые",
      icon: XCircleIcon,
      count: articleCounts.excluded,
    },
    {
      id: "all",
      label: "Все",
      icon: ListBulletIcon,
      count: articleCounts.total,
    },
    {
      id: "deleted",
      label: "Корзина",
      icon: TrashIcon,
      count: articleCounts.deleted,
    },
  ];

  // Main navigation items
  const mainNavItems: NavItem[] = [
    {
      id: "projects",
      label: "Проекты",
      icon: FolderIcon,
      path: "/projects",
    },
    {
      id: "docs",
      label: "Документация",
      icon: BookOpenIcon,
      path: "/docs",
    },
    {
      id: "settings",
      label: "Настройки",
      icon: Cog6ToothIcon,
      path: "/settings",
    },
  ];

  // Project-specific navigation items
  const projectNavItems: NavItem[] = [
    {
      id: "articles",
      label: "База статей",
      icon: ArchiveBoxIcon,
      tab: "articles",
    },
    {
      id: "documents",
      label: "Документы",
      icon: DocumentTextIcon,
      tab: "documents",
    },
    {
      id: "files",
      label: "Файлы",
      icon: FolderOpenIcon,
      tab: "files",
    },
    {
      id: "statistics",
      label: "Статистика",
      icon: ChartBarIcon,
      tab: "statistics",
    },
    {
      id: "graph",
      label: "Граф цитирований",
      icon: ShareIcon,
      tab: "graph",
    },
    {
      id: "settings",
      label: "Настройки проекта",
      icon: Cog6ToothIcon,
      tab: "settings",
    },
  ];

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    // Disable all CSS transitions for instant theme switch (no visual lag)
    document.documentElement.classList.add("no-transitions");

    if (newIsDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light-theme");
      document.body.classList.add("dark");
      document.body.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light-theme");
      document.body.classList.remove("dark");
      document.body.classList.add("light-theme");
      localStorage.setItem("theme", "light");
    }

    // Force a reflow so styles apply immediately, then re-enable transitions
    // This double-rAF ensures the browser has painted the new theme before transitions resume
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transitions");
      });
    });
  };

  // Sync theme on mount
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const shouldBeDark = theme !== "light";
    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light-theme");
      document.body.classList.add("light-theme");
    }
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleNavClick = (item: NavItem) => {
    if (item.tab) {
      // Update URL search params for project tabs
      setSearchParams({ tab: item.tab });
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const navItems = isInProject ? projectNavItems : mainNavItems;

  return (
    <aside
      className={cn(
        "app-sidebar",
        collapsed && "app-sidebar--collapsed",
        className,
      )}
    >
      {/* Neon Glass Glow Elements */}
      <span className="sidebar-shine sidebar-shine--top" />
      <span className="sidebar-shine sidebar-shine--bottom" />
      <span className="sidebar-glow sidebar-glow--top" />
      <span className="sidebar-glow sidebar-glow--bottom" />
      <span className="sidebar-glow sidebar-glow--bright sidebar-glow--top" />
      <span className="sidebar-glow sidebar-glow--bright sidebar-glow--bottom" />

      {/* Collapse Button - Center of right edge */}
      <button
        className="sidebar-collapse-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Развернуть" : "Свернуть"}
      >
        {collapsed ? (
          <ChevronRightIcon className="w-4 h-4" />
        ) : (
          <ChevronLeftIcon className="w-4 h-4" />
        )}
      </button>

      {/* Logo / Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          {!collapsed && <span className="sidebar-logo-text">MDsystem</span>}
        </div>
      </div>

      {/* Project Info (when in project) */}
      {isInProject && (
        <div className="sidebar-project">
          <button
            className="sidebar-back-btn"
            onClick={() => navigate("/projects")}
            title="Назад к проектам"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {!collapsed && <span>К проектам</span>}
          </button>
          {!collapsed && projectName && (
            <>
              <div className="sidebar-project-name" title={projectName}>
                {projectName}
              </div>
              {(projectRole || projectUpdatedAt) && (
                <div className="sidebar-project-meta">
                  {projectRole && (
                    <span className="sidebar-project-role">{projectRole}</span>
                  )}
                  {projectUpdatedAt && (
                    <span className="sidebar-project-date">
                      Обновлён:{" "}
                      {new Date(projectUpdatedAt).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {navItems.map((item) => {
            const isActive = isInProject
              ? item.tab === currentTab
              : location.pathname.startsWith(item.path || "");
            const Icon = item.icon;
            const isArticlesItem = isInProject && item.id === "articles";

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    handleNavClick(item);
                    if (isArticlesItem) {
                      setArticlesSubMenuOpen(!articlesSubMenuOpen);
                    }
                  }}
                  className={cn(
                    "sidebar-nav-item",
                    isActive && "sidebar-nav-item--active",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="sidebar-nav-icon" />
                  {!collapsed && (
                    <span className="sidebar-nav-label">{item.label}</span>
                  )}
                  {!collapsed && isArticlesItem && (
                    <ChevronDownIcon
                      className={cn(
                        "w-4 h-4 ml-auto transition-transform duration-200",
                        !articlesSubMenuOpen && "-rotate-90",
                      )}
                    />
                  )}
                </button>
                {/* Article status sub-menu */}
                {isArticlesItem &&
                  articlesSubMenuOpen &&
                  currentTab === "articles" && (
                    <ul className="sidebar-submenu">
                      {articleStatusItems.map((statusItem) => {
                        const StatusIcon = statusItem.icon;
                        const isStatusActive =
                          articleViewStatus === statusItem.id;
                        return (
                          <li key={statusItem.id}>
                            <button
                              onClick={() => {
                                setArticleViewStatus(statusItem.id);
                                if (currentTab !== "articles") {
                                  setSearchParams({ tab: "articles" });
                                }
                              }}
                              className={cn(
                                "sidebar-submenu-item",
                                isStatusActive &&
                                  "sidebar-submenu-item--active",
                              )}
                              title={
                                collapsed
                                  ? `${statusItem.label} (${statusItem.count})`
                                  : undefined
                              }
                            >
                              {!collapsed ? (
                                <>
                                  <StatusIcon className="sidebar-submenu-icon" />
                                  <span className="sidebar-submenu-label">
                                    {statusItem.label}
                                  </span>
                                  <span className="sidebar-submenu-badge">
                                    {statusItem.count}
                                  </span>
                                </>
                              ) : (
                                <StatusIcon className="sidebar-submenu-icon" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Theme Switcher */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: collapsed ? "0 4px" : "0 6px",
          }}
        >
          <fieldset
            className="theme-switcher"
            data-active={isDark ? "dark" : "light"}
          >
            <legend className="theme-switcher__legend">Выберите тему</legend>
            <label className="theme-switcher__option">
              <input
                className="theme-switcher__input"
                type="radio"
                name="theme-toggle"
                value="light"
                checked={!isDark}
                onChange={() => {
                  if (isDark) toggleTheme();
                }}
              />
              <svg
                className="theme-switcher__icon"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 36 36"
              >
                <path
                  fill="var(--c)"
                  fillRule="evenodd"
                  d="M18 12a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                  clipRule="evenodd"
                />
                <path
                  fill="var(--c)"
                  d="M17 6.038a1 1 0 1 1 2 0v3a1 1 0 0 1-2 0v-3ZM24.244 7.742a1 1 0 1 1 1.618 1.176L24.1 11.345a1 1 0 1 1-1.618-1.176l1.763-2.427ZM29.104 13.379a1 1 0 0 1 .618 1.902l-2.854.927a1 1 0 1 1-.618-1.902l2.854-.927ZM29.722 20.795a1 1 0 0 1-.619 1.902l-2.853-.927a1 1 0 1 1 .618-1.902l2.854.927ZM25.862 27.159a1 1 0 0 1-1.618 1.175l-1.763-2.427a1 1 0 1 1 1.618-1.175l1.763 2.427ZM19 30.038a1 1 0 0 1-2 0v-3a1 1 0 1 1 2 0v3ZM11.755 28.334a1 1 0 0 1-1.618-1.175l1.764-2.427a1 1 0 1 1 1.618 1.175l-1.764 2.427ZM6.896 22.697a1 1 0 1 1-.618-1.902l2.853-.927a1 1 0 1 1 .618 1.902l-2.853.927ZM6.278 15.28a1 1 0 1 1 .618-1.901l2.853.927a1 1 0 1 1-.618 1.902l-2.853-.927ZM10.137 8.918a1 1 0 0 1 1.618-1.176l1.764 2.427a1 1 0 0 1-1.618 1.176l-1.764-2.427Z"
                />
              </svg>
            </label>
            <label className="theme-switcher__option">
              <input
                className="theme-switcher__input"
                type="radio"
                name="theme-toggle"
                value="dark"
                checked={isDark}
                onChange={() => {
                  if (!isDark) toggleTheme();
                }}
              />
              <svg
                className="theme-switcher__icon"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 36 36"
              >
                <path
                  fill="var(--c)"
                  d="M12.5 8.473a10.968 10.968 0 0 1 8.785-.97 7.435 7.435 0 0 0-3.737 4.672l-.09.373A7.454 7.454 0 0 0 28.732 20.4a10.97 10.97 0 0 1-5.232 7.125l-.497.27c-5.014 2.566-11.175.916-14.234-3.813l-.295-.483C5.53 18.403 7.13 11.93 12.017 8.77l.483-.297Zm4.234.616a8.946 8.946 0 0 0-2.805.883l-.429.234A9 9 0 0 0 10.206 22.5l.241.395A9 9 0 0 0 22.5 25.794l.416-.255a8.94 8.94 0 0 0 2.167-1.99 9.433 9.433 0 0 1-2.782-.313c-5.043-1.352-8.036-6.535-6.686-11.578l.147-.491c.242-.745.573-1.44.972-2.078Z"
                />
              </svg>
            </label>
          </fieldset>
        </div>

        {/* User Profile */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              <UserCircleIcon className="w-7 h-7" />
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-email">{user.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          className="sidebar-footer-btn sidebar-logout-btn"
          onClick={handleLogout}
          title="Выйти"
        >
          <ArrowRightOnRectangleIcon className="sidebar-footer-icon" />
          {!collapsed && <span className="sidebar-footer-label">Выйти</span>}
        </button>
      </div>
    </aside>
  );
}
