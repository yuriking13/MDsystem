import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

describe("App theme bootstrap contract", () => {
  it("keeps localStorage theme lookup during app mount", () => {
    expect(appSource).toMatch(
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?const savedTheme = localStorage\.getItem\("theme"\);/,
    );
  });

  it("keeps explicit light-theme branch applying document and body classes", () => {
    expect(appSource).toMatch(
      /if\s*\(savedTheme === "light"\)\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "light"\);[\s\S]*?document\.body\.classList\.add\("light-theme"\);[\s\S]*?document\.body\.classList\.remove\("dark"\);/,
    );
  });

  it("keeps dark-theme fallback branch applying document and body classes", () => {
    expect(appSource).toMatch(
      /else\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "dark"\);[\s\S]*?document\.body\.classList\.add\("dark"\);[\s\S]*?document\.body\.classList\.remove\("light-theme"\);/,
    );
  });

  it("keeps docs route mounted inside authenticated app layout", () => {
    expect(appSource).toMatch(
      /<Route path="\/docs" element={<DocumentationPage \/>} \/>/,
    );
  });
});
