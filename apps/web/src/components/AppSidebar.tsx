import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useParams, useNavigate } from "react-router-dom";
import { cn } from "../design-system/utils/cn";
import {
  FolderIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
} from "@heroicons/react/24/outline";
import { useAuth } from "../lib/AuthContext";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface AppSidebarProps {
  className?: string;
}

export default function AppSidebar({ className }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const theme = localStorage.getItem("theme");
    return theme !== "light";
  });

  // Check if we're inside a project
  const isInProject = location.pathname.startsWith("/projects/") && projectId;

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
      path: `/projects/${projectId}?tab=articles`,
    },
    {
      id: "documents",
      label: "Документы",
      icon: DocumentTextIcon,
      path: `/projects/${projectId}?tab=documents`,
    },
    {
      id: "files",
      label: "Файлы",
      icon: FolderOpenIcon,
      path: `/projects/${projectId}?tab=files`,
    },
    {
      id: "statistics",
      label: "Статистика",
      icon: ChartBarIcon,
      path: `/projects/${projectId}?tab=statistics`,
    },
    {
      id: "graph",
      label: "Граф цитирований",
      icon: ShareIcon,
      path: `/projects/${projectId}?tab=graph`,
    },
    {
      id: "team-settings",
      label: "Команда и настройки",
      icon: UserGroupIcon,
      path: `/projects/${projectId}?tab=team`,
    },
  ];

  // Get current tab from URL
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "articles";

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
    if (item.path.includes("?tab=")) {
      const [basePath, query] = item.path.split("?");
      navigate(`${basePath}?${query}`);
    } else {
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

      {/* Back to Projects (when in project) */}
      {isInProject && (
        <div className="sidebar-back">
          <button
            className="sidebar-back-btn"
            onClick={() => navigate("/projects")}
            title="Назад к проектам"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {!collapsed && <span>Назад к проектам</span>}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {navItems.map((item) => {
            const isActive = isInProject
              ? item.id === currentTab ||
                (item.id === "team-settings" &&
                  (currentTab === "team" || currentTab === "settings"))
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "sidebar-nav-item",
                    isActive && "sidebar-nav-item--active",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="sidebar-nav-icon" />
                  {!collapsed && (
                    <>
                      <span className="sidebar-nav-label">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="sidebar-nav-badge">{item.badge}</span>
                      )}
                    </>
                  )}
                </button>
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
