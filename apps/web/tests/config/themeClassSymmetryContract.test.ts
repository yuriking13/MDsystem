import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const sidebarSource = readFileSync(
  resolve(process.cwd(), "src/components/AppSidebar.tsx"),
  "utf8",
);

describe("theme class symmetry contract", () => {
  it("keeps App bootstrap light/dark branches symmetric across root and body", () => {
    expect(appSource).toMatch(
      /if\s*\(savedTheme === "light"\)\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "light"\);[\s\S]*?document\.documentElement\.classList\.add\("light-theme"\);[\s\S]*?document\.documentElement\.classList\.remove\("dark"\);[\s\S]*?document\.body\.classList\.add\("light-theme"\);[\s\S]*?document\.body\.classList\.remove\("dark"\);/,
    );

    expect(appSource).toMatch(
      /else\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "dark"\);[\s\S]*?document\.documentElement\.classList\.add\("dark"\);[\s\S]*?document\.documentElement\.classList\.remove\("light-theme"\);[\s\S]*?document\.body\.classList\.add\("dark"\);[\s\S]*?document\.body\.classList\.remove\("light-theme"\);/,
    );
  });

  it("keeps sidebar toggleTheme branch symmetry for instant theme switching", () => {
    expect(sidebarSource).toMatch(
      /if\s*\(newIsDark\)\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "dark"\);[\s\S]*?document\.documentElement\.classList\.add\("dark"\);[\s\S]*?document\.documentElement\.classList\.remove\("light-theme"\);[\s\S]*?document\.body\.classList\.add\("dark"\);[\s\S]*?document\.body\.classList\.remove\("light-theme"\);[\s\S]*?localStorage\.setItem\("theme", "dark"\);/,
    );

    expect(sidebarSource).toMatch(
      /else\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "light"\);[\s\S]*?document\.documentElement\.classList\.remove\("dark"\);[\s\S]*?document\.documentElement\.classList\.add\("light-theme"\);[\s\S]*?document\.body\.classList\.remove\("dark"\);[\s\S]*?document\.body\.classList\.add\("light-theme"\);[\s\S]*?localStorage\.setItem\("theme", "light"\);/,
    );
  });

  it("keeps sidebar mount sync cleaning stale opposite classes", () => {
    expect(sidebarSource).toMatch(
      /const shouldBeDark = theme !== "light";[\s\S]*?setIsDark\(shouldBeDark\);/,
    );

    expect(sidebarSource).toMatch(
      /if\s*\(shouldBeDark\)\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "dark"\);[\s\S]*?document\.documentElement\.classList\.add\("dark"\);[\s\S]*?document\.documentElement\.classList\.remove\("light-theme"\);[\s\S]*?document\.body\.classList\.add\("dark"\);[\s\S]*?document\.body\.classList\.remove\("light-theme"\);/,
    );

    expect(sidebarSource).toMatch(
      /else\s*\{[\s\S]*?document\.documentElement\.setAttribute\("data-theme", "light"\);[\s\S]*?document\.documentElement\.classList\.add\("light-theme"\);[\s\S]*?document\.documentElement\.classList\.remove\("dark"\);[\s\S]*?document\.body\.classList\.add\("light-theme"\);[\s\S]*?document\.body\.classList\.remove\("dark"\);/,
    );
  });

  it("keeps transition guard lifecycle in sidebar theme switcher", () => {
    expect(sidebarSource).toMatch(
      /document\.documentElement\.classList\.add\("no-transitions"\);/,
    );
    expect(sidebarSource).toMatch(
      /requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?document\.documentElement\.classList\.remove\("no-transitions"\);/,
    );
  });
});
