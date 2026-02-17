import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Navigate, Outlet } from "react-router-dom";
import App from "../../src/App";

const authState = {
  token: null as string | null,
};

const adminState = {
  token: null as string | null,
  loading: false,
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
  RequireAuth: ({ children }: { children: React.ReactNode }) =>
    authState.token ? <>{children}</> : <Navigate to="/login" replace />,
}));

vi.mock("../../src/lib/AdminContext", () => ({
  RequireAdmin: ({ children }: { children: React.ReactNode }) => {
    if (adminState.loading) {
      return <div>Admin Loading</div>;
    }

    return adminState.token ? (
      <>{children}</>
    ) : (
      <Navigate to="/admin/login" replace />
    );
  },
}));

vi.mock("../../src/components/AppLayout", () => ({
  default: () => (
    <div>
      <div>App Layout</div>
      <Outlet />
    </div>
  ),
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
  default: () => (
    <div>
      <div>Admin Layout</div>
      <Outlet />
    </div>
  ),
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

function expectThemeClasses(theme: "light" | "dark") {
  expect(document.documentElement.getAttribute("data-theme")).toBe(theme);

  if (theme === "light") {
    expect(document.documentElement.classList.contains("light-theme")).toBe(
      true,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.body.classList.contains("light-theme")).toBe(true);
    expect(document.body.classList.contains("dark")).toBe(false);
    return;
  }

  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(document.documentElement.classList.contains("light-theme")).toBe(
    false,
  );
  expect(document.body.classList.contains("dark")).toBe(true);
  expect(document.body.classList.contains("light-theme")).toBe(false);
}

describe("App theme bootstrap runtime", () => {
  beforeEach(() => {
    authState.token = null;
    adminState.token = null;
    adminState.loading = false;
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

  it("falls back to dark theme for unsupported persisted theme value", async () => {
    document.documentElement.classList.add("light-theme");
    document.body.classList.add("light-theme");
    const storage = createThemeStorage("solarized");
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

  it("falls back to dark theme for unsupported persisted value on protected app route", async () => {
    const storage = createThemeStorage("solarized");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/projects"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Projects Page")).toBeInTheDocument();
    });
    expect(storage.getItem).toHaveBeenCalledWith("theme");
  });

  it.each([
    "/projects",
    "/projects/p1",
    "/projects/p1/documents/d1",
    "/settings",
    "/docs",
  ] as const)(
    "falls back to dark theme for unsupported persisted value on unauthenticated protected route %s",
    async (route) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = null;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
      expect(storage.getItem).toHaveBeenCalledWith("theme");
    },
  );

  it.each([
    ["/login", null, "Login Page"],
    ["/login", "auth-token", "Login Page"],
    ["/register", null, "Register Page"],
    ["/register", "auth-token", "Register Page"],
  ] as const)(
    "falls back to dark theme for unsupported persisted value on public route %s (token=%s)",
    async (route, token, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = token;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
      expect(storage.getItem).toHaveBeenCalledWith("theme");
    },
  );

  it.each([
    ["/admin/login", "Admin Login Page"],
    ["/admin/settings", "Admin Settings Page"],
  ] as const)(
    "falls back to dark theme for unsupported persisted value on %s",
    async (route, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      adminState.token = route === "/admin/settings" ? "admin-token" : null;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
      expect(storage.getItem).toHaveBeenCalledWith("theme");
    },
  );

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

  it("redirects unauthenticated root route to login page", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("applies persisted light theme while redirecting unauthenticated root to login", async () => {
    const storage = createThemeStorage("light");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("redirects authenticated root route into projects page under app layout", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Projects Page")).toBeInTheDocument();
    });
  });

  it("applies persisted light theme while redirecting authenticated root to projects", async () => {
    const storage = createThemeStorage("light");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Projects Page")).toBeInTheDocument();
    });
  });

  it.each([
    [null, "Login Page"],
    ["auth-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported persisted value on root redirect (token=%s)",
    async (token, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = token;

      render(
        <MemoryRouter
          initialEntries={["/"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
    },
  );

  it("renders docs page inside authenticated app layout", async () => {
    const storage = createThemeStorage("light");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/docs"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Documentation Page")).toBeInTheDocument();
    });
  });

  it.each([
    ["light", "/projects", "Projects Page"],
    ["light", "/settings", "Settings Page"],
    ["light", "/docs", "Documentation Page"],
    ["dark", "/projects", "Projects Page"],
    ["dark", "/settings", "Settings Page"],
    ["dark", "/docs", "Documentation Page"],
  ] as const)(
    "applies %s theme bootstrap on %s route",
    async (persistedTheme, route, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = "auth-token";

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          persistedTheme,
        );
        expect(screen.getByText("App Layout")).toBeInTheDocument();
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
    },
  );

  it.each(["light", "dark"] as const)(
    "applies %s theme bootstrap on admin login route",
    async (persistedTheme) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      adminState.token = null;

      render(
        <MemoryRouter
          initialEntries={["/admin/login"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          persistedTheme,
        );
        expect(screen.getByText("Admin Login Page")).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each(["light", "dark"] as const)(
    "applies %s theme bootstrap on authorized admin route",
    async (persistedTheme) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      adminState.token = "admin-token";

      render(
        <MemoryRouter
          initialEntries={["/admin/settings"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          persistedTheme,
        );
        expect(screen.getByText("Admin Layout")).toBeInTheDocument();
        expect(screen.getByText("Admin Settings Page")).toBeInTheDocument();
      });
    },
  );

  it("redirects unauthenticated docs route to login page", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/docs"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("falls back to dark theme for unsupported persisted value on authenticated docs route", async () => {
    const storage = createThemeStorage("solarized");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/docs"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expectThemeClasses("dark");
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Documentation Page")).toBeInTheDocument();
    });
  });

  it("falls back to dark theme for unsupported persisted value on unauthenticated docs route", async () => {
    const storage = createThemeStorage("solarized");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/docs"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expectThemeClasses("dark");
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated projects route to login page", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/projects"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("renders projects page inside authenticated app layout", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/projects"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Projects Page")).toBeInTheDocument();
    });
  });

  it("renders login route when unauthenticated", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("keeps login route publicly accessible even with auth token", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("keeps register route publicly accessible regardless of auth token", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/register"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Register Page")).toBeInTheDocument();
    });
  });

  it("keeps register route publicly accessible for unauthenticated user", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/register"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Register Page")).toBeInTheDocument();
    });
  });

  it("keeps admin login route accessible without main app auth", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/admin/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Login Page")).toBeInTheDocument();
    });
  });

  it("keeps admin login route accessible even with admin token", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    adminState.token = "admin-token";

    render(
      <MemoryRouter
        initialEntries={["/admin/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Login Page")).toBeInTheDocument();
    });
  });

  it.each([
    ["light", "/login", null, "Login Page"],
    ["light", "/login", "auth-token", "Login Page"],
    ["dark", "/login", null, "Login Page"],
    ["dark", "/login", "auth-token", "Login Page"],
    ["light", "/register", null, "Register Page"],
    ["light", "/register", "auth-token", "Register Page"],
    ["dark", "/register", null, "Register Page"],
    ["dark", "/register", "auth-token", "Register Page"],
  ] as const)(
    "keeps %s theme on public auth route %s (token=%s)",
    async (persistedTheme, route, token, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = token;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null],
    ["light", "admin-token"],
    ["dark", null],
    ["dark", "admin-token"],
  ] as const)(
    "keeps %s theme on admin login route (adminToken=%s)",
    async (persistedTheme, adminToken) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/login"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("Admin Login Page")).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it("redirects unauthenticated admin route to admin login", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    adminState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/admin/settings"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Login Page")).toBeInTheDocument();
      expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      expect(screen.queryByText("Admin Settings Page")).not.toBeInTheDocument();
    });
  });

  it.each([
    "/admin",
    "/admin/users",
    "/admin/users/user-42",
    "/admin/projects",
    "/admin/projects/project-777",
    "/admin/system",
  ])(
    "redirects %s to admin login when admin token is absent",
    async (route) => {
      const storage = createThemeStorage("dark");
      vi.stubGlobal("localStorage", storage);
      adminState.token = null;
      adminState.loading = false;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Login Page")).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, "/admin/settings"],
    ["light", "auth-token", "/admin/settings"],
    ["dark", null, "/admin/settings"],
    ["dark", "auth-token", "/admin/settings"],
    ["light", null, "/admin/users/user-42"],
    ["light", "auth-token", "/admin/users/user-42"],
    ["dark", null, "/admin/users/user-42"],
    ["dark", "auth-token", "/admin/users/user-42"],
  ] as const)(
    "keeps %s theme when admin redirect triggers on %s (authToken=%s)",
    async (persistedTheme, authToken, route) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = null;
      adminState.loading = false;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("Admin Login Page")).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it("shows admin loading state while guard is resolving", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    adminState.loading = true;

    render(
      <MemoryRouter
        initialEntries={["/admin/settings"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Loading")).toBeInTheDocument();
      expect(screen.queryByText("Admin Login Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
    });
  });

  it.each(["light", "dark"] as const)(
    "keeps %s theme while admin guard is resolving",
    async (persistedTheme) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/settings"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          persistedTheme,
        );
        expect(screen.getByText("Admin Loading")).toBeInTheDocument();
        expect(screen.queryByText("Admin Login Page")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it("falls back to dark theme while admin guard is resolving with unsupported persisted value", async () => {
    const storage = createThemeStorage("solarized");
    vi.stubGlobal("localStorage", storage);
    adminState.loading = true;

    render(
      <MemoryRouter
        initialEntries={["/admin/settings"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expectThemeClasses("dark");
      expect(screen.getByText("Admin Loading")).toBeInTheDocument();
      expect(screen.queryByText("Admin Login Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
    });
  });

  it("redirects unknown route through root redirect to login when unauthenticated", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/totally-unknown-route"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("keeps persisted light theme when unknown route redirects unauthenticated user", async () => {
    const storage = createThemeStorage("light");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/unknown-light-route"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("redirects unknown route through root redirect to projects when authenticated", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/totally-unknown-route"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Projects Page")).toBeInTheDocument();
    });
  });

  it("keeps persisted light theme when unknown route redirects authenticated user", async () => {
    const storage = createThemeStorage("light");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/unknown-light-route"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Projects Page")).toBeInTheDocument();
    });
  });

  it.each([
    [null, "Login Page"],
    ["auth-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported persisted value when unknown route redirects (token=%s)",
    async (token, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = token;

      render(
        <MemoryRouter
          initialEntries={["/unknown-solarized-route"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, "Login Page"],
    ["dark", null, "Login Page"],
    ["light", "auth-token", "Projects Page"],
    ["dark", "auth-token", "Projects Page"],
  ] as const)(
    "keeps %s class symmetry when unknown route redirects (token=%s)",
    async (persistedTheme, token, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = token;

      render(
        <MemoryRouter
          initialEntries={["/wildcard-unknown-route"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "routes unknown admin path through root fallback (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("dark");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown admin path with trailing slash falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme and bypasses admin loading guard on unknown nested admin path with query + hash (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={[
            "/admin/unknown/path/deeper?from=runtime-matrix#runtime-fragment",
          ]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown nested admin path with query + hash falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={[
            "/admin/unknown/path/deeper?from=runtime-matrix#runtime-fragment",
          ]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown nested admin path with hash falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme and bypasses admin loading guard on unknown admin path with hash (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme and bypasses admin loading guard on unknown nested admin path with hash (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown admin path with hash falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown nested admin path with trailing slash + query falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper/?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme and bypasses admin loading guard on unknown admin path with trailing slash + query (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown admin path with trailing slash + query falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown nested admin path with trailing slash falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper/"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme and bypasses admin loading guard on unknown admin path with trailing slash (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", null, "admin-token", "Login Page"],
    ["light", "auth-token", null, "Projects Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", null, null, "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
    ["dark", "auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown admin path with query falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown nested admin path falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
  ] as const)(
    "keeps %s theme and bypasses admin loading guard on unknown nested admin path (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", null, "admin-token", "Login Page"],
    ["light", "auth-token", null, "Projects Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, null, "Login Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
    ["dark", "auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "keeps %s theme when unknown admin path falls back (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-light-dark-route"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", null, null, "Login Page"],
    ["light", null, "admin-token", "Login Page"],
    ["light", "auth-token", null, "Projects Page"],
    ["light", "auth-token", "admin-token", "Projects Page"],
    ["dark", null, null, "Login Page"],
    ["dark", null, "admin-token", "Login Page"],
    ["dark", "auth-token", null, "Projects Page"],
    ["dark", "auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "keeps %s theme and bypasses admin loading guard on unknown admin path (authToken=%s, adminToken=%s)",
    async (persistedTheme, authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown admin path with query (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme and bypasses admin loading guard on unknown nested admin path with query + hash for unsupported theme (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={[
            "/admin/unknown/path/deeper?from=runtime-matrix#runtime-fragment",
          ]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown nested admin path with query + hash (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={[
            "/admin/unknown/path/deeper?from=runtime-matrix#runtime-fragment",
          ]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown nested admin path with hash (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme and bypasses admin loading guard on unknown admin path with hash for unsupported theme (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme and bypasses admin loading guard on unknown nested admin path with hash for unsupported theme (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown admin path with hash (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown nested admin path with trailing slash + query (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper/?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme and bypasses admin loading guard on unknown admin path with trailing slash + query for unsupported theme (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown admin path with trailing slash + query (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown nested admin path with trailing slash (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper/"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme and bypasses admin loading guard on unknown admin path with trailing slash for unsupported theme (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown admin path with trailing slash (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path/"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme and bypasses admin loading guard on unknown nested admin path for unsupported theme (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown nested admin path (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown/path/deeper?from=runtime-matrix"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme and bypasses admin loading guard on unknown admin path for unsupported theme (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;
      adminState.loading = true;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Loading")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it.each([
    [null, null, "Login Page"],
    [null, "admin-token", "Login Page"],
    ["auth-token", null, "Projects Page"],
    ["auth-token", "admin-token", "Projects Page"],
  ] as const)(
    "falls back to dark theme for unsupported value on unknown admin path (authToken=%s, adminToken=%s)",
    async (authToken, adminToken, expectedPageText) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = authToken;
      adminState.token = adminToken;

      render(
        <MemoryRouter
          initialEntries={["/admin/unknown-path"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
        expect(screen.queryByText("Admin Layout")).not.toBeInTheDocument();
      });
    },
  );

  it("renders settings page inside authenticated app layout", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/settings"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Settings Page")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated settings route to login page", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/settings"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("renders project detail page inside authenticated app layout", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/projects/p1"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Project Detail Page")).toBeInTheDocument();
    });
  });

  it.each([
    ["light", "/projects/p1?tab=articles"],
    ["light", "/projects/p1?tab=documents"],
    ["light", "/projects/p1?tab=files"],
    ["light", "/projects/p1?tab=statistics"],
    ["light", "/projects/p1?tab=graph"],
    ["light", "/projects/p1?tab=team"],
    ["light", "/projects/p1?tab=settings"],
    ["dark", "/projects/p1?tab=articles"],
    ["dark", "/projects/p1?tab=documents"],
    ["dark", "/projects/p1?tab=files"],
    ["dark", "/projects/p1?tab=statistics"],
    ["dark", "/projects/p1?tab=graph"],
    ["dark", "/projects/p1?tab=team"],
    ["dark", "/projects/p1?tab=settings"],
  ] as const)(
    "keeps %s theme on project tab route %s",
    async (persistedTheme, routeWithTab) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = "auth-token";

      render(
        <MemoryRouter
          initialEntries={[routeWithTab]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("App Layout")).toBeInTheDocument();
        expect(screen.getByText("Project Detail Page")).toBeInTheDocument();
      });
    },
  );

  it.each([
    "/projects/p1?tab=articles",
    "/projects/p1?tab=documents",
    "/projects/p1?tab=files",
    "/projects/p1?tab=statistics",
    "/projects/p1?tab=graph",
    "/projects/p1?tab=team",
    "/projects/p1?tab=settings",
  ] as const)(
    "falls back to dark theme for unsupported persisted value on project tab route %s",
    async (routeWithTab) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = "auth-token";

      render(
        <MemoryRouter
          initialEntries={[routeWithTab]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText("App Layout")).toBeInTheDocument();
        expect(screen.getByText("Project Detail Page")).toBeInTheDocument();
      });
    },
  );

  it.each(["light", "dark"] as const)(
    "keeps %s theme on authenticated project tab route with hash fragment",
    async (persistedTheme) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = "auth-token";

      render(
        <MemoryRouter
          initialEntries={["/projects/p1?tab=graph#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("App Layout")).toBeInTheDocument();
        expect(screen.getByText("Project Detail Page")).toBeInTheDocument();
      });
    },
  );

  it("falls back to dark theme on authenticated project tab route with hash fragment for unsupported preference", async () => {
    const storage = createThemeStorage("solarized");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/projects/p1?tab=graph#runtime-fragment"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expectThemeClasses("dark");
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Project Detail Page")).toBeInTheDocument();
    });
  });

  it.each([
    ["light", "/projects/p1", "Project Detail Page"],
    ["light", "/projects/p1/documents/d1", "Document Page"],
    ["dark", "/projects/p1", "Project Detail Page"],
    ["dark", "/projects/p1/documents/d1", "Document Page"],
  ] as const)(
    "applies %s theme bootstrap on authenticated deep route %s",
    async (persistedTheme, route, expectedPageText) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = "auth-token";

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          persistedTheme,
        );
        expect(screen.getByText("App Layout")).toBeInTheDocument();
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
    },
  );

  it.each([
    ["light", "/projects/p1/documents/d1"],
    ["dark", "/projects/p1/documents/d1"],
  ] as const)(
    "keeps root/body class symmetry for %s theme on deep document route",
    async (persistedTheme, route) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = "auth-token";

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("App Layout")).toBeInTheDocument();
        expect(screen.getByText("Document Page")).toBeInTheDocument();
      });
    },
  );

  it("renders document editor page inside authenticated app layout", async () => {
    const storage = createThemeStorage("light");
    vi.stubGlobal("localStorage", storage);
    authState.token = "auth-token";

    render(
      <MemoryRouter
        initialEntries={["/projects/p1/documents/d1"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Layout")).toBeInTheDocument();
      expect(screen.getByText("Document Page")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated project detail route to login page", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/projects/p1"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated document editor route to login page", async () => {
    const storage = createThemeStorage(null);
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/projects/p1/documents/d1"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it.each([
    ["light", "/projects"],
    ["light", "/projects/p1"],
    ["light", "/projects/p1?tab=articles"],
    ["light", "/projects/p1?tab=documents"],
    ["light", "/projects/p1?tab=files"],
    ["light", "/projects/p1?tab=statistics"],
    ["light", "/projects/p1?tab=graph"],
    ["light", "/projects/p1?tab=team"],
    ["light", "/projects/p1?tab=settings"],
    ["light", "/projects/p1/documents/d1"],
    ["light", "/settings"],
    ["light", "/docs"],
    ["dark", "/projects"],
    ["dark", "/projects/p1"],
    ["dark", "/projects/p1?tab=articles"],
    ["dark", "/projects/p1?tab=documents"],
    ["dark", "/projects/p1?tab=files"],
    ["dark", "/projects/p1?tab=statistics"],
    ["dark", "/projects/p1?tab=graph"],
    ["dark", "/projects/p1?tab=team"],
    ["dark", "/projects/p1?tab=settings"],
    ["dark", "/projects/p1/documents/d1"],
    ["dark", "/settings"],
    ["dark", "/docs"],
  ] as const)(
    "keeps %s theme while unauthenticated protected route %s redirects to login",
    async (persistedTheme, route) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = null;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
    },
  );

  it.each(["light", "dark"] as const)(
    "keeps %s theme while unauthenticated project tab route with hash redirects to login",
    async (persistedTheme) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      authState.token = null;

      render(
        <MemoryRouter
          initialEntries={["/projects/p1?tab=graph#runtime-fragment"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
    },
  );

  it("falls back to dark theme while unauthenticated project tab route with hash redirects to login for unsupported preference", async () => {
    const storage = createThemeStorage("solarized");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;

    render(
      <MemoryRouter
        initialEntries={["/projects/p1?tab=graph#runtime-fragment"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expectThemeClasses("dark");
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it.each([
    "/projects/p1?tab=articles",
    "/projects/p1?tab=documents",
    "/projects/p1?tab=files",
    "/projects/p1?tab=statistics",
    "/projects/p1?tab=graph",
    "/projects/p1?tab=team",
    "/projects/p1?tab=settings",
  ] as const)(
    "falls back to dark theme while unsupported persisted value redirects unauthenticated project tab route %s to login",
    async (route) => {
      const storage = createThemeStorage("solarized");
      vi.stubGlobal("localStorage", storage);
      authState.token = null;

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses("dark");
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
    },
  );

  it("renders admin dashboard index for /admin route", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;
    adminState.token = "admin-token";

    render(
      <MemoryRouter
        initialEntries={["/admin"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });
  });

  it.each(["light", "dark"] as const)(
    "keeps %s theme on authorized admin index route",
    async (persistedTheme) => {
      const storage = createThemeStorage(persistedTheme);
      vi.stubGlobal("localStorage", storage);
      adminState.token = "admin-token";

      render(
        <MemoryRouter
          initialEntries={["/admin"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expectThemeClasses(persistedTheme);
        expect(screen.getByText("Admin Layout")).toBeInTheDocument();
        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
      });
    },
  );

  it("falls back to dark theme for unsupported value on authorized admin index route", async () => {
    const storage = createThemeStorage("solarized");
    vi.stubGlobal("localStorage", storage);
    adminState.token = "admin-token";

    render(
      <MemoryRouter
        initialEntries={["/admin"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expectThemeClasses("dark");
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });
  });

  it("renders nested admin route for /admin/users", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;
    adminState.token = "admin-token";

    render(
      <MemoryRouter
        initialEntries={["/admin/users"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();
      expect(screen.getByText("Admin Users Page")).toBeInTheDocument();
    });
  });

  it("renders admin settings route under admin layout", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;
    adminState.token = "admin-token";

    render(
      <MemoryRouter
        initialEntries={["/admin/settings"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();
      expect(screen.getByText("Admin Settings Page")).toBeInTheDocument();
    });
  });

  it("renders parameterized admin user route under admin layout", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;
    adminState.token = "admin-token";

    render(
      <MemoryRouter
        initialEntries={["/admin/users/user-42"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();
      expect(screen.getByText("Admin Users Page")).toBeInTheDocument();
    });
  });

  it("renders parameterized admin project route under admin layout", async () => {
    const storage = createThemeStorage("dark");
    vi.stubGlobal("localStorage", storage);
    authState.token = null;
    adminState.token = "admin-token";

    render(
      <MemoryRouter
        initialEntries={["/admin/projects/project-777"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Layout")).toBeInTheDocument();
      expect(screen.getByText("Admin Projects Page")).toBeInTheDocument();
    });
  });

  it.each([
    ["/admin/projects", "Admin Projects Page"],
    ["/admin/articles", "Admin Articles Page"],
    ["/admin/activity", "Admin Activity Page"],
    ["/admin/sessions", "Admin Sessions Page"],
    ["/admin/jobs", "Admin Jobs Page"],
    ["/admin/errors", "Admin Errors Page"],
    ["/admin/audit", "Admin Audit Page"],
    ["/admin/system", "Admin System Page"],
  ] as const)(
    "renders %s under admin layout",
    async (route, expectedPageText) => {
      const storage = createThemeStorage("dark");
      vi.stubGlobal("localStorage", storage);
      authState.token = null;
      adminState.token = "admin-token";

      render(
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Layout")).toBeInTheDocument();
        expect(screen.getByText(expectedPageText)).toBeInTheDocument();
      });
    },
  );
});
