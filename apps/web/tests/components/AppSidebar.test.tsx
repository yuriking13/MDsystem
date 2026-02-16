import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AppSidebar from "../../src/components/AppSidebar";

const mockLogout = vi.fn();

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "test@example.com" },
    logout: mockLogout,
  }),
}));

function renderSidebar({
  sidebarId,
  mobileViewport,
  mobileOpen = false,
  onCloseMobile,
  initialPath = "/projects/project-1?tab=articles",
}: {
  sidebarId?: string;
  mobileViewport: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  initialPath?: string;
}) {
  function LocationProbe() {
    const location = useLocation();
    return (
      <div data-testid="sidebar-location">
        {location.pathname}
        {location.search}
      </div>
    );
  }

  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/projects/:id"
          element={
            <>
              <AppSidebar
                sidebarId={sidebarId}
                mobileViewport={mobileViewport}
                mobileOpen={mobileOpen}
                onCloseMobile={onCloseMobile}
              />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/projects/:projectId/documents/:docId"
          element={
            <>
              <AppSidebar
                sidebarId={sidebarId}
                mobileViewport={mobileViewport}
                mobileOpen={mobileOpen}
                onCloseMobile={onCloseMobile}
              />
              <LocationProbe />
            </>
          }
        />
        <Route path="/projects" element={<div>Projects route</div>} />
        <Route path="/settings" element={<div>Settings route</div>} />
        <Route path="/docs" element={<div>Docs route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderMainNavSidebar({
  mobileViewport,
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileViewport: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  return render(
    <MemoryRouter
      initialEntries={["/projects"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/projects"
          element={
            <AppSidebar
              mobileViewport={mobileViewport}
              mobileOpen={mobileOpen}
              onCloseMobile={onCloseMobile}
            />
          }
        />
        <Route path="/docs" element={<div>Docs route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppSidebar mobile collapse behavior", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    localStorage.clear();
    document.body.classList.remove("sidebar-collapsed");
    document.body.classList.remove("light-theme");
    document.body.classList.remove("dark");
    document.documentElement.classList.remove("light-theme");
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("no-transitions");
  });

  it("hides desktop collapse toggle on mobile viewport", () => {
    renderSidebar({ mobileViewport: true });

    expect(screen.queryByTitle("Свернуть")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Развернуть")).not.toBeInTheDocument();
  });

  it("applies custom sidebar id when provided", () => {
    renderSidebar({ mobileViewport: true, sidebarId: "test-mobile-sidebar" });

    expect(document.getElementById("test-mobile-sidebar")).not.toBeNull();
  });

  it("applies mobile open class when mobileOpen prop is true", () => {
    const { rerender } = renderSidebar({
      mobileViewport: true,
      mobileOpen: false,
    });

    expect(document.querySelector(".app-sidebar--open")).toBeNull();

    rerender(
      <MemoryRouter
        initialEntries={["/projects/project-1?tab=articles"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/projects/:id"
            element={<AppSidebar mobileViewport mobileOpen />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.querySelector(".app-sidebar--open")).not.toBeNull();
  });

  it("keeps labels visible on mobile after desktop collapsed state", async () => {
    const user = userEvent.setup();
    const { rerender } = renderSidebar({ mobileViewport: false });

    const collapseButton = screen.getByTitle("Свернуть");
    await user.click(collapseButton);

    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter
        initialEntries={["/projects/project-1?tab=articles"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/projects/:id" element={<AppSidebar mobileViewport />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
    expect(screen.getByText("Scientiaiter")).toBeInTheDocument();
  });

  it("restores collapsed desktop shell after returning from mobile viewport", async () => {
    const user = userEvent.setup();
    const { rerender } = renderSidebar({ mobileViewport: false });

    await user.click(screen.getByTitle("Свернуть"));
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter
        initialEntries={["/projects/project-1?tab=articles"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/projects/:id" element={<AppSidebar mobileViewport />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
    expect(screen.getByText("Scientiaiter")).toBeInTheDocument();

    rerender(
      <MemoryRouter
        initialEntries={["/projects/project-1?tab=articles"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/projects/:id"
            element={<AppSidebar mobileViewport={false} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
  });

  it("removes sidebar-collapsed class on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSidebar({ mobileViewport: false });

    await user.click(screen.getByTitle("Свернуть"));
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);

    unmount();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
  });

  it("calls onCloseMobile after mobile navigation item click", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByText("Документы"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it("updates project tab query and closes mobile drawer on tab navigation", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
      initialPath: "/projects/project-1?tab=articles",
    });

    await user.click(screen.getByText("Документы"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sidebar-location").textContent).toBe(
      "/projects/project-1?tab=documents",
    );
  });

  it("calls onCloseMobile when opening docs from main mobile navigation", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderMainNavSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByText("Документация"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Docs route")).toBeInTheDocument();
  });

  it("calls onCloseMobile when selecting projects in main mobile navigation", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderMainNavSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByText("Проекты"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it("calls onCloseMobile when returning to projects in mobile drawer", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByText("К проектам"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it("calls onCloseMobile when opening profile settings in mobile drawer", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByTitle("Перейти в настройки"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it("calls onCloseMobile when logging out from mobile drawer", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByText("Выйти"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it("does not close mobile drawer when toggling articles root item", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByText("База статей"));

    expect(onCloseMobile).not.toHaveBeenCalled();
  });

  it("switches to articles tab without closing drawer when clicking articles root from another tab", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
      initialPath: "/projects/project-1?tab=documents",
    });

    await user.click(screen.getByText("База статей"));

    expect(onCloseMobile).not.toHaveBeenCalled();
    expect(screen.getByTestId("sidebar-location").textContent).toBe(
      "/projects/project-1?tab=articles",
    );
  });

  it("closes mobile drawer when selecting article status submenu item", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
    });

    await user.click(screen.getByText("Кандидаты"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it("navigates from document-editor route to project tab and closes mobile drawer", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
      initialPath: "/projects/project-1/documents/doc-1",
    });

    expect(screen.getByTestId("sidebar-location").textContent).toBe(
      "/projects/project-1/documents/doc-1",
    );

    await user.click(screen.getByText("Файлы"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sidebar-location").textContent).toBe(
      "/projects/project-1?tab=files",
    );
  });

  it("switches from document editor to articles tab without closing, then closes on status pick", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    renderSidebar({
      mobileViewport: true,
      mobileOpen: true,
      onCloseMobile,
      initialPath: "/projects/project-1/documents/doc-1",
    });

    await user.click(screen.getByText("База статей"));

    expect(onCloseMobile).not.toHaveBeenCalled();
    expect(screen.getByTestId("sidebar-location").textContent).toBe(
      "/projects/project-1?tab=articles",
    );

    await user.click(screen.getByText("База статей"));
    expect(onCloseMobile).not.toHaveBeenCalled();

    await user.click(screen.getByText("Отобранные"));

    expect(onCloseMobile).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sidebar-location").textContent).toBe(
      "/projects/project-1?tab=articles",
    );
  });

  it("updates document theme classes and localStorage via theme switcher radios", async () => {
    localStorage.setItem("theme", "dark");
    renderSidebar({ mobileViewport: false });

    const lightRadio = document.querySelector(
      'input[name="theme-toggle"][value="light"]',
    ) as HTMLInputElement | null;
    const darkRadio = document.querySelector(
      'input[name="theme-toggle"][value="dark"]',
    ) as HTMLInputElement | null;

    expect(lightRadio).not.toBeNull();
    expect(darkRadio).not.toBeNull();
    expect(darkRadio?.checked).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    fireEvent.click(lightRadio!);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(
        true,
      );
      expect(document.body.classList.contains("light-theme")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.body.classList.contains("dark")).toBe(false);
      expect(lightRadio?.checked).toBe(true);
    });

    fireEvent.click(darkRadio!);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.body.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light-theme")).toBe(
        false,
      );
      expect(document.body.classList.contains("light-theme")).toBe(false);
      expect(darkRadio?.checked).toBe(true);
      expect(
        document.documentElement.classList.contains("no-transitions"),
      ).toBe(false);
    });
  });

  it("initializes dark theme classes when no persisted preference exists", () => {
    renderSidebar({ mobileViewport: false });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.body.classList.contains("dark")).toBe(true);
    expect(document.body.classList.contains("light-theme")).toBe(false);

    const lightRadio = document.querySelector(
      'input[name="theme-toggle"][value="light"]',
    ) as HTMLInputElement | null;
    const darkRadio = document.querySelector(
      'input[name="theme-toggle"][value="dark"]',
    ) as HTMLInputElement | null;

    expect(lightRadio?.checked).toBe(false);
    expect(darkRadio?.checked).toBe(true);
  });

  it("cleans stale opposite theme classes when syncing persisted theme", () => {
    document.documentElement.classList.add("light-theme");
    document.body.classList.add("light-theme");
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");

    localStorage.setItem("theme", "dark");
    renderSidebar({ mobileViewport: false });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.body.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light-theme")).toBe(
      false,
    );
    expect(document.body.classList.contains("light-theme")).toBe(false);
  });
});
