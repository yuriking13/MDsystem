import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

describe("app route coverage contract", () => {
  it("keeps auth and admin guard wrappers around protected route trees", () => {
    expect(appSource).toMatch(
      /<Route[\s\S]*?element=\{[\s\S]*?<RequireAuth>[\s\S]*?<AppLayout \/>[\s\S]*?<\/RequireAuth>[\s\S]*?\}[\s\S]*?>/,
    );
    expect(appSource).toMatch(
      /<Route[\s\S]*?path="\/admin"[\s\S]*?element=\{[\s\S]*?<RequireAdmin>[\s\S]*?<AdminLayout \/>[\s\S]*?<\/RequireAdmin>[\s\S]*?\}[\s\S]*?>/,
    );
  });

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
    expect(appSource).toMatch(/<Route index element={<AdminDashboard \/>} \/>/);
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
    expect(appSource).toMatch(
      /<Route path="articles" element={<AdminArticlesPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="activity" element={<AdminActivityPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="sessions" element={<AdminSessionsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="jobs" element={<AdminJobsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="errors" element={<AdminErrorsPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="audit" element={<AdminAuditPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="system" element={<AdminSystemPage \/>} \/>/,
    );
  });

  it("keeps wildcard fallback route to root redirect", () => {
    expect(appSource).toMatch(
      /<Route path="\*" element={<Navigate to="\/" replace \/>} \/>/,
    );
  });

  it("keeps root redirect dependent on auth token", () => {
    expect(appSource).toMatch(
      /<Route[\s\S]*?path="\/"[\s\S]*?element={<Navigate to=\{token \? "\/projects" : "\/login"\} replace \/>}[\s\S]*?\/>/,
    );
  });

  it("keeps public marketing pages routed without auth", () => {
    expect(appSource).toMatch(
      /<Route path="\/landing" element={<LandingPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/offer" element={<PublicOfferPage \/>} \/>/,
    );
    expect(appSource).toMatch(
      /<Route path="\/project-faces" element={<ProjectFacesPage \/>} \/>/,
    );
  });
});
