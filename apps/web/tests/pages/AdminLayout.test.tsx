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

const mockLogout = vi.fn();

vi.mock("../../src/lib/AdminContext", () => ({
  useAdminAuth: () => ({
    admin: { email: "admin@example.com" },
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
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminLayout responsive sidebar behavior", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    document.body.classList.remove("sidebar-modal-open");
    setViewportWidth(1280);
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

  it("adds and removes body modal class when mobile sidebar opens/closes", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAdminLayout();

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(false);
  });

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
});
