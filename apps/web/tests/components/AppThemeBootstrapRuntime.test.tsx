import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import App from "../../src/App";

const authState = {
  token: null as string | null,
};

vi.mock("../../src/components/OnboardingTour", () => ({
  default: () => null,
}));

vi.mock("../../src/components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../src/components/Toast", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => authState,
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../src/lib/AdminContext", () => ({
  RequireAdmin: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../../src/components/AppLayout", () => ({
  default: () => <div>App Layout</div>,
}));

vi.mock("../../src/pages/LoginPage", () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock("../../src/pages/RegisterPage", () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock("../../src/pages/SettingsPage", () => ({
  default: () => <div>Settings Page</div>,
}));

vi.mock("../../src/pages/ProjectsPage", () => ({
  default: () => <div>Projects Page</div>,
}));

vi.mock("../../src/pages/ProjectDetailPage", () => ({
  default: () => <div>Project Detail Page</div>,
}));

vi.mock("../../src/pages/DocumentPage", () => ({
  default: () => <div>Document Page</div>,
}));

vi.mock("../../src/pages/DocumentationPage", () => ({
  default: () => <div>Documentation Page</div>,
}));

vi.mock("../../src/pages/admin/AdminLoginPage", () => ({
  default: () => <div>Admin Login Page</div>,
}));

vi.mock("../../src/pages/admin/AdminLayout", () => ({
  default: () => <div>Admin Layout</div>,
}));

vi.mock("../../src/pages/admin/AdminDashboard", () => ({
  default: () => <div>Admin Dashboard</div>,
}));

vi.mock("../../src/pages/admin/AdminUsersPage", () => ({
  default: () => <div>Admin Users Page</div>,
}));

vi.mock("../../src/pages/admin/AdminActivityPage", () => ({
  default: () => <div>Admin Activity Page</div>,
}));

vi.mock("../../src/pages/admin/AdminErrorsPage", () => ({
  default: () => <div>Admin Errors Page</div>,
}));

vi.mock("../../src/pages/admin/AdminAuditPage", () => ({
  default: () => <div>Admin Audit Page</div>,
}));

vi.mock("../../src/pages/admin/AdminSettingsPage", () => ({
  default: () => <div>Admin Settings Page</div>,
}));

vi.mock("../../src/pages/admin/AdminSessionsPage", () => ({
  default: () => <div>Admin Sessions Page</div>,
}));

vi.mock("../../src/pages/admin/AdminProjectsPage", () => ({
  default: () => <div>Admin Projects Page</div>,
}));

vi.mock("../../src/pages/admin/AdminJobsPage", () => ({
  default: () => <div>Admin Jobs Page</div>,
}));

vi.mock("../../src/pages/admin/AdminSystemPage", () => ({
  default: () => <div>Admin System Page</div>,
}));

vi.mock("../../src/pages/admin/AdminArticlesPage", () => ({
  default: () => <div>Admin Articles Page</div>,
}));

function createThemeStorage(theme: string | null): Storage {
  return {
    getItem: vi.fn((key: string) => (key === "theme" ? theme : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  } as unknown as Storage;
}

describe("App theme bootstrap runtime", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.classList.remove("light-theme", "dark");
    document.body.classList.remove("light-theme", "dark");
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies persisted light theme symmetrically to root and body", async () => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
    const storage = createThemeStorage("light");
    vi.stubGlobal("localStorage", storage);

    render(
      <MemoryRouter
        initialEntries={["/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(
        true,
      );
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.body.classList.contains("light-theme")).toBe(true);
      expect(document.body.classList.contains("dark")).toBe(false);
    });
    expect(storage.getItem).toHaveBeenCalledWith("theme");
  });

  it("falls back to dark theme and clears light classes", async () => {
    document.documentElement.classList.add("light-theme");
    document.body.classList.add("light-theme");
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);

    render(
      <MemoryRouter
        initialEntries={["/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light-theme")).toBe(
        false,
      );
      expect(document.body.classList.contains("dark")).toBe(true);
      expect(document.body.classList.contains("light-theme")).toBe(false);
    });
    expect(storage.getItem).toHaveBeenCalledWith("theme");
  });

  it("applies persisted dark theme and clears stale light classes", async () => {
    document.documentElement.classList.add("light-theme");
    document.body.classList.add("light-theme");
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);

    render(
      <MemoryRouter
        initialEntries={["/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light-theme")).toBe(
        false,
      );
      expect(document.body.classList.contains("dark")).toBe(true);
      expect(document.body.classList.contains("light-theme")).toBe(false);
    });
    expect(storage.getItem).toHaveBeenCalledWith("theme");
  });
});
