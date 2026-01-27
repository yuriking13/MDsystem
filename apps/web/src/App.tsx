import React, { useEffect, useState, Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import OnboardingTour from "./components/OnboardingTour";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { RequireAuth, useAuth } from "./lib/AuthContext";
import { AdminAuthProvider, RequireAdmin } from "./lib/AdminContext";

// Lazy load pages for better performance
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const DocumentPage = lazy(() => import("./pages/DocumentPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));

// Lazy load admin pages
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminActivityPage = lazy(() => import("./pages/admin/AdminActivityPage"));
const AdminErrorsPage = lazy(() => import("./pages/admin/AdminErrorsPage"));
const AdminAuditPage = lazy(() => import("./pages/admin/AdminAuditPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminSessionsPage = lazy(() => import("./pages/admin/AdminSessionsPage"));
const AdminProjectsPage = lazy(() => import("./pages/admin/AdminProjectsPage"));
const AdminJobsPage = lazy(() => import("./pages/admin/AdminJobsPage"));
const AdminSystemPage = lazy(() => import("./pages/admin/AdminSystemPage"));
const AdminArticlesPage = lazy(() => import("./pages/admin/AdminArticlesPage"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner"></div>
      <p>Загрузка...</p>
    </div>
  );
}

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
    <ErrorBoundary>
      <ToastProvider>
        <ThemeToggle />
        {/* Show onboarding for authenticated users on first visit */}
        {token && <OnboardingTour />}
        <Suspense fallback={<PageLoader />}>
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
              <Route path="projects" element={<AdminProjectsPage />} />
              <Route path="projects/:projectId" element={<AdminProjectsPage />} />
              <Route path="articles" element={<AdminArticlesPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="sessions" element={<AdminSessionsPage />} />
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="errors" element={<AdminErrorsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
              <Route path="system" element={<AdminSystemPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}
