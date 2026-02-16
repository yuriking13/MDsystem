import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appLayoutCss = readFileSync(
  resolve(process.cwd(), "src/styles/app-layout.css"),
  "utf8",
);
const adminCss = readFileSync(
  resolve(process.cwd(), "src/styles/admin.css"),
  "utf8",
);

describe("responsive shell css regressions", () => {
  it("keeps fixed layout containers guarded with 100vh and 100dvh pairs", () => {
    expect(appLayoutCss).toMatch(
      /html\.layout-fixed,\s*html\.layout-fixed body\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100vh;[\s\S]*?max-height:\s*100dvh;/,
    );
    expect(appLayoutCss).toMatch(
      /\.app-layout-fixed\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100vh;[\s\S]*?max-height:\s*100dvh;/,
    );
  });

  it("keeps mobile app sidebar safe-area padding on all sides", () => {
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-sidebar\s*\{[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\);[\s\S]*?padding-left:\s*env\(safe-area-inset-left,\s*0px\);[\s\S]*?padding-right:\s*env\(safe-area-inset-right,\s*0px\);[\s\S]*?padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/,
    );
  });

  it("keeps admin sidebar viewport-height fallback and safe-area support", () => {
    expect(adminCss).toMatch(
      /\.admin-sidebar\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\);[\s\S]*?padding-left:\s*env\(safe-area-inset-left,\s*0px\);[\s\S]*?padding-right:\s*env\(safe-area-inset-right,\s*0px\);/,
    );
  });

  it("keeps admin mobile main/topbar safe-area-aware paddings", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-main,[\s\S]*?padding:\s*16px calc\(16px \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(16px \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(16px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-mobile-topbar\s*\{[\s\S]*?padding:\s*calc\(10px \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(16px \+ env\(safe-area-inset-right,\s*0px\)\)\s*10px\s*calc\(16px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });
});
