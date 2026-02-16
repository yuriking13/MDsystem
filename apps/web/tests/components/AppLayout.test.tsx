import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef, useState } from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import AppLayout, { useProjectContext } from "../../src/components/AppLayout";
import {
  MOBILE_VIEWPORT_WIDTHS,
  PROJECT_TAB_CASES,
  PROJECT_TABS,
  TARGET_VIEWPORT_WIDTHS,
} from "../utils/responsiveMatrix";

const mockLogout = vi.fn();
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

function ProjectContextTitlePage() {
  const { setProjectInfo, setArticleCounts, setArticleViewStatus } =
    useProjectContext();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setProjectInfo({
      name: "Проект Альфа",
      role: "owner",
      updatedAt: "2026-02-15T00:00:00.000Z",
    });
    setArticleCounts({
      candidate: 11,
      selected: 17,
      excluded: 5,
      deleted: 2,
      total: 33,
    });
    setArticleViewStatus("selected");
  }, [setArticleCounts, setArticleViewStatus, setProjectInfo]);

  return (
    <div>
      <div>Project context title page</div>
      <Link to="/settings">Go settings</Link>
      <Link to="/projects">Go projects</Link>
      <Link to="/docs">Go docs</Link>
      <Link to="/projects/p1?tab=documents">Go project documents</Link>
      <Link to="/projects/p1?tab=graph">Go project graph</Link>
      <Link to="/projects/p2?tab=articles">Go another project</Link>
      <Link to="/projects/p2/context-title">Go project beta context</Link>
    </div>
  );
}

function ProjectContextTitlePageBeta() {
  const { setProjectInfo, setArticleCounts, setArticleViewStatus } =
    useProjectContext();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setProjectInfo({
      name: "Проект Бета",
      role: "viewer",
      updatedAt: "2026-02-16T00:00:00.000Z",
    });
    setArticleCounts({
      candidate: 42,
      selected: 3,
      excluded: 1,
      deleted: 0,
      total: 46,
    });
    setArticleViewStatus("candidate");
  }, [setArticleCounts, setArticleViewStatus, setProjectInfo]);

  return (
    <div>
      <div>Project context title page beta</div>
      <Link to="/projects/p2?tab=documents">Go project two documents</Link>
      <Link to="/projects/p1?tab=articles">Go back to project one</Link>
    </div>
  );
}

function ProjectDetailsContextPage() {
  const { projectInfo, articleCounts, articleViewStatus } = useProjectContext();

  return (
    <div>
      <div>Project details page</div>
      <div data-testid="project-context-name">{projectInfo.name ?? "null"}</div>
      <div data-testid="project-context-selected-count">
        {String(articleCounts.selected)}
      </div>
      <div data-testid="project-context-status">{articleViewStatus}</div>
      <Link to="/projects">Back to projects</Link>
      <Link to="/projects/p1?tab=documents">Go documents tab</Link>
      <Link to="/projects/p1?tab=graph">Go graph tab</Link>
    </div>
  );
}

function ProjectContextPersistencePage() {
  const { setProjectInfo, clearProjectInfo } = useProjectContext();
  const [counter, setCounter] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setProjectInfo({
      name: "Проект Гамма",
      role: "editor",
      updatedAt: "2026-02-16T01:00:00.000Z",
    });
  }, [setProjectInfo]);

  useEffect(() => {
    return () => {
      clearProjectInfo();
    };
  }, [clearProjectInfo]);

  return (
    <div>
      <div>Project context persistence page</div>
      <div data-testid="context-persistence-counter">{String(counter)}</div>
      <button type="button" onClick={() => setCounter((prev) => prev + 1)}>
        Bump context local state
      </button>
    </div>
  );
}

