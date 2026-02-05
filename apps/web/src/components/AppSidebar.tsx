import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../design-system/utils/cn";
import {
  HomeIcon,
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
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return (
      document.body.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark"
    );
  });

  const navItems: NavItem[] = [
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

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.classList.add("dark");
      document.body.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.classList.remove("dark");
      document.body.classList.add("light-theme");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className={cn(
        "app-sidebar",
        collapsed && "app-sidebar--collapsed",
        className,
      )}
    >
      {/* Logo / Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          {!collapsed && <span className="sidebar-logo-text">MDsystem</span>}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
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
                </NavLink>
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
              <UserCircleIcon className="w-8 h-8" />
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
