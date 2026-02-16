import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "../../src/pages/admin/AdminLayout";
import { isAdminMobileViewport } from "../../src/lib/responsive";
import {
  ADMIN_DRAWER_VIEWPORT_CASES,
  ADMIN_DRAWER_BOUNDARY_CASES,
  ADMIN_DRAWER_MAX_WIDTH,
  ADMIN_RESPONSIVE_ROUTE_CASES,
  MOBILE_VIEWPORT_WIDTHS,
  TARGET_VIEWPORT_WIDTHS,
} from "../utils/responsiveMatrix";
import { setViewportWidth } from "../utils/viewport";

const mockLogout = vi.fn();

vi.mock("../../src/lib/AdminContext", () => ({
  useAdminAuth: () => ({
    admin: { email: "admin@example.com" },
    logout: mockLogout,
  }),
}));

function renderAdminLayout(initialPath = "/admin") {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>Admin dashboard</div>} />
          <Route path="users" element={<div>Users page</div>} />
          <Route path="projects" element={<div>Projects page</div>} />
          <Route path="articles" element={<div>Articles page</div>} />
          <Route path="activity" element={<div>Activity page</div>} />
          <Route path="sessions" element={<div>Sessions page</div>} />
          <Route path="jobs" element={<div>Jobs page</div>} />
          <Route path="errors" element={<div>Errors page</div>} />
          <Route path="audit" element={<div>Audit page</div>} />
          <Route path="system" element={<div>System page</div>} />
          <Route path="settings" element={<div>Settings page</div>} />
        </Route>
        <Route path="/projects" element={<div>App projects page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminLayout responsive sidebar behavior", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    document.body.classList.remove("sidebar-modal-open");
    document.body.classList.remove("layout-fixed");
    document.documentElement.classList.remove("layout-fixed");
    setViewportWidth(1280);
  });

  it("keeps the required responsive viewport matrix", () => {
    expect(TARGET_VIEWPORT_WIDTHS).toEqual([
      360, 390, 768, 1024, 1280, 1440, 1920,
    ]);
  });

  it("keeps required admin route coverage for responsive checks", () => {
    expect(ADMIN_RESPONSIVE_ROUTE_CASES.map(({ route }) => route)).toEqual([
      "/admin",
      "/admin/users",
      "/admin/projects",
      "/admin/articles",
      "/admin/activity",
      "/admin/sessions",
      "/admin/jobs",
      "/admin/errors",
      "/admin/audit",
      "/admin/system",
      "/admin/settings",
    ]);
  });

  it("shows labels on mobile even after desktop sidebar collapse", async () => {
    const user = userEvent.setup();
    renderAdminLayout();

    await user.click(screen.getByTitle("Свернуть"));
    expect(screen.queryByText("Scientiaiter Admin")).not.toBeInTheDocument();

    act(() => {
      setViewportWidth(390);
    });

    await waitFor(() => {
      expect(screen.getByText("Scientiaiter Admin")).toBeInTheDocument();
      expect(screen.getAllByText("Дашборд").length).toBeGreaterThan(0);
    });
  });

  it("restores collapsed desktop labels state after mobile round-trip", async () => {
    const user = userEvent.setup();
    renderAdminLayout();

    await user.click(screen.getByTitle("Свернуть"));
    expect(screen.queryByText("Scientiaiter Admin")).not.toBeInTheDocument();

    act(() => {
      setViewportWidth(390);
    });

    await waitFor(() => {
      expect(screen.getByText("Scientiaiter Admin")).toBeInTheDocument();
    });

    act(() => {
      setViewportWidth(1280);
    });

    await waitFor(() => {
      expect(screen.queryByText("Scientiaiter Admin")).not.toBeInTheDocument();
      expect(screen.getByTitle("Развернуть")).toBeInTheDocument();
    });
  });

  it("adds and removes body modal class when mobile sidebar opens/closes", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAdminLayout();

    const toggleButton = screen.getByLabelText("Открыть навигацию");
    expect(toggleButton).toHaveAttribute(
      "aria-controls",
      "admin-primary-sidebar",
    );
    expect(toggleButton).toBeEnabled();
    expect(document.getElementById("admin-primary-sidebar")).not.toBeNull();
    await user.click(toggleButton);
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
    expect(toggleButton).toHaveAttribute("aria-label", "Закрыть навигацию");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(false);
    expect(toggleButton).toHaveAttribute("aria-label", "Открыть навигацию");
  });

  it("closes mobile sidebar when clicking overlay", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAdminLayout();

    const toggleButton = screen.getByLabelText("Открыть навигацию");
    expect(toggleButton).toBeEnabled();
    await user.click(toggleButton);
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
    const overlayButton = screen.getByLabelText("Закрыть меню навигации");
    expect(overlayButton).toHaveAttribute(
      "aria-controls",
      "admin-primary-sidebar",
    );

    await user.click(overlayButton);

    await waitFor(() => {
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
      expect(toggleButton).toHaveAttribute("aria-label", "Открыть навигацию");
      expect(screen.queryByLabelText("Закрыть меню навигации")).toBeNull();
    });
  });

  it.each(ADMIN_DRAWER_VIEWPORT_CASES)(
    "keeps sidebar modal behavior consistent at %ipx",
    async (width, shouldOpenOnToggle) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAdminLayout();

      const toggleButton = screen.getByLabelText("Открыть навигацию");
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        false,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(false);
      expect(toggleButton).toHaveAttribute(
        "aria-controls",
        "admin-primary-sidebar",
      );
      if (shouldOpenOnToggle) {
        expect(toggleButton).toBeEnabled();
      } else {
        expect(toggleButton).toBeDisabled();
      }
      await user.click(toggleButton);

      await waitFor(() => {
        expect(document.body.classList.contains("sidebar-modal-open")).toBe(
          shouldOpenOnToggle,
        );
        const sidebar = document.querySelector(".admin-sidebar");
        expect(sidebar).not.toBeNull();
        expect(sidebar?.classList.contains("mobile-open")).toBe(
          shouldOpenOnToggle,
        );
        expect(document.querySelector(".admin-sidebar-overlay") !== null).toBe(
          shouldOpenOnToggle,
        );
        expect(toggleButton).toHaveAttribute(
          "aria-expanded",
          shouldOpenOnToggle ? "true" : "false",
        );
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
        const overlayButton = screen.queryByRole("button", {
          name: "Закрыть меню навигации",
        });
        if (shouldOpenOnToggle) {
          expect(overlayButton).toBeInTheDocument();
          expect(overlayButton).toHaveAttribute(
            "aria-controls",
            "admin-primary-sidebar",
          );
        } else {
          expect(overlayButton).not.toBeInTheDocument();
        }
      });
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "toggles admin mobile sidebar open and closed via same button at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAdminLayout();

      const toggleButton = screen.getByRole("button", {
        name: "Открыть навигацию",
      });
      expect(toggleButton).toBeEnabled();
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

  it.each(ADMIN_DRAWER_BOUNDARY_CASES)(
    "applies admin drawer breakpoint boundary at %ipx (open=%s)",
    async (width, shouldOpenOnToggle) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAdminLayout("/admin/users");

      expect(screen.getByText("Users page")).toBeInTheDocument();
      const toggleButton = screen.getByRole("button", {
        name: "Открыть навигацию",
      });
      if (shouldOpenOnToggle) {
        expect(toggleButton).toBeEnabled();
      } else {
        expect(toggleButton).toBeDisabled();
      }

      await user.click(toggleButton);

      await waitFor(() => {
        expect(document.body.classList.contains("sidebar-modal-open")).toBe(
          shouldOpenOnToggle,
        );
      });
    },
  );

  it("keeps admin drawer usable after mobile-open -> desktop -> mobile cycle", async () => {
    const user = userEvent.setup();
    setViewportWidth(ADMIN_DRAWER_MAX_WIDTH);
    renderAdminLayout("/admin/users");

    const toggleButton = screen.getByRole("button", {
      name: "Открыть навигацию",
    });
    expect(toggleButton).toBeEnabled();
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    await user.click(toggleButton);
    await waitFor(() => {
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
      expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    });

    act(() => {
      setViewportWidth(ADMIN_DRAWER_MAX_WIDTH + 1);
    });

    await waitFor(() => {
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
      expect(toggleButton).toBeDisabled();
      expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    });

    act(() => {
      setViewportWidth(ADMIN_DRAWER_MAX_WIDTH);
    });

    await waitFor(() => {
      expect(toggleButton).toBeEnabled();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
      expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    });

    await user.click(toggleButton);
    await waitFor(() => {
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
      expect(
        document.querySelector(".admin-sidebar.mobile-open"),
      ).not.toBeNull();
      expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    });
  });

  it.each(
    ADMIN_RESPONSIVE_ROUTE_CASES.map(({ route, pageLabel }) => [
      route,
      pageLabel,
    ]),
  )(
    "keeps sidebar toggle viewport-gated for %s across width matrix",
    async (route, pageLabel) => {
      const user = userEvent.setup();

      for (const width of TARGET_VIEWPORT_WIDTHS) {
        const shouldOpenOnToggle = isAdminMobileViewport(width);
        setViewportWidth(width);
        const { unmount } = renderAdminLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
        const toggleButton = screen.getByLabelText("Открыть навигацию");
        expect(toggleButton).toHaveAttribute(
          "aria-controls",
          "admin-primary-sidebar",
        );
        if (shouldOpenOnToggle) {
          expect(toggleButton).toBeEnabled();
        } else {
          expect(toggleButton).toBeDisabled();
        }
        await user.click(toggleButton);

        await waitFor(() => {
          expect(document.body.classList.contains("sidebar-modal-open")).toBe(
            shouldOpenOnToggle,
          );
          const sidebar = document.querySelector(".admin-sidebar");
          expect(sidebar).not.toBeNull();
          expect(sidebar?.classList.contains("mobile-open")).toBe(
            shouldOpenOnToggle,
          );
          expect(
            document.querySelector(".admin-sidebar-overlay") !== null,
          ).toBe(shouldOpenOnToggle);
          expect(toggleButton).toHaveAttribute(
            "aria-expanded",
            shouldOpenOnToggle ? "true" : "false",
          );
          const overlayButton = screen.queryByRole("button", {
            name: "Закрыть меню навигации",
          });
          if (shouldOpenOnToggle) {
            expect(overlayButton).toBeInTheDocument();
            expect(overlayButton).toHaveAttribute(
              "aria-controls",
              "admin-primary-sidebar",
            );
          } else {
            expect(overlayButton).not.toBeInTheDocument();
          }
          expect(
            document.documentElement.classList.contains("layout-fixed"),
          ).toBe(false);
          expect(document.body.classList.contains("layout-fixed")).toBe(false);
        });

        unmount();
        document.body.classList.remove("sidebar-modal-open");
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
      }
    },
  );

  it("cleans up body modal class on unmount", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    const { unmount } = renderAdminLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    unmount();
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(false);
  });

  it("closes mobile sidebar when navigating to another admin section", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAdminLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    await user.click(screen.getByText("Пользователи"));

    await waitFor(() => {
      expect(screen.getByText("Users page")).toBeInTheDocument();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
    });
  });

  it("closes mobile sidebar when leaving admin to app projects route", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAdminLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    await user.click(screen.getByText("Вернуться в приложение"));

    await waitFor(() => {
      expect(screen.getByText("App projects page")).toBeInTheDocument();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
      expect(
        screen.queryByLabelText("Открыть навигацию"),
      ).not.toBeInTheDocument();
    });
  });

  it("closes mobile sidebar when resizing to desktop viewport", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAdminLayout();

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

  it("enables admin mobile toggle when resizing from desktop to mobile boundary", async () => {
    const user = userEvent.setup();
    setViewportWidth(ADMIN_DRAWER_MAX_WIDTH + 1);
    renderAdminLayout("/admin/users");

    const toggleButton = screen.getByRole("button", {
      name: "Открыть навигацию",
    });
    expect(toggleButton).toBeDisabled();

    act(() => {
      setViewportWidth(ADMIN_DRAWER_MAX_WIDTH);
    });

    await waitFor(() => {
      expect(toggleButton).toBeEnabled();
    });

    await user.click(toggleButton);

    await waitFor(() => {
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
      expect(
        document.querySelector(".admin-sidebar.mobile-open"),
      ).not.toBeNull();
    });
  });

  it.each(
    ADMIN_RESPONSIVE_ROUTE_CASES.map(({ route, pageLabel, mobileTitle }) => [
      route,
      pageLabel,
      mobileTitle,
    ]),
  )(
    "shows current section label in mobile topbar for %s",
    (route, pageLabel, expectedMobileTitle) => {
      setViewportWidth(390);
      renderAdminLayout(route);

      expect(screen.getByText(pageLabel)).toBeInTheDocument();
      const mobileTitle = document.querySelector(".admin-mobile-title");
      expect(mobileTitle).not.toBeNull();
      expect(mobileTitle?.textContent).toBe(expectedMobileTitle);
    },
  );

  it.each(
    ADMIN_RESPONSIVE_ROUTE_CASES.map(({ route, pageLabel, mobileTitle }) => [
      route,
      pageLabel,
      mobileTitle,
    ]),
  )(
    "keeps mobile topbar title consistent for %s across target mobile widths",
    (route, pageLabel, expectedMobileTitle) => {
      for (const width of MOBILE_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAdminLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        const mobileTitle = document.querySelector(".admin-mobile-title");
        expect(mobileTitle).not.toBeNull();
        expect(mobileTitle?.textContent).toBe(expectedMobileTitle);

        unmount();
      }
    },
  );
});
