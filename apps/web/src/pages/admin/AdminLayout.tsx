import React, { useEffect, useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../lib/AdminContext";
import "../../styles/admin.css";
import {
  IconUsers,
  IconChartBar,
  IconCalendar,
  IconSettings,
  IconArrowLeft,
  IconExclamation,
  IconShield,
  IconFolder,
  IconBook,
  IconClock,
  IconGlobe,
} from "../../components/FlowbiteIcons";

type SidebarItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  });
  const canUseMobileSidebar = isMobileViewport;

  const toggleMobileSidebar = () => {
    if (!canUseMobileSidebar) return;
    setMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setIsMobileViewport(window.innerWidth <= 900);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobileViewport && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [isMobileViewport, mobileSidebarOpen]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.classList.add("sidebar-modal-open");
    } else {
      document.body.classList.remove("sidebar-modal-open");
    }
    return () => document.body.classList.remove("sidebar-modal-open");
  }, [mobileSidebarOpen]);

  const sidebarItems: SidebarItem[] = [
    { path: "/admin", label: "Дашборд", icon: <IconChartBar /> },
    { path: "/admin/users", label: "Пользователи", icon: <IconUsers /> },
    { path: "/admin/projects", label: "Проекты", icon: <IconFolder /> },
    { path: "/admin/articles", label: "Статьи", icon: <IconBook /> },
    { path: "/admin/activity", label: "Активность", icon: <IconCalendar /> },
    { path: "/admin/sessions", label: "Сессии", icon: <IconGlobe /> },
    { path: "/admin/jobs", label: "Задачи", icon: <IconClock /> },
    { path: "/admin/errors", label: "Ошибки", icon: <IconExclamation /> },
    { path: "/admin/audit", label: "Аудит", icon: <IconShield /> },
    { path: "/admin/system", label: "Система", icon: <IconSettings /> },
    { path: "/admin/settings", label: "Настройки", icon: <IconSettings /> },
  ];

  function isActive(path: string): boolean {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  }

  const showSidebarLabels = isMobileViewport || sidebarOpen;
  const currentSectionLabel =
    sidebarItems.find((item) => isActive(item.path))?.label ?? "Админ-панель";

  return (
    <div className="admin-layout">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Закрыть навигацию"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${sidebarOpen ? "open" : "collapsed"} ${mobileSidebarOpen ? "mobile-open" : ""}`}
      >
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <IconShield size="lg" className="admin-logo-icon" />
            {showSidebarLabels && <span>Scientiaiter Admin</span>}
          </div>
          <button
            className="admin-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Свернуть" : "Развернуть"}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              )}
            </svg>
          </button>
        </div>

        <nav className="admin-nav">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item.path) ? "active" : ""}`}
              title={!showSidebarLabels ? item.label : undefined}
              onClick={closeMobileSidebar}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {showSidebarLabels && (
                <>
                  <span className="admin-nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="admin-nav-badge">{item.badge}</span>
                  )}
                </>
              )}
              {!showSidebarLabels && item.badge !== undefined && (
                <span className="admin-nav-badge-dot"></span>
              )}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link
            to="/projects"
            className="admin-nav-item admin-back-to-app"
            onClick={closeMobileSidebar}
          >
            <span className="admin-nav-icon">
              <IconArrowLeft />
            </span>
            {showSidebarLabels && (
              <span className="admin-nav-label">Вернуться в приложение</span>
            )}
          </Link>

          <div className="admin-user-info">
            {showSidebarLabels && admin && (
              <div className="admin-user-details">
                <span className="admin-user-email">{admin.email}</span>
                <span className="admin-user-role">Администратор</span>
              </div>
            )}
            <button
              className="admin-logout-btn"
              onClick={() => {
                closeMobileSidebar();
                logout();
              }}
              title="Выйти"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-mobile-topbar">
          <button
            type="button"
            className="admin-mobile-nav-toggle"
            onClick={toggleMobileSidebar}
            aria-label="Открыть навигацию"
            aria-expanded={mobileSidebarOpen}
          >
            <svg
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="admin-mobile-title">{currentSectionLabel}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