function ProjectContextDataPersistencePage() {
  const {
    setProjectInfo,
    setArticleCounts,
    setArticleViewStatus,
    clearProjectInfo,
    articleCounts,
    articleViewStatus,
  } = useProjectContext();
  const [counter, setCounter] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setProjectInfo({
      name: "Проект Дельта",
      role: "owner",
      updatedAt: "2026-02-16T02:00:00.000Z",
    });
    setArticleCounts({
      candidate: 2,
      selected: 9,
      excluded: 1,
      deleted: 0,
      total: 12,
    });
    setArticleViewStatus("excluded");
  }, [setArticleCounts, setArticleViewStatus, setProjectInfo]);

  useEffect(() => {
    return () => {
      clearProjectInfo();
    };
  }, [clearProjectInfo]);

  return (
    <div>
      <div>Project context data persistence page</div>
      <div data-testid="context-data-counter">{String(counter)}</div>
      <div data-testid="context-data-selected">
        {String(articleCounts.selected)}
      </div>
      <div data-testid="context-data-status">{articleViewStatus}</div>
      <button type="button" onClick={() => setCounter((prev) => prev + 1)}>
        Bump data context local state
      </button>
    </div>
  );
}

function ProjectContextCleanupSourcePage() {
  const { setProjectInfo, clearProjectInfo } = useProjectContext();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setProjectInfo({
      name: "Проект Эпсилон",
      role: "editor",
      updatedAt: "2026-02-16T03:00:00.000Z",
    });
  }, [setProjectInfo]);

  useEffect(() => {
    return () => {
      clearProjectInfo();
    };
  }, [clearProjectInfo]);

  return (
    <div>
      <div>Project context cleanup source page</div>
      <Link to="/projects/p1/context-cleanup-target">Go cleanup target</Link>
    </div>
  );
}

