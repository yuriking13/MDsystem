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
import { RequireAuth, useAuth } from "./lib/AuthContext";

function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem("theme") === "light";
  });

  useEffect(() => {
    if (isLight) {
      document.body.classList.add("light-theme");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("light-theme");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }, [isLight]);

  return (
    <button 
      className="fixed bottom-5 left-5 z-[9999] w-11 h-11 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform text-xl"
      onClick={() => setIsLight(!isLight)}
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}

export default function App() {
  const { token } = useAuth();

  // Set initial dark mode based on localStorage
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
