import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

describe("app route coverage contract", () => {
  it("keeps authenticated app routes for core product flows", () => {
    expect(appSource).toMatch(
      /<Route path="\/projects" element={<ProjectsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/projects\/:id" element={<ProjectDetailPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route[\s\S]*?path="\/projects\/:projectId\/documents\/:docId"[\s\S]*?element={<DocumentPage \/>}[\s\S]*?\/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/settings" element={<SettingsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/docs" element={<DocumentationPage \/>} \/>/,
    );
  });

  it("keeps admin route matrix including parameterized pages", () => {
    expect(appSource).toMatch(
      /<Route path="\/admin\/login" element={<AdminLoginPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="users" element={<AdminUsersPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="users\/:userId" element={<AdminUsersPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="projects" element={<AdminProjectsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route[\s\S]*?path="projects\/:projectId"[\s\S]*?element={<AdminProjectsPage \/>}[\s\S]*?\/>/,
    );
    expect(appSource).toMatch(
      /<Route path="settings" element={<AdminSettingsPage \/>} \/>/,
    );
  });

  it("keeps wildcard fallback route to root redirect", () => {
    expect(appSource).toMatch(
      /<Route path="\*" element={<Navigate to="\/" replace \/>} \/>/,
    );
  });
});
