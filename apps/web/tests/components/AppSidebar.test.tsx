import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppSidebar from "../../src/components/AppSidebar";

const mockLogout = vi.fn();

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "test@example.com" },
    logout: mockLogout,
  }),
}));

function renderSidebar({
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
      initialEntries={["/projects/project-1?tab=articles"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/projects/:id"
          element={
            <AppSidebar
              mobileViewport={mobileViewport}
              mobileOpen={mobileOpen}
              onCloseMobile={onCloseMobile}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppSidebar mobile collapse behavior", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    document.body.classList.remove("sidebar-collapsed");
  });

  it("hides desktop collapse toggle on mobile viewport", () => {
    renderSidebar({ mobileViewport: true });

    expect(screen.queryByTitle("Свернуть")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Развернуть")).not.toBeInTheDocument();
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
});
