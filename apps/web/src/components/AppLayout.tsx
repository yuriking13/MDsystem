import React, { createContext, useContext, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../lib/AuthContext";

interface ProjectInfo {
  name: string | null;
  role: string | null;
  updatedAt: string | null;
}

interface ProjectContextType {
  projectInfo: ProjectInfo;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  clearProjectInfo: () => void;
}

const defaultProjectInfo: ProjectInfo = {
  name: null,
  role: null,
  updatedAt: null,
};

const ProjectContext = createContext<ProjectContextType>({
  projectInfo: defaultProjectInfo,
  setProjectInfo: () => {},
  clearProjectInfo: () => {},
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
      value={{ projectInfo, setProjectInfo, clearProjectInfo }}
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
