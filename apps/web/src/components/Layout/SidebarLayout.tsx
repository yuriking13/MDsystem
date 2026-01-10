import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";

interface SidebarLayoutProps {
  children: React.ReactNode;
  projectId?: string;
  projectName?: string;
}

// Icons as components
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const GraphIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

export default function SidebarLayout({ children, projectId, projectName }: SidebarLayoutProps) {
  const nav = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(true);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isProjectActive = (tab: string) => {
    if (!projectId) return false;
    const hash = location.hash.replace('#', '') || 'articles';
    return hash === tab;
  };

  return (
    <div className="antialiased bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-2.5 dark:bg-gray-800 dark:border-gray-700 fixed left-0 right-0 top-0 z-50">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex justify-start items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 mr-2 text-gray-600 rounded-lg cursor-pointer md:hidden hover:text-gray-900 hover:bg-gray-100 focus:bg-gray-100 dark:focus:bg-gray-700 focus:ring-2 focus:ring-gray-100 dark:focus:ring-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <MenuIcon />
              <span className="sr-only">Toggle sidebar</span>
            </button>
            <Link to="/" className="flex items-center justify-between mr-4">
              <svg className="w-8 h-8 mr-2 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">MDsystem</span>
            </Link>
          </div>
          <div className="flex items-center lg:order-2">
            {/* User dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                {user?.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center p-2 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                title="Выйти"
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 dark:bg-gray-900/80 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Primary Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen pt-14 transition-transform bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        aria-label="Sidenav"
      >
        <div className="overflow-y-auto py-5 px-3 h-full">
          <ul className="space-y-2">
            <li>
              <Link
                to="/projects"
                className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                  isActive("/projects")
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                }`}
              >
                <FolderIcon />
                <span className="ml-3">Проекты</span>
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                  isActive("/settings")
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                }`}
              >
                <SettingsIcon />
                <span className="ml-3">Настройки</span>
              </Link>
            </li>
            <li>
              <Link
                to="/docs"
                className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                  isActive("/docs")
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                }`}
              >
                <BookIcon />
                <span className="ml-3">Документация</span>
              </Link>
            </li>
          </ul>

          {/* Project Navigation (when inside a project) */}
          {projectId && (
            <>
              <div className="pt-5 mt-5 border-t border-gray-200 dark:border-gray-700">
                <div className="px-2 mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    {projectName || "Проект"}
                  </span>
                </div>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to={`/projects/${projectId}#articles`}
                      className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                        isProjectActive("articles")
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                          : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      }`}
                    >
                      <DocumentIcon />
                      <span className="ml-3">База статей</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={`/projects/${projectId}#search`}
                      className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                        isProjectActive("search")
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                          : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      }`}
                    >
                      <SearchIcon />
                      <span className="ml-3">Поиск</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={`/projects/${projectId}#graph`}
                      className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                        isProjectActive("graph")
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                          : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      }`}
                    >
                      <GraphIcon />
                      <span className="ml-3">Граф цитирований</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={`/projects/${projectId}#statistics`}
                      className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                        isProjectActive("statistics")
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                          : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      }`}
                    >
                      <ChartIcon />
                      <span className="ml-3">Статистика</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={`/projects/${projectId}#settings`}
                      className={`flex items-center p-2 text-base font-medium rounded-lg group ${
                        isProjectActive("settings")
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                          : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      }`}
                    >
                      <SettingsIcon />
                      <span className="ml-3">Настройки проекта</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="p-4 md:ml-64 h-auto pt-20">
        {children}
      </main>
    </div>
  );
}
