import React, { createContext, useContext, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../lib/AuthContext";

interface ProjectContextType {
  projectName: string | null;
  setProjectName: (name: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType>({
  projectName: null,
  setProjectName: () => {},
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
  const [projectName, setProjectName] = useState<string | null>(null);

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
    <ProjectContext.Provider value={{ projectName, setProjectName }}>
      <div className="app-layout">
        <AppSidebar projectName={projectName || undefined} />
        <main className="app-main">{children || <Outlet />}</main>
      </div>
    </ProjectContext.Provider>
  );
}
