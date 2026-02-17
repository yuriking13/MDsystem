import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const sidebarSource = readFileSync(
  resolve(process.cwd(), "src/components/AppSidebar.tsx"),
  "utf8",
);
const docsSource = readFileSync(
  resolve(process.cwd(), "src/pages/DocumentationPage.tsx"),
  "utf8",
);

describe("manual smoke checklist contract", () => {
  it("keeps auth and core app routes from smoke checklist", () => {
    expect(appSource).toMatch(
      /<Route path="\/login" element={<LoginPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/register" element={<RegisterPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/projects" element={<ProjectsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/settings" element={<SettingsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/docs" element={<DocumentationPage \/>} \/>/,
    );
  });

  it("keeps project detail + document editor routes for project smoke flow", () => {
    expect(appSource).toMatch(
      /<Route path="\/projects\/:id" element={<ProjectDetailPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route[\s\S]*?path="\/projects\/:projectId\/documents\/:docId"[\s\S]*?element={<DocumentPage \/>}[\s\S]*?\/>/,
    );
  });

  it("keeps default route redirect logic for unauthenticated and authenticated users", () => {
    expect(appSource).toMatch(
      /<Route[\s\S]*?path="\/"[\s\S]*?element={<Navigate to=\{token \? "\/projects" : "\/login"\} replace \/>}[\s\S]*?\/>/,
    );
  });

  it("keeps project tab menu entries required by smoke checklist", () => {
    const tabExpectations: Array<{ id: string; label: string; tab: string }> = [
      { id: "articles", label: "База статей", tab: "articles" },
      { id: "documents", label: "Документы", tab: "documents" },
      { id: "files", label: "Файлы", tab: "files" },
      { id: "statistics", label: "Статистика", tab: "statistics" },
      { id: "graph", label: "Граф цитирований", tab: "graph" },
      { id: "settings", label: "Настройки проекта", tab: "settings" },
    ];

    for (const { id, label, tab } of tabExpectations) {
      expect(sidebarSource).toContain(`id: "${id}"`);
      expect(sidebarSource).toContain(`label: "${label}"`);
      expect(sidebarSource).toContain(`tab: "${tab}"`);
    }
  });

  it("keeps main sidebar navigation entries for projects and docs", () => {
    expect(sidebarSource).toContain('id: "projects"');
    expect(sidebarSource).toContain('label: "Проекты"');
    expect(sidebarSource).toContain('path: "/projects"');
    expect(sidebarSource).toContain('id: "docs"');
    expect(sidebarSource).toContain('label: "Документация"');
    expect(sidebarSource).toContain('path: "/docs"');
  });

  it("keeps profile settings and back-to-project controls in sidebar shell", () => {
    expect(sidebarSource).toContain('title="Перейти в настройки"');
    expect(sidebarSource).toContain('navigate("/settings")');
    expect(sidebarSource).toContain('title="Назад к проектам"');
    expect(sidebarSource).toContain("<span>К проектам</span>");
    expect(sidebarSource).toContain('navigate("/projects")');
  });

  it("keeps article status submenu entries available for smoke traversal", () => {
    const statusExpectations: Array<{ id: string; label: string }> = [
      { id: "candidate", label: "Кандидаты" },
      { id: "selected", label: "Отобранные" },
      { id: "excluded", label: "Исключённые" },
      { id: "all", label: "Все" },
      { id: "deleted", label: "Корзина" },
    ];

    for (const { id, label } of statusExpectations) {
      expect(sidebarSource).toContain(`id: "${id}"`);
      expect(sidebarSource).toContain(`label: "${label}"`);
    }
  });

  it("keeps no-transition theme toggle safety in sidebar switcher", () => {
    expect(sidebarSource).toMatch(
      /document\.documentElement\.classList\.add\("no-transitions"\);/,
    );
    expect(sidebarSource).toMatch(
      /requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?document\.documentElement\.classList\.remove\("no-transitions"\);/,
    );
  });

  it("keeps sidebar light/dark theme toggle controls for smoke switching", () => {
    expect(sidebarSource).toContain('name="theme-toggle"');
    expect(sidebarSource).toContain('value="light"');
    expect(sidebarSource).toContain('value="dark"');
    expect(sidebarSource).toContain('localStorage.setItem("theme", "light")');
    expect(sidebarSource).toContain('localStorage.setItem("theme", "dark")');
  });

  it("keeps sidebar action buttons explicitly non-submit", () => {
    expect(sidebarSource).toMatch(
      /className="sidebar-collapse-toggle"[\s\S]*?type="button"/,
    );
    expect(sidebarSource).toMatch(
      /className="sidebar-back-btn"[\s\S]*?type="button"/,
    );
    expect(sidebarSource).toMatch(
      /className=\{cn\([\s\S]*?"sidebar-nav-item"[\s\S]*?type="button"/,
    );
    expect(sidebarSource).toMatch(
      /className=\{cn\([\s\S]*?"sidebar-submenu-item"[\s\S]*?type="button"/,
    );
    expect(sidebarSource).toMatch(
      /className="sidebar-footer-btn sidebar-logout-btn"[\s\S]*?type="button"/,
    );
  });

  it("keeps documentation page menu + submenu interaction shell", () => {
    expect(docsSource).toContain("const DOC_SECTIONS");
    expect(docsSource).toContain('className="docs-subnav"');
    expect(docsSource).toContain('role="tablist"');
    expect(docsSource).toContain('role="tab"');
    expect(docsSource).toContain('role="tabpanel"');
  });

  it("keeps docs header back-navigation action to projects", () => {
    expect(docsSource).toContain(
      '<Link to="/projects" className="btn secondary">',
    );
    expect(docsSource).toContain("← К проектам");
  });
});