function ProjectContextCleanupTargetPage() {
  const {
    setProjectInfo,
    setArticleCounts,
    setArticleViewStatus,
    articleCounts,
    articleViewStatus,
  } = useProjectContext();
  const [counter, setCounter] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setProjectInfo({
      name: "Проект Зета",
      role: "viewer",
      updatedAt: "2026-02-16T04:00:00.000Z",
    });
    setArticleCounts({
      candidate: 6,
      selected: 4,
      excluded: 2,
      deleted: 0,
      total: 12,
    });
    setArticleViewStatus("selected");
  }, [setArticleCounts, setArticleViewStatus, setProjectInfo]);

  return (
    <div>
      <div>Project context cleanup target page</div>
      <div data-testid="context-cleanup-target-counter">{String(counter)}</div>
      <div data-testid="context-cleanup-target-selected">
        {String(articleCounts.selected)}
      </div>
      <div data-testid="context-cleanup-target-status">{articleViewStatus}</div>
      <button type="button" onClick={() => setCounter((prev) => prev + 1)}>
        Bump cleanup target local state
      </button>
    </div>
  );
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
            path="/projects/p1/context-title"
            element={<ProjectContextTitlePage />}
          />
          <Route
            path="/projects/p2/context-title"
            element={<ProjectContextTitlePageBeta />}
          />
          <Route
            path="/projects/p1/context-persistence"
            element={<ProjectContextPersistencePage />}
          />
          <Route
            path="/projects/p1/context-data-persistence"
            element={<ProjectContextDataPersistencePage />}
          />
          <Route
            path="/projects/p1/context-cleanup-source"
            element={<ProjectContextCleanupSourcePage />}
          />
          <Route
            path="/projects/p1/context-cleanup-target"
            element={<ProjectContextCleanupTargetPage />}
          />
          <Route path="/projects/:id" element={<ProjectDetailsContextPage />} />
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

  it("keeps the required responsive viewport matrix", () => {
    expect(TARGET_VIEWPORT_WIDTHS).toEqual([
      360, 390, 768, 1024, 1280, 1440, 1920,
    ]);
  });

  it("keeps required project tab coverage for responsive routes", () => {
    expect(PROJECT_TABS).toEqual([
      "articles",
      "documents",
      "files",
      "statistics",
      "settings",
      "graph",
    ]);
    expect(
      PROJECT_TAB_CASES.filter((item) => item.shouldLockLayout).map(
        (item) => item.tab,
      ),
    ).toEqual(["graph"]);
  });

  it("toggles body modal class and closes on Escape", async () => {
    const user = userEvent.setup();
    renderAppLayout();

    const toggleButton = screen.getByLabelText("Открыть навигацию");
    expect(toggleButton).toBeEnabled();
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
    expect(toggleButton).toBeEnabled();
    await user.click(toggleButton);
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);
    const overlayButton = screen.getByLabelText("Закрыть меню навигации");
    expect(overlayButton).toHaveAttribute(
      "aria-controls",
      "app-primary-sidebar",
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

  it("shows animated background on standard app routes", () => {
    renderAppLayout("/projects");

    expect(screen.getByText("Projects page")).toBeInTheDocument();
    expect(document.querySelector(".animated-bg")).not.toBeNull();
  });

  it("keeps project context title stable across local rerenders", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAppLayout("/projects/p1/context-persistence");

    await waitFor(() => {
      expect(
        document.querySelector(".app-mobile-topbar-title")?.textContent,
      ).toBe("Проект Гамма");
    });

    await user.click(screen.getByText("Bump context local state"));

    await waitFor(() => {
      expect(
        screen.getByTestId("context-persistence-counter"),
      ).toHaveTextContent("1");
      expect(
        document.querySelector(".app-mobile-topbar-title")?.textContent,
      ).toBe("Проект Гамма");
    });
  });

  it("keeps project context counts and status stable across local rerenders", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAppLayout("/projects/p1/context-data-persistence");

    await waitFor(() => {
      expect(
        document.querySelector(".app-mobile-topbar-title")?.textContent,
      ).toBe("Проект Дельта");
      expect(screen.getByTestId("context-data-selected")).toHaveTextContent(
        "9",
      );
      expect(screen.getByTestId("context-data-status")).toHaveTextContent(
        "excluded",
      );
    });

    await user.click(screen.getByText("Bump data context local state"));

    await waitFor(() => {
      expect(screen.getByTestId("context-data-counter")).toHaveTextContent("1");
      expect(
        document.querySelector(".app-mobile-topbar-title")?.textContent,
      ).toBe("Проект Дельта");
      expect(screen.getByTestId("context-data-selected")).toHaveTextContent(
        "9",
      );
      expect(screen.getByTestId("context-data-status")).toHaveTextContent(
        "excluded",
      );
    });
  });

  it("keeps destination project context when previous route cleanup runs", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAppLayout("/projects/p1/context-cleanup-source");

    await waitFor(() => {
      expect(
        document.querySelector(".app-mobile-topbar-title")?.textContent,
      ).toBe("Проект Эпсилон");
    });

    await user.click(screen.getByText("Go cleanup target"));

    await waitFor(() => {
      expect(
        screen.getByText("Project context cleanup target page"),
      ).toBeInTheDocument();
      expect(
        document.querySelector(".app-mobile-topbar-title")?.textContent,
      ).toBe("Проект Зета");
      expect(
        screen.getByTestId("context-cleanup-target-selected"),
      ).toHaveTextContent("4");
      expect(
        screen.getByTestId("context-cleanup-target-status"),
      ).toHaveTextContent("selected");
    });

    await user.click(screen.getByText("Bump cleanup target local state"));

    await waitFor(() => {
      expect(
        screen.getByTestId("context-cleanup-target-counter"),
      ).toHaveTextContent("1");
      expect(
        document.querySelector(".app-mobile-topbar-title")?.textContent,
      ).toBe("Проект Зета");
      expect(
        screen.getByTestId("context-cleanup-target-selected"),
      ).toHaveTextContent("4");
      expect(
        screen.getByTestId("context-cleanup-target-status"),
      ).toHaveTextContent("selected");
    });
  });

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "shows project name in mobile topbar when project context provides one at %ipx",
    async (width) => {
      setViewportWidth(width);
      renderAppLayout("/projects/p1/context-title");

      expect(
        screen.getByText("Project context title page"),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
      });
    },
  );

  it.each([
    ["Go settings", "Settings page"],
    ["Go projects", "Projects page"],
    ["Go docs", "Docs page"],
  ])(
    "resets mobile topbar title to app default after navigating to %s",
    async (destinationLinkLabel, destinationPageLabel) => {
      for (const width of MOBILE_VIEWPORT_WIDTHS) {
        const user = userEvent.setup();
        setViewportWidth(width);
        const { unmount } = renderAppLayout("/projects/p1/context-title");

        await waitFor(() => {
          expect(
            document.querySelector(".app-mobile-topbar-title")?.textContent,
          ).toBe("Проект Альфа");
        });

        await user.click(screen.getByText(destinationLinkLabel));

        await waitFor(() => {
          expect(screen.getByText(destinationPageLabel)).toBeInTheDocument();
          expect(
            document.querySelector(".app-mobile-topbar-title")?.textContent,
          ).toBe("Scientiaiter");
        });

        unmount();
      }
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "keeps project title when navigating between project-scoped non-fixed routes at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/projects/p1/context-title");

      await waitFor(() => {
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
      });

      await user.click(screen.getByText("Go project documents"));

      await waitFor(() => {
        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
        expect(
          document.querySelector(".sidebar-project-name")?.textContent,
        ).toBe("Проект Альфа");
      });
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "preserves project title across graph tab round-trip at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/projects/p1/context-title");

      await waitFor(() => {
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
      });

      await user.click(screen.getByText("Go project graph"));

      await waitFor(() => {
        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(document.querySelector(".app-mobile-topbar")).toBeNull();
        expect(document.querySelector(".app-layout-fixed")).not.toBeNull();
      });

      await user.click(screen.getByText("Go documents tab"));

      await waitFor(() => {
        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(document.querySelector(".app-mobile-topbar")).not.toBeNull();
        expect(document.querySelector(".app-layout-fixed")).toBeNull();
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
        expect(
          document.querySelector(".sidebar-project-name")?.textContent,
        ).toBe("Проект Альфа");
      });
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "resets project title when switching to a different project at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/projects/p1/context-title");

      await waitFor(() => {
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
      });

      await user.click(screen.getByText("Go another project"));

      await waitFor(() => {
        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Scientiaiter");
        expect(screen.getByTestId("project-context-name")).toHaveTextContent(
          "null",
        );
        expect(
          screen.getByTestId("project-context-selected-count"),
        ).toHaveTextContent("0");
        expect(screen.getByTestId("project-context-status")).toHaveTextContent(
          "candidate",
        );
        expect(document.querySelector(".sidebar-project-name")).toBeNull();
      });
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "updates title when switching to another project route with context metadata at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/projects/p1/context-title");

      await waitFor(() => {
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
      });

      await user.click(screen.getByText("Go project beta context"));

      await waitFor(() => {
        expect(
          screen.getByText("Project context title page beta"),
        ).toBeInTheDocument();
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Бета");
      });

      await user.click(screen.getByText("Go project two documents"));

      await waitFor(() => {
        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Бета");
        expect(screen.getByTestId("project-context-name")).toHaveTextContent(
          "Проект Бета",
        );
        expect(
          screen.getByTestId("project-context-selected-count"),
        ).toHaveTextContent("3");
        expect(screen.getByTestId("project-context-status")).toHaveTextContent(
          "candidate",
        );
        expect(
          document.querySelector(".sidebar-project-name")?.textContent,
        ).toBe("Проект Бета");
      });
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "does not leak second-project context when returning to first project at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/projects/p1/context-title");

      await waitFor(() => {
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Альфа");
      });

      await user.click(screen.getByText("Go project beta context"));

      await waitFor(() => {
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Проект Бета");
      });

      await user.click(screen.getByText("Go back to project one"));

      await waitFor(() => {
        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(
          document.querySelector(".app-mobile-topbar-title")?.textContent,
        ).toBe("Scientiaiter");
        expect(screen.getByTestId("project-context-name")).toHaveTextContent(
          "null",
        );
        expect(
          screen.getByTestId("project-context-selected-count"),
        ).toHaveTextContent("0");
        expect(screen.getByTestId("project-context-status")).toHaveTextContent(
          "candidate",
        );
        expect(document.querySelector(".sidebar-project-name")).toBeNull();
      });
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "shows mobile navigation trigger on app shell routes at %ipx",
    (width) => {
      setViewportWidth(width);
      renderAppLayout("/docs");

      expect(screen.getByText("Docs page")).toBeInTheDocument();
      const toggleButton = screen.getByRole("button", {
        name: "Открыть навигацию",
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute(
        "aria-controls",
        "app-primary-sidebar",
      );
      expect(toggleButton).toBeEnabled();
      expect(document.getElementById("app-primary-sidebar")).not.toBeNull();
    },
  );

  it.each(MOBILE_VIEWPORT_WIDTHS)(
    "toggles mobile sidebar open and closed via same topbar button at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/projects");

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

  it.each([1024, 1280, 1440, 1920])(
    "keeps mobile sidebar closed on desktop widths at %ipx",
    async (width) => {
      const user = userEvent.setup();
      setViewportWidth(width);
      renderAppLayout("/settings");

      expect(screen.getByText("Settings page")).toBeInTheDocument();

      const toggleButton = screen.getByRole("button", {
        name: "Открыть навигацию",
      });
      expect(toggleButton).toHaveAttribute(
        "aria-controls",
        "app-primary-sidebar",
      );
      expect(toggleButton).toBeDisabled();

      await user.click(toggleButton);

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

    for (const width of TARGET_VIEWPORT_WIDTHS) {
      const shouldOpen = width <= 768;
      setViewportWidth(width);
      const { unmount } = renderAppLayout(route);

      expect(screen.getByText(pageLabel)).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        false,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(false);
      const toggleButton = screen.getByRole("button", {
        name: "Открыть навигацию",
      });
      expect(toggleButton).toHaveAttribute(
        "aria-controls",
        "app-primary-sidebar",
      );
      if (shouldOpen) {
        expect(toggleButton).toBeEnabled();
      } else {
        expect(toggleButton).toBeDisabled();
      }
      await user.click(toggleButton);

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
        const overlayButton = screen.queryByRole("button", {
          name: "Закрыть меню навигации",
        });
        if (shouldOpen) {
          expect(overlayButton).toBeInTheDocument();
          expect(overlayButton).toHaveAttribute(
            "aria-controls",
            "app-primary-sidebar",
          );
        } else {
          expect(overlayButton).not.toBeInTheDocument();
        }
      });

      unmount();
      document.body.classList.remove("sidebar-modal-open");
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        false,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(false);
    }
  });

  it.each([
    ["/projects/p1/documents/d1", "Document editor page", true],
    ["/projects/p1?tab=graph", "Project details page", true],
  ])(
    "opens fixed-layout drawer only on mobile widths for %s",
    async (route, pageLabel, shouldLockLayout) => {
      const user = userEvent.setup();

      for (const width of TARGET_VIEWPORT_WIDTHS) {
        const shouldOpen = width <= 768;
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(shouldLockLayout);
        expect(document.body.classList.contains("layout-fixed")).toBe(
          shouldLockLayout,
        );
        const toggleButton = screen.getByRole("button", {
          name: "Открыть навигацию",
        });
        expect(toggleButton).toHaveAttribute(
          "aria-controls",
          "app-primary-sidebar",
        );
        if (shouldOpen) {
          expect(toggleButton).toBeEnabled();
        } else {
          expect(toggleButton).toBeDisabled();
        }
        await user.click(toggleButton);

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
          const overlayButton = screen.queryByRole("button", {
            name: "Закрыть меню навигации",
          });
          if (shouldOpen) {
            expect(overlayButton).toBeInTheDocument();
            expect(overlayButton).toHaveAttribute(
              "aria-controls",
              "app-primary-sidebar",
            );
          } else {
            expect(overlayButton).not.toBeInTheDocument();
          }
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

  it.each([
    ["/projects", "Projects page"],
    ["/settings", "Settings page"],
    ["/docs", "Docs page"],
  ])(
    "uses topbar nav toggle (without FAB) on non-fixed route %s across width matrix",
    (route, pageLabel) => {
      for (const width of TARGET_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(document.querySelector(".app-mobile-topbar")).not.toBeNull();
        expect(document.querySelector(".app-mobile-nav-toggle")).not.toBeNull();
        expect(document.querySelector(".app-mobile-fab-toggle")).toBeNull();
        expect(document.querySelector(".app-main-fixed")).toBeNull();

        unmount();
      }
    },
  );

  it.each([
    ["/projects/p1/documents/d1", "Document editor page"],
    ["/projects/p1?tab=graph", "Project details page"],
  ])(
    "uses fixed-route FAB toggle (without topbar nav) on %s across width matrix",
    (route, pageLabel) => {
      for (const width of TARGET_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(document.querySelector(".app-mobile-topbar")).toBeNull();
        expect(document.querySelector(".app-mobile-nav-toggle")).toBeNull();
        expect(document.querySelector(".app-mobile-fab-toggle")).not.toBeNull();
        expect(document.querySelector(".app-main-fixed")).not.toBeNull();

        unmount();
      }
    },
  );

  it.each([
    ["/projects/p1/documents/d1", "Document editor page"],
    ["/projects/p1?tab=graph", "Project details page"],
  ])(
    "hides app shell for unauthenticated fixed-layout route %s across width matrix",
    (route, pageLabel) => {
      mockAuthState.token = null;
      mockAuthState.user = null;

      for (const width of TARGET_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Открыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть меню навигации" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
        expect(document.querySelector(".animated-bg")).toBeNull();
        expect(document.querySelector(".app-layout-fixed")).toBeNull();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);

        unmount();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
      }
    },
  );

  it.each(PROJECT_TABS)(
    "hides app shell for unauthenticated /projects/:id?tab=%s across width matrix",
    (tab) => {
      mockAuthState.token = null;
      mockAuthState.user = null;

      for (const width of TARGET_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(`/projects/p1?tab=${tab}`);

        expect(screen.getByText("Project details page")).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Открыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть меню навигации" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
        expect(document.querySelector(".animated-bg")).toBeNull();
        expect(document.querySelector(".app-layout-fixed")).toBeNull();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);

        unmount();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
      }
    },
  );

  it.each(PROJECT_TAB_CASES)(
    "renders /projects/:id?tab=$tab shell behavior correctly on mobile",
    ({ tab, shouldLockLayout }) => {
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
      if (shouldLockLayout) {
        expect(document.querySelector(".app-mobile-topbar")).toBeNull();
        expect(document.querySelector(".app-mobile-fab-toggle")).not.toBeNull();
        expect(document.querySelector(".app-layout-fixed")).not.toBeNull();
        expect(document.querySelector(".animated-bg")).toBeNull();
      } else {
        expect(document.querySelector(".app-mobile-topbar")).not.toBeNull();
        expect(document.querySelector(".app-mobile-fab-toggle")).toBeNull();
        expect(document.querySelector(".app-layout-fixed")).toBeNull();
        expect(document.querySelector(".animated-bg")).not.toBeNull();
      }
    },
  );

  it.each(PROJECT_TABS)(
    "keeps /projects/:id?tab=%s route usable across all target widths",
    async (tab) => {
      const user = userEvent.setup();

      for (const width of TARGET_VIEWPORT_WIDTHS) {
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
        if (shouldLockLayout) {
          expect(document.querySelector(".app-mobile-topbar")).toBeNull();
          expect(
            document.querySelector(".app-mobile-fab-toggle"),
          ).not.toBeNull();
          expect(document.querySelector(".app-layout-fixed")).not.toBeNull();
          expect(document.querySelector(".animated-bg")).toBeNull();
        } else {
          expect(document.querySelector(".app-mobile-topbar")).not.toBeNull();
          expect(document.querySelector(".app-mobile-fab-toggle")).toBeNull();
          expect(document.querySelector(".app-layout-fixed")).toBeNull();
          expect(document.querySelector(".animated-bg")).not.toBeNull();
        }

        const toggleButton = screen.getByRole("button", {
          name: "Открыть навигацию",
        });
        expect(toggleButton).toHaveAttribute(
          "aria-controls",
          "app-primary-sidebar",
        );
        if (shouldOpen) {
          expect(toggleButton).toBeEnabled();
        } else {
          expect(toggleButton).toBeDisabled();
        }

        await user.click(toggleButton);

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
          const overlayButton = screen.queryByRole("button", {
            name: "Закрыть меню навигации",
          });
          if (shouldOpen) {
            expect(overlayButton).toBeInTheDocument();
            expect(overlayButton).toHaveAttribute(
              "aria-controls",
              "app-primary-sidebar",
            );
          } else {
            expect(overlayButton).not.toBeInTheDocument();
          }
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

  it("closes mobile sidebar when project tab query changes", async () => {
    const user = userEvent.setup();
    renderAppLayout("/projects/p1?tab=articles");

    await user.click(screen.getByLabelText("Открыть навигацию"));
    expect(document.body.classList.contains("sidebar-modal-open")).toBe(true);

    await user.click(screen.getByText("Go documents tab"));

    await waitFor(() => {
      expect(screen.getByText("Project details page")).toBeInTheDocument();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
    });
  });

  it("switches shell mode when project tab query changes from graph to non-graph", async () => {
    const user = userEvent.setup();
    renderAppLayout("/projects/p1?tab=graph");

    expect(document.documentElement.classList.contains("layout-fixed")).toBe(
      true,
    );
    expect(document.body.classList.contains("layout-fixed")).toBe(true);
    expect(document.querySelector(".app-layout-fixed")).not.toBeNull();
    expect(document.querySelector(".app-mobile-topbar")).toBeNull();
    expect(document.querySelector(".app-mobile-fab-toggle")).not.toBeNull();
    expect(document.querySelector(".animated-bg")).toBeNull();

    await user.click(screen.getByText("Go documents tab"));

    await waitFor(() => {
      expect(screen.getByText("Project details page")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        false,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(false);
      expect(document.querySelector(".app-layout-fixed")).toBeNull();
      expect(document.querySelector(".app-mobile-topbar")).not.toBeNull();
      expect(document.querySelector(".app-mobile-fab-toggle")).toBeNull();
      expect(document.querySelector(".animated-bg")).not.toBeNull();
      expect(document.body.classList.contains("sidebar-modal-open")).toBe(
        false,
      );
    });
  });

  it("switches shell mode when project tab query changes from non-graph to graph", async () => {
    const user = userEvent.setup();
    renderAppLayout("/projects/p1?tab=articles");

    expect(document.documentElement.classList.contains("layout-fixed")).toBe(
      false,
    );
    expect(document.body.classList.contains("layout-fixed")).toBe(false);
    expect(document.querySelector(".app-layout-fixed")).toBeNull();
    expect(document.querySelector(".app-mobile-topbar")).not.toBeNull();
    expect(document.querySelector(".app-mobile-fab-toggle")).toBeNull();
    expect(document.querySelector(".animated-bg")).not.toBeNull();

    await user.click(screen.getByText("Go graph tab"));

    await waitFor(() => {
      expect(screen.getByText("Project details page")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("layout-fixed")).toBe(
        true,
      );
      expect(document.body.classList.contains("layout-fixed")).toBe(true);
      expect(document.querySelector(".app-layout-fixed")).not.toBeNull();
      expect(document.querySelector(".app-mobile-topbar")).toBeNull();
      expect(document.querySelector(".app-mobile-fab-toggle")).not.toBeNull();
      expect(document.querySelector(".animated-bg")).toBeNull();
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
      for (const width of TARGET_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
        expect(
          screen.queryByRole("button", { name: "Открыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
        expect(document.querySelector(".animated-bg")).toBeNull();

        unmount();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
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
      for (const width of TARGET_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
        expect(
          screen.queryByRole("button", { name: "Открыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
        expect(document.querySelector(".animated-bg")).toBeNull();

        unmount();
        expect(
          document.documentElement.classList.contains("layout-fixed"),
        ).toBe(false);
        expect(document.body.classList.contains("layout-fixed")).toBe(false);
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

  it.each([
    ["/projects", "Projects page"],
    ["/settings", "Settings page"],
    ["/docs", "Docs page"],
  ])(
    "hides app shell for unauthenticated users on %s across width matrix",
    (route, pageLabel) => {
      mockAuthState.token = null;
      mockAuthState.user = null;

      for (const width of TARGET_VIEWPORT_WIDTHS) {
        setViewportWidth(width);
        const { unmount } = renderAppLayout(route);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Открыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть навигацию" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Закрыть меню навигации" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Scientiaiter")).not.toBeInTheDocument();
        expect(document.querySelector(".animated-bg")).toBeNull();

        unmount();
      }
    },
  );

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
    const toggleButton = screen.getByRole("button", {
      name: "Открыть навигацию",
    });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute(
      "aria-controls",
      "app-primary-sidebar",
    );
    expect(document.querySelector(".app-mobile-topbar")).toBeNull();

    unmount();
    expect(document.documentElement.classList.contains("layout-fixed")).toBe(
      false,
    );
    expect(document.body.classList.contains("layout-fixed")).toBe(false);
  });

  it("keeps document editor route in fixed layout on all target widths", () => {
    for (const width of TARGET_VIEWPORT_WIDTHS) {
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
    for (const width of TARGET_VIEWPORT_WIDTHS) {
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
