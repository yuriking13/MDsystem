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

  it("keeps mobile app topbar and fixed-route FAB safe-area offsets", () => {
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-mobile-topbar\s*\{[\s\S]*?padding:\s*calc\(10px \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(16px \+ env\(safe-area-inset-right,\s*0px\)\)\s*10px\s*calc\(16px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-mobile-fab-toggle\s*\{[\s\S]*?left:\s*calc\(12px \+ env\(safe-area-inset-left,\s*0px\)\);[\s\S]*?top:\s*calc\(12px \+ env\(safe-area-inset-top,\s*0px\)\);/,
    );
  });

  it("keeps disabled styling for mobile-only nav toggles", () => {
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-mobile-fab-toggle:disabled\s*\{[\s\S]*?cursor:\s*not-allowed;[\s\S]*?opacity:\s*0\.55;[\s\S]*?pointer-events:\s*none;/,
    );
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-mobile-nav-toggle:disabled\s*\{[\s\S]*?cursor:\s*not-allowed;[\s\S]*?opacity:\s*0\.55;[\s\S]*?pointer-events:\s*none;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-mobile-nav-toggle:disabled\s*\{[\s\S]*?cursor:\s*not-allowed;[\s\S]*?opacity:\s*0\.55;[\s\S]*?pointer-events:\s*none;/,
    );
  });

  it("keeps admin sidebar viewport-height fallback and safe-area support", () => {
    expect(adminCss).toMatch(
      /\.admin-sidebar\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\);[\s\S]*?padding-left:\s*env\(safe-area-inset-left,\s*0px\);[\s\S]*?padding-right:\s*env\(safe-area-inset-right,\s*0px\);/,
    );
  });

  it("keeps admin auth/loading shell with 100dvh and safe-area padding", () => {
    expect(adminCss).toMatch(
      /\.admin-loading\s*\{[\s\S]*?min-height:\s*100vh;[\s\S]*?min-height:\s*100dvh;/,
    );
    expect(adminCss).toMatch(
      /\.admin-login-page\s*\{[\s\S]*?min-height:\s*100vh;[\s\S]*?min-height:\s*100dvh;[\s\S]*?padding:\s*calc\(20px \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(20px \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(20px \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(20px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });

  it("keeps admin login layout stacked on narrow screens", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*800px\)\s*\{[\s\S]*?\.admin-login-container\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*800px\)\s*\{[\s\S]*?\.admin-login-info\s*\{[\s\S]*?display:\s*none;/,
    );
  });

  it("keeps admin modal overlay safe-area and modal height fallback", () => {
    expect(adminCss).toMatch(
      /\.admin-modal-overlay\s*\{[\s\S]*?padding:\s*calc\(1rem \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(adminCss).toMatch(
      /\.admin-modal\s*\{[\s\S]*?max-height:\s*90vh;[\s\S]*?max-height:\s*90dvh;/,
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
