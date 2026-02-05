import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { cn } from "../design-system/utils/cn";
import { useAuth } from "../lib/AuthContext";

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
    <div className="app-layout">
      <AppSidebar />
      <main className="app-main">{children || <Outlet />}</main>
    </div>
  );
}
