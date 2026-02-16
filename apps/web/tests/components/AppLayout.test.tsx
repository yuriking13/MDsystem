import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import AppLayout from "../../src/components/AppLayout";

const mockLogout = vi.fn();
const targetViewportWidths = [360, 390, 768, 1024, 1280, 1440, 1920];
const mockAuthState = {
  token: "test-token",
  user: { email: "user@example.com" } as { email: string } | null,
};

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => ({
    token: mockAuthState.token,
    user: mockAuthState.user,
    logout: mockLogout,
  }),
}));

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

function renderAppLayout(initialPath = "/projects") {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/projects"
            element={
              <div>
                <div>Projects page</div>
                <Link to="/settings">Go settings</Link>
                <Link to="/login">Go login</Link>
                <Link to="/admin">Go admin</Link>
              </div>
            }
          />
          <Route path="/settings" element={<div>Settings page</div>} />
          <Route path="/docs" element={<div>Docs page</div>} />
          <Route
            path="/projects/:id"
            element={
              <div>
                <div>Project details page</div>
                <Link to="/projects">Back to projects</Link>
              </div>
            }
          />
          <Route
            path="/projects/:id/documents/:docId"
            element={
              <div>
                <div>Document editor page</div>
                <Link to="/projects">Back to projects</Link>
              </div>
            }
          />
          <Route path="/admin" element={<div>Admin route content</div>} />
          <Route path="/admin/users" element={<div>Admin users content</div>} />
          <Route
            path="/admin/projects"
            element={<div>Admin projects content</div>}
          />
          <Route
            path="/admin/articles"
            element={<div>Admin articles content</div>}
          />
          <Route
            path="/admin/activity"
            element={<div>Admin activity content</div>}
          />
          <Route
            path="/admin/sessions"
            element={<div>Admin sessions content</div>}
          />
          <Route path="/admin/jobs" element={<div>Admin jobs content</div>} />
          <Route
            path="/admin/errors"
            element={<div>Admin errors content</div>}
          />
          <Route path="/admin/audit" element={<div>Admin audit content</div>} />
          <Route
            path="/admin/system"
            element={<div>Admin system content</div>}
          />
          <Route
            path="/admin/settings"
            element={<div>Admin settings content</div>}
          />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/register" element={<div>Register page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout mobile sidebar behavior", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockAuthState.token = "test-token";
    mockAuthState.user = { email: "user@example.com" };
    document.body.classList.remove("sidebar-modal-open");
    document.body.classList.remove("layout-fixed");
    document.documentElement.classList.remove("layout-fixed");
    setViewportWidth(390);
  });

  it("toggles body modal class and closes on Escape", async () => {
    const user = userEvent.setup();
    renderAppLayout();

    const toggleButton = screen.getByLabelText("Открыть навигацию");
    await user.click(toggleButton);
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
    expect(toggleButton).toHaveAttribute("aria-label", "Закрыть навигацию");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(false);
    expect(toggleButton).toHaveAttribute("aria-label", "Открыть навигацию");
  });

  it("closes mobile sidebar when clicking overlay", async () => {
    const user = userEvent.setup();
    renderAppLayout();

    const toggleButton = screen.getByLabelText("Открыть навигацию");
    await user.click(toggleButton);
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    await user.click(screen.getByLabelText("Закрыть меню навигации"));

    await waitFor(() => {
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
      expect(toggleButton).toHaveAttribute("aria-label", "Открыть навигацию");
      expect(screen.queryByLabelText("Закрыть меню навигации")).toBeNull();
    });
  });

  it("shows animated background on standard app routes", () => {
    renderAppLayout("/projects");

    expect(screen.getByText("Projects page")).toBeInTheDocument();
    expect(document.querySelector(".animated-bg")).not.toBeNull();
  });

  it.each([360, 390, 768])(
    "shows mobile navigation trigger on app shell routes at %ipx",
    (width) => {
      setViewportWidth(width);
      renderAppLayout("/docs");

      expect(screen.getByText("Docs page")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Открыть навигацию" }),
      ).toBeInTheDocument();
    },
  );

  it.each([360, 390, 768])(
    "toggles mobile sidebar open and closed via same topbar button at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/projects");

      const toggleButton = screen.getByRole("button", {
        name: "Открыть навигацию",
      });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(document.body.classList.contains("sidebar-modal-open")).toBe(
          true,
        );
        expect(toggleButton).toHaveAttribute("aria-label", "Закрыть навигацию");
      });

      await user.click(toggleButton);

      await waitFor(() => {
        expect(document.body.classList.contains("sidebar-modal-open")).toBe(
          false,
        );
        expect(toggleButton).toHaveAttribute("aria-label", "Открыть навигацию");
      });
    },
  );

  it.each([1024, 1280, 1440, 1920])(
    "keeps mobile sidebar closed on desktop widths at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/settings");

      expect(screen.getByText("Settings page")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Открыть навигацию" }),
      );

      await waitFor(() => {
        expect(document.body.classList.contains("sidebar-modal-open")).toBe(
          false,
        );
        expect(document.querySelector(".app-sidebar--open")).toBeNull();
      });
    },
  );

  it.each([
    ["/projects", "Projects page"],
    ["/settings", "Settings page"],
    ["/docs", "Docs page"],
  ])("opens drawer only on mobile widths for %s", async (route, pageLabel) => {
    const user = userEvent.setup();

    for (const width of targetViewportWidths) {
      const shouldOpen = width <= 768;
      setViewportWidth(width);
      const { unmount } = renderAppLayout(route);

      expect(screen.getByText(pageLabel)).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Открыть навигацию" }),
      );

      await waitFor(() => {
        expect(document.body.classList.contains("sidebar-modal-open")).toBe(
          shouldOpen,
        );
        expect(document.querySelector(".app-sidebar--open") !== null).toBe(
          shouldOpen,
        );
        expect(document.querySelector(".app-sidebar-overlay") !== null).toBe(
          shouldOpen,
        );
      });

      unmount();
      document.body.classList.remove("sidebar-modal-open");
    }
  });

  it.each([
    ["/projects/p1/documents/d1", "Document editor page"],
    ["/projects/p1?tab=graph", "Project details page"],
  ])(
    "opens fixed-layout drawer only on mobile widths for %s",
    async (route, pageLabel) => {
      const user = userEvent.setup();

      for (const width of targetViewportWidths) {
        const shouldOpen = width <= 768;
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        await user.click(
          screen.getByRole("button", { name: "Открыть навигацию" }),
        );

        await waitFor(() => {
          expect(document.body.classList.contains("sidebar-modal-open")).toBe(
            shouldOpen,
          );
          expect(document.querySelector(".app-sidebar--open") !== null).toBe(
            shouldOpen,
          );
          expect(document.querySelector(".app-sidebar-overlay") !== null).toBe(
            shouldOpen,
          );
        });

        unmount();
        document.body.classList.remove("sidebar-modal-open");
      }
    },
  );

  it.each([
    ["articles", false],
    ["documents", false],
    ["files", false],
    ["statistics", false],
    ["settings", false],
    ["graph", true],
  ])(
    "renders /projects/:id?tab=%s shell behavior correctly on mobile",
    (tab, shouldLockLayout) => {
      renderAppLayout(`/projects/p1?tab=${tab}`);

      expect(screen.getByText("Project details page")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Открыть навигацию" }),
      ).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        shouldLockLayout,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(
        shouldLockLayout,
      );
    },
  );

  it.each([
    "articles",
    "documents",
    "files",
    "statistics",
    "settings",
    "graph",
  ])(
    "keeps /projects/:id?tab=%s route usable across all target widths",
    async (tab) => {
      const user = userEvent.setup();

      for (const width of targetViewportWidths) {
        const shouldOpen = width <= 768;
        const shouldLockLayout = tab === "graph";
        setViewportWidth(width);
        const { unmount } = renderAppLayout(`/projects/p1?tab=${tab}`);

        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(shouldLockLayout);
        expect(document.body.classList.contains("layout-fixed")).toBe(
          shouldLockLayout,
        );

        await user.click(
          screen.getByRole("button", { name: "Открыть навигацию" }),
        );

        await waitFor(() => {
          expect(document.body.classList.contains("sidebar-modal-open")).toBe(
            shouldOpen,
          );
          expect(document.querySelector(".app-sidebar--open") !== null).toBe(
            shouldOpen,
          );
          expect(document.querySelector(".app-sidebar-overlay") !== null).toBe(
            shouldOpen,
          );
        });

        unmount();
        document.body.classList.remove("sidebar-modal-open");
      }
    },
  );

  it("closes mobile sidebar when route changes", async () => {
    const user = userEvent.setup();
    renderAppLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    await user.click(screen.getByText("Go settings"));

    await waitFor(() => {
      expect(screen.getByText("Settings page")).toBeInTheDocument();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
    });
  });

  it("closes mobile sidebar when navigating to login route", async () => {
    const user = userEvent.setup();
    renderAppLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    await user.click(screen.getByText("Go login"));

    await waitFor(() => {
      expect(screen.getByText("Login page")).toBeInTheDocument();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
      expect(
        screen.queryByRole("button", { name: "Открыть навигацию" }),
      ).not.toBeInTheDocument();
    });
  });

  it("closes mobile sidebar when navigating to admin route", async () => {
    const user = userEvent.setup();
    renderAppLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    await user.click(screen.getByText("Go admin"));

    await waitFor(() => {
      expect(screen.getByText("Admin route content")).toBeInTheDocument();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
      expect(
        screen.queryByRole("button", { name: "Открыть навигацию" }),
      ).not.toBeInTheDocument();
    });
  });

  it("closes mobile sidebar when resizing to desktop viewport", async () => {
    const user = userEvent.setup();
    renderAppLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    act(() => {
      setViewportWidth(1280);
    });

    await waitFor(() => {
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
    });
  });

  it("hides sidebar shell on login route", () => {
    renderAppLayout("/login");

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Открыть навигацию" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
    expect(document.querySelector(".animated-bg")).toBeNull();
  });

  it("hides sidebar shell on register route", () => {
    renderAppLayout("/register");

    expect(screen.getByText("Register page")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Открыть навигацию" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
    expect(document.querySelector(".animated-bg")).toBeNull();
  });

  it.each([
    ["/login", "Login page"],
    ["/register", "Register page"],
  ])(
    "hides app shell on %s across target viewport widths",
    (route, pageLabel) => {
      for (const width of targetViewportWidths) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Открыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
        expect(document.querySelector(".animated-bg")).toBeNull();

        unmount();
      }
    },
  );

  it("hides sidebar shell on admin route", () => {
    renderAppLayout("/admin");

    expect(screen.getByText("Admin route content")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Открыть навигацию" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
    expect(document.querySelector(".animated-bg")).toBeNull();
  });

  it.each([
    ["/admin", "Admin route content"],
    ["/admin/users", "Admin users content"],
    ["/admin/projects", "Admin projects content"],
    ["/admin/articles", "Admin articles content"],
    ["/admin/activity", "Admin activity content"],
    ["/admin/sessions", "Admin sessions content"],
    ["/admin/jobs", "Admin jobs content"],
    ["/admin/errors", "Admin errors content"],
    ["/admin/audit", "Admin audit content"],
    ["/admin/system", "Admin system content"],
    ["/admin/settings", "Admin settings content"],
  ])(
    "hides app shell for %s across target viewport widths",
    (route, pageLabel) => {
      for (const width of targetViewportWidths) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Открыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
        expect(document.querySelector(".animated-bg")).toBeNull();

        unmount();
      }
    },
  );

  it("hides sidebar shell when user is not authenticated", () => {
    mockAuthState.token = null;
    mockAuthState.user = null;

    renderAppLayout("/projects");

    expect(screen.getByText("Projects page")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Открыть навигацию" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
    expect(document.querySelector(".animated-bg")).toBeNull();
  });

  it("toggles layout-fixed classes for document editor route lifecycle", async () => {
    const user = userEvent.setup();
    const { unmount } = renderAppLayout("/projects/p1/documents/d1");

    expect(screen.getByText("Document editor page")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("layout-fixed")).toBe(
      true,
    );
    expect(document.body.classList.contains("layout-fixed")).toBe(true);
    expect(document.querySelector(".app-layout-fixed")).not.toBeNull();
    expect(document.querySelector(".animated-bg")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Открыть навигацию" }),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Back to projects"));

    await waitFor(() => {
      expect(screen.getByText("Projects page")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        false,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(false);
    });

    unmount();
    expect(document.documentElement.classList.contains("layout-fixed")).toBe(
      false,
    );
    expect(document.body.classList.contains("layout-fixed")).toBe(false);
  });

  it("uses fixed layout shell for graph tab route", () => {
    const { unmount } = renderAppLayout("/projects/p1?tab=graph");

    expect(screen.getByText("Project details page")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("layout-fixed")).toBe(
      true,
    );
    expect(document.body.classList.contains("layout-fixed")).toBe(true);
    expect(document.querySelector(".app-layout-fixed")).not.toBeNull();
    expect(document.querySelector(".animated-bg")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Открыть навигацию" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".app-mobile-topbar")).toBeNull();

    unmount();
    expect(document.documentElement.classList.contains("layout-fixed")).toBe(
      false,
    );
    expect(document.body.classList.contains("layout-fixed")).toBe(false);
  });

  it("keeps document editor route in fixed layout on all target widths", () => {
    for (const width of targetViewportWidths) {
      setViewportWidth(width);
      const { unmount } = renderAppLayout("/projects/p1/documents/d1");

      expect(screen.getByText("Document editor page")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        true,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(true);

      unmount();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        false,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(false);
    }
  });

  it("keeps graph tab route in fixed layout on all target widths", () => {
    for (const width of targetViewportWidths) {
      setViewportWidth(width);
      const { unmount } = renderAppLayout("/projects/p1?tab=graph");

      expect(screen.getByText("Project details page")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        true,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(true);
      expect(document.querySelector(".animated-bg")).toBeNull();

      unmount();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        false,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(false);
    }
  });

  it.each([
    ["/projects/p1/documents/d1", "Document editor page"],
    ["/projects/p1?tab=graph", "Project details page"],
  ])(
    "cleans fixed layout and sidebar modal state when leaving %s",
    async (route, pageLabel) => {
      const user = userEvent.setup();
      renderAppLayout(route);

      expect(screen.getByText(pageLabel)).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        true,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(true);

      const toggleButton = screen.getByLabelText("Открыть навигацию");
      await user.click(toggleButton);
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
      expect(toggleButton).toHaveAttribute("aria-label", "Закрыть навигацию");

      await user.click(screen.getByText("Back to projects"));

      await waitFor(() => {
        expect(screen.getByText("Projects page")).toBeInTheDocument();
        expect(document.body.classList.contains("sidebar-modal-open")).toBe(
          false,
        );
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
        expect(screen.getByLabelText("Открыть навигацию")).toBeInTheDocument();
      });
    },
  );
});
