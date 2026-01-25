import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import DocumentPage from "./pages/DocumentPage";
import DocumentationPage from "./pages/DocumentationPage";
import OnboardingTour from "./components/OnboardingTour";
import { ToastProvider } from "./components/Toast";
import { RequireAuth, useAuth } from "./lib/AuthContext";
import { AdminAuthProvider, RequireAdmin } from "./lib/AdminContext";
import {
  AdminLoginPage,
  AdminLayout,
  AdminDashboard,
  AdminUsersPage,
  AdminActivityPage,
  AdminErrorsPage,
  AdminAuditPage,
  AdminSettingsPage,
  AdminSessionsPage,
} from "./pages/admin";

function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem("theme") === "light";
  });

  useEffect(() => {
    if (isLight) {
      document.body.classList.add("light-theme");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
    }
  }, [isLight]);

  return (
    <button 
      className="theme-toggle-btn"
      onClick={() => setIsLight(!isLight)}
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}

export default function App() {
  const { token } = useAuth();

  return (
    <ToastProvider>
      <ThemeToggle />
      {/* Show onboarding for authenticated users on first visit */}
      {token && <OnboardingTour />}
      <Routes>
        <Route path="/" element={<Navigate to={token ? "/projects" : "/login"} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/projects"
          element={
            <RequireAuth>
              <ProjectsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <RequireAuth>
              <ProjectDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId/documents/:docId"
          element={
            <RequireAuth>
              <DocumentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/docs"
          element={
            <RequireAuth>
              <DocumentationPage />
            </RequireAuth>
          }
        />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<AdminUsersPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route path="errors" element={<AdminErrorsPage />} />
          <Route path="sessions" element={<AdminSessionsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
