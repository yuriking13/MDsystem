import React, { createContext, useContext, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../lib/AuthContext";

interface ProjectInfo {
  name: string | null;
  role: string | null;
  updatedAt: string | null;
}

export type ArticleViewStatus = "candidate" | "selected" | "excluded" | "deleted" | "all";

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
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/admin");

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
      <div className="app-layout">
        <AppSidebar
          projectName={projectInfo.name || undefined}
          projectRole={projectInfo.role || undefined}
          projectUpdatedAt={projectInfo.updatedAt || undefined}
        />
        <main className="app-main">{children || <Outlet />}</main>
      </div>
    </ProjectContext.Provider>
  );
}
