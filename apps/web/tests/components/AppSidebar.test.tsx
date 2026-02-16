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

function renderSidebar(mobileViewport: boolean) {
  return render(
    <MemoryRouter
      initialEntries={["/projects/project-1?tab=articles"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/projects/:id"
          element={<AppSidebar mobileViewport={mobileViewport} />}
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
    renderSidebar(true);

    expect(screen.queryByTitle("Свернуть")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Развернуть")).not.toBeInTheDocument();
  });

  it("keeps labels visible on mobile after desktop collapsed state", async () => {
    const user = userEvent.setup();
    const { rerender } = renderSidebar(false);

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

  it("removes sidebar-collapsed class on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSidebar(false);

    await user.click(screen.getByTitle("Свернуть"));
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);

    unmount();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(false);
  });
});
