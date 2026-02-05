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
  MoonIcon,
  SunIcon,
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

  const { articleCounts, articleViewStatus, setArticleViewStatus } = useProjectContext();

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
                {isArticlesItem && articlesSubMenuOpen && currentTab === "articles" && (
                  <ul className="sidebar-submenu">
                    {articleStatusItems.map((statusItem) => {
                      const StatusIcon = statusItem.icon;
                      const isStatusActive = articleViewStatus === statusItem.id;
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
                              isStatusActive && "sidebar-submenu-item--active",
                            )}
                            title={collapsed ? `${statusItem.label} (${statusItem.count})` : undefined}
                          >
                            {!collapsed ? (
                              <>
                                <StatusIcon className="sidebar-submenu-icon" />
                                <span className="sidebar-submenu-label">{statusItem.label}</span>
                                <span className="sidebar-submenu-badge">{statusItem.count}</span>
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
        {/* Theme Toggle */}
        <button
          className="sidebar-footer-btn"
          onClick={toggleTheme}
          title={isDark ? "Светлая тема" : "Тёмная тема"}
        >
          {isDark ? (
            <SunIcon className="sidebar-footer-icon" />
          ) : (
            <MoonIcon className="sidebar-footer-icon" />
          )}
          {!collapsed && (
            <span className="sidebar-footer-label">
              {isDark ? "Светлая тема" : "Тёмная тема"}
            </span>
          )}
        </button>

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
