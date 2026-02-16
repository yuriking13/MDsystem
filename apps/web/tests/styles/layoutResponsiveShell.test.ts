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
  it("keeps app shell overlays and mobile controls hidden by default", () => {
    expect(appLayoutCss).toMatch(
      /\.app-mobile-topbar\s*\{\s*display:\s*none;\s*\}/,
    );
    expect(appLayoutCss).toMatch(
      /\.app-mobile-fab-toggle\s*\{\s*display:\s*none;\s*\}/,
    );
    expect(appLayoutCss).toMatch(
      /\.app-sidebar-overlay\s*\{\s*display:\s*none;\s*\}/,
    );
    expect(appLayoutCss).toMatch(
      /body\.sidebar-modal-open\s*\{\s*overflow:\s*hidden;\s*\}/,
    );
  });

  it("keeps fixed layout containers guarded with 100vh and 100dvh pairs", () => {
    expect(appLayoutCss).toMatch(
      /html\.layout-fixed,\s*html\.layout-fixed body\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100vh;[\s\S]*?max-height:\s*100dvh;/,
    );
    expect(appLayoutCss).toMatch(
      /html\.layout-fixed #root\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100vh;[\s\S]*?max-height:\s*100dvh;/,
    );
    expect(appLayoutCss).toMatch(
      /\.app-layout-fixed\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100vh;[\s\S]*?max-height:\s*100dvh;/,
    );
    expect(appLayoutCss).toMatch(
      /\.app-main-fixed\s*\{[\s\S]*?max-height:\s*100vh;[\s\S]*?max-height:\s*100dvh;/,
    );
  });

  it("keeps app main shell viewport-height fallback for non-fixed pages", () => {
    expect(appLayoutCss).toMatch(
      /\.app-main\s*\{[\s\S]*?min-height:\s*100vh;[\s\S]*?min-height:\s*100dvh;/,
    );
  });

  it("keeps mobile app sidebar safe-area padding on all sides", () => {
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-sidebar\s*\{[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\);[\s\S]*?padding-left:\s*env\(safe-area-inset-left,\s*0px\);[\s\S]*?padding-right:\s*env\(safe-area-inset-right,\s*0px\);[\s\S]*?padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/,
    );
  });

  it("keeps mobile app sidebar width constrained and consistent when collapsed", () => {
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-sidebar\s*\{[\s\S]*?width:\s*min\(240px,\s*88vw\);/,
    );
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-sidebar--collapsed\s*\{[\s\S]*?width:\s*min\(240px,\s*88vw\);/,
    );
  });

  it("keeps drawer footers safe-area padded on mobile app/admin shells", () => {
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.sidebar-footer\s*\{[\s\S]*?padding-bottom:\s*calc\(12px \+ env\(safe-area-inset-bottom,\s*0px\)\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar\s*\{[\s\S]*?padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar-footer\s*\{[\s\S]*?padding-bottom:\s*calc\(16px \+ env\(safe-area-inset-bottom,\s*0px\)\);/,
    );
  });

  it("keeps fixed-route shell topbar hidden and overlay fullscreen on mobile", () => {
    expect(appLayoutCss).toMatch(
      /\.app-main-fixed \.app-mobile-topbar\s*\{[\s\S]*?display:\s*none !important;/,
    );
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-sidebar-overlay\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*40;[\s\S]*?display:\s*block;/,
    );
  });

  it("keeps compact mobile topbar and nav controls sizing at 480px", () => {
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.app-mobile-topbar\s*\{[\s\S]*?min-height:\s*50px;[\s\S]*?gap:\s*8px;[\s\S]*?padding-left:\s*calc\(12px \+ env\(safe-area-inset-left,\s*0px\)\);[\s\S]*?padding-right:\s*calc\(12px \+ env\(safe-area-inset-right,\s*0px\)\);/,
    );
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.app-mobile-topbar-title\s*\{[\s\S]*?font-size:\s*13px;/,
    );
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.app-mobile-nav-toggle,\s*\.app-mobile-fab-toggle\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/,
    );
    expect(appLayoutCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.app-mobile-nav-toggle svg,\s*\.app-mobile-fab-toggle svg\s*\{[\s\S]*?width:\s*16px;[\s\S]*?height:\s*16px;/,
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

  it("keeps admin shell mobile controls hidden by default and layout viewport-safe", () => {
    expect(adminCss).toMatch(
      /\.admin-layout\s*\{[\s\S]*?min-height:\s*100vh;[\s\S]*?min-height:\s*100dvh;/,
    );
    expect(adminCss).toMatch(
      /\.admin-mobile-topbar,\s*\.admin-sidebar-overlay\s*\{\s*display:\s*none;\s*\}/,
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

  it("keeps admin mobile sidebar width/transform behavior and overlay layering at 900px", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar\s*\{[\s\S]*?width:\s*min\(280px,\s*88vw\);[\s\S]*?transform:\s*translateX\(-100%\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar\.mobile-open\s*\{[\s\S]*?transform:\s*translateX\(0\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar\.collapsed\s*\{[\s\S]*?width:\s*min\(280px,\s*88vw\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar\.collapsed \.admin-logo span\s*\{[\s\S]*?display:\s*inline;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar-overlay\s*\{[\s\S]*?display:\s*block;[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*90;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar\s*\{[\s\S]*?z-index:\s*100;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-sidebar-toggle\s*\{[\s\S]*?display:\s*none;/,
    );
  });

  it("keeps admin compact main/topbar spacing safe-area aware at 640px", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-main,[\s\S]*?padding:\s*12px calc\(12px \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(12px \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(12px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-mobile-topbar\s*\{[\s\S]*?margin:\s*-12px calc\(-12px - env\(safe-area-inset-right,\s*0px\)\)\s*12px\s*calc\(-12px - env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });

  it("keeps admin mobile topbar and toggle compact sizing at 420px", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*420px\)\s*\{[\s\S]*?\.admin-mobile-topbar\s*\{[\s\S]*?gap:\s*8px;[\s\S]*?min-height:\s*48px;[\s\S]*?padding-left:\s*calc\(10px \+ env\(safe-area-inset-left,\s*0px\)\);[\s\S]*?padding-right:\s*calc\(10px \+ env\(safe-area-inset-right,\s*0px\)\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*420px\)\s*\{[\s\S]*?\.admin-mobile-title\s*\{[\s\S]*?font-size:\s*13px;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*420px\)\s*\{[\s\S]*?\.admin-mobile-nav-toggle\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*420px\)\s*\{[\s\S]*?\.admin-mobile-nav-toggle svg\s*\{[\s\S]*?width:\s*16px;[\s\S]*?height:\s*16px;/,
    );
  });
});
