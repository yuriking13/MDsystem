import React, { useEffect, Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
// Lazy load OnboardingTour - it's only shown once to new users
const OnboardingTour = lazy(() => import("./components/OnboardingTour"));
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { RequireAuth, useAuth } from "./lib/AuthContext";
import { RequireAdmin } from "./lib/AdminContext";
import AppLayout from "./components/AppLayout";

// Lazy load pages for better performance
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ScienceLandingPage = lazy(
  () => import("./pages/science/ScienceLandingPage"),
);
const ScienceDisciplinePlaceholderPage = lazy(
  () => import("./pages/science/ScienceDisciplinePlaceholderPage"),
);
const MedScienceLandingPage = lazy(
  () => import("./pages/med/MedScienceLandingPage"),
);
const PublicOfferPage = lazy(() => import("./pages/PublicOfferPage"));
const TermsOfUsePage = lazy(() => import("./pages/TermsOfUsePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const ProjectFacesPage = lazy(() => import("./pages/ProjectFacesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const DocumentPage = lazy(() => import("./pages/DocumentPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));
const ReviewerDashboardPage = lazy(
  () => import("./pages/ReviewerDashboardPage"),
);
const ChiefEditorDashboardPage = lazy(
  () => import("./pages/ChiefEditorDashboardPage"),
);

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
import { resolveScienceDisciplineFromHostname } from "./lib/scienceDomains";

// Loading fallback component
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

// Theme is now managed by AppSidebar

export default function App() {
  const { token } = useAuth();
  const disciplineFromHost =
    typeof window !== "undefined"
      ? resolveScienceDisciplineFromHostname(window.location.hostname)
      : null;
  const rootElement =
    disciplineFromHost && disciplineFromHost !== "med" ? (
      <Navigate to={`/science/${disciplineFromHost}`} replace />
    ) : (
      <LandingPage />
    );

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light-theme");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light-theme");
      document.body.classList.add("dark");
      document.body.classList.remove("light-theme");
    }
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        {/* Show onboarding for authenticated users on first visit */}
        {token && <OnboardingTour />}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes (no sidebar) */}
            <Route path="/" element={rootElement} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/science" element={<ScienceLandingPage />} />
            <Route
              path="/science/:discipline"
              element={<ScienceDisciplinePlaceholderPage />}
            />
            <Route path="/med" element={<MedScienceLandingPage />} />
            <Route path="/offer" element={<PublicOfferPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/project-faces" element={<ProjectFacesPage />} />

            {/* Authenticated Routes (with sidebar) */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route
                path="/projects/:projectId/documents/:docId"
                element={<DocumentPage />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/docs" element={<DocumentationPage />} />
              <Route path="/reviewer" element={<ReviewerDashboardPage />} />
              <Route
                path="/chief-editor"
                element={<ChiefEditorDashboardPage />}
              />
            </Route>

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
              <Route
                path="projects/:projectId"
                element={<AdminProjectsPage />}
              />
              <Route path="articles" element={<AdminArticlesPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="sessions" element={<AdminSessionsPage />} />
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="errors" element={<AdminErrorsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
              <Route path="system" element={<AdminSystemPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            <Route
              path="*"
              element={<Navigate to={token ? "/projects" : "/login"} replace />}
            />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}
