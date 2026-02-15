import React, { createContext, useContext, useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AnimatedBackground from "./AnimatedBackground";
import { useAuth } from "../lib/AuthContext";

interface ProjectInfo {
  name: string | null;
  role: string | null;
  updatedAt: string | null;
}

export type ArticleViewStatus =
  | "candidate"
  | "selected"
  | "excluded"
  | "deleted"
  | "all";

export interface ArticleCounts {
  candidate: number;
  selected: number;
  excluded: number;
  deleted: number;
  total: number;
}

interface ProjectContextType {
  projectInfo: ProjectInfo;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  clearProjectInfo: () => void;
  articleCounts: ArticleCounts;
  setArticleCounts: (counts: ArticleCounts) => void;
  articleViewStatus: ArticleViewStatus;
  setArticleViewStatus: (status: ArticleViewStatus) => void;
}

const defaultProjectInfo: ProjectInfo = {
  name: null,
  role: null,
  updatedAt: null,
};

const defaultArticleCounts: ArticleCounts = {
  candidate: 0,
  selected: 0,
  excluded: 0,
  deleted: 0,
  total: 0,
};

const ProjectContext = createContext<ProjectContextType>({
  projectInfo: defaultProjectInfo,
  setProjectInfo: () => {},
  clearProjectInfo: () => {},
  articleCounts: defaultArticleCounts,
  setArticleCounts: () => {},
  articleViewStatus: "candidate",
  setArticleViewStatus: () => {},
});

export function useProjectContext() {
  return useContext(ProjectContext);
}

interface AppLayoutProps {
  children?: React.ReactNode;
}

/**
 * Main application layout with left sidebar navigation
 * Used for authenticated pages
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const { token } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projectInfo, setProjectInfoState] =
    useState<ProjectInfo>(defaultProjectInfo);
  const [articleCounts, setArticleCounts] =
    useState<ArticleCounts>(defaultArticleCounts);
  const [articleViewStatus, setArticleViewStatus] =
    useState<ArticleViewStatus>("candidate");

  const setProjectInfo = (info: Partial<ProjectInfo>) => {
    setProjectInfoState((prev) => ({ ...prev, ...info }));
  };

  const clearProjectInfo = () => {
    setProjectInfoState(defaultProjectInfo);
  };

  // Don't show sidebar on login/register/admin pages
  const hideSidebar =
    !token ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/admin");

  // Determine if animated background should be shown
  // Excluded: citation graph tab, document editor page
  const isDocumentEditor = location.pathname.match(
    /^\/projects\/[^/]+\/documents\/[^/]+$/,
  );
  const searchParams = new URLSearchParams(location.search);
  const isGraphTab =
    location.pathname.match(/^\/projects\/[^/]+$/) &&
    searchParams.get("tab") === "graph";
  const showAnimatedBg = !isDocumentEditor && !isGraphTab;
  const isFixedLayout = isDocumentEditor || isGraphTab;
  const shouldLockLayout = !hideSidebar && isFixedLayout;

  // Lock body scroll for fixed layouts (editor, graph)
  useEffect(() => {
    if (shouldLockLayout) {
      document.documentElement.classList.add("layout-fixed");
      document.body.classList.add("layout-fixed");
    } else {
      document.documentElement.classList.remove("layout-fixed");
      document.body.classList.remove("layout-fixed");
    }
    return () => {
      document.documentElement.classList.remove("layout-fixed");
      document.body.classList.remove("layout-fixed");
    };
  }, [shouldLockLayout]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.search]);

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
    return () => {
      document.body.classList.remove("sidebar-modal-open");
    };
  }, [mobileSidebarOpen]);

  if (hideSidebar) {
    return <>{children || <Outlet />}</>;
  }

  return (
    <ProjectContext.Provider
      value={{
        projectInfo,
        setProjectInfo,
        clearProjectInfo,
        articleCounts,
        setArticleCounts,
        articleViewStatus,
        setArticleViewStatus,
      }}
    >
      {showAnimatedBg && <AnimatedBackground />}
      <div
        className={`app-layout${showAnimatedBg ? " app-layout-with-animated-bg" : ""}${isFixedLayout ? " app-layout-fixed" : ""}`}
      >
        <AppSidebar
          projectName={projectInfo.name || undefined}
          projectRole={projectInfo.role || undefined}
          projectUpdatedAt={projectInfo.updatedAt || undefined}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        {mobileSidebarOpen && (
          <button
            className="app-sidebar-overlay"
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Закрыть навигацию"
          />
        )}
        <main className={`app-main${isFixedLayout ? " app-main-fixed" : ""}`}>
          <div className="app-mobile-topbar">
            <button
              type="button"
              className="app-mobile-nav-toggle"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              aria-label="Открыть навигацию"
              aria-expanded={mobileSidebarOpen}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <span className="app-mobile-topbar-title">
              {projectInfo.name || "Scientiaiter"}
            </span>
          </div>
          {children || <Outlet />}
        </main>
      </div>
    </ProjectContext.Provider>
  );
}
