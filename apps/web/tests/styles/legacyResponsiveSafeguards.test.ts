import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const legacyCss = readFileSync(
  resolve(process.cwd(), "src/styles/legacy.css"),
  "utf8",
);

describe("legacy responsive css safeguards", () => {
  it("keeps modal overlays safe-area aware", () => {
    expect(legacyCss).toMatch(
      /\.modal-overlay\s*\{[\s\S]*?padding:\s*calc\(1rem \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(legacyCss).toMatch(
      /\.onboarding-overlay\s*\{[\s\S]*?padding:\s*calc\(1rem \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(legacyCss).toMatch(
      /\.node-info-modal-overlay\s*\{[\s\S]*?padding:\s*calc\(1rem \+ env\(safe-area-inset-top,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(1rem \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });

  it("keeps document editor container with 100vh and 100dvh pairs across breakpoints", () => {
    expect(legacyCss).toMatch(
      /\.document-editor-container\s*\{[\s\S]*?height:\s*calc\(100vh - 200px\);[\s\S]*?height:\s*calc\(100dvh - 200px\);/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.document-editor-container\s*\{[\s\S]*?height:\s*calc\(100vh - 260px\);[\s\S]*?height:\s*calc\(100dvh - 260px\);/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.document-editor-container\s*\{[\s\S]*?height:\s*calc\(100vh - 220px\);[\s\S]*?height:\s*calc\(100dvh - 220px\);/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.document-editor-container\s*\{[\s\S]*?height:\s*calc\(100vh - 180px\);[\s\S]*?height:\s*calc\(100dvh - 180px\);/,
    );
  });

  it("keeps graph fixed-height and fullscreen containers with dvh fallbacks", () => {
    expect(legacyCss).toMatch(
      /\.graph-container\.graph-fixed-height\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100vh;[\s\S]*?max-height:\s*100dvh;/,
    );
    expect(legacyCss).toMatch(
      /\.graph-container\.graph-fixed-height\.graph-fullscreen\s*\{[\s\S]*?height:\s*100vh !important;[\s\S]*?height:\s*100dvh !important;[\s\S]*?max-height:\s*100vh !important;[\s\S]*?max-height:\s*100dvh !important;/,
    );
  });

  it("keeps legacy dropdown menus constrained by safe-area aware viewport widths", () => {
    expect(legacyCss).toMatch(
      /\.settings-dropdown\s*\{[\s\S]*?min-width:\s*min\(200px,\s*calc\(100vw - 24px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\)\);/,
    );
    expect(legacyCss).toMatch(
      /\.dropdown-menu\s*\{[\s\S]*?min-width:\s*min\(180px,\s*calc\(100vw - 24px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\)\);/,
    );
    expect(legacyCss).toMatch(
      /\.graph-export-dropdown-menu\s*\{[\s\S]*?min-width:\s*min\(140px,\s*calc\(100vw - 24px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\)\);/,
    );
  });

  it("keeps rabbit sidebar and theme toggle safe-area offsets", () => {
    expect(legacyCss).toMatch(
      /\.rabbit-sidebar\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\);[\s\S]*?padding-right:\s*env\(safe-area-inset-right,\s*0px\);[\s\S]*?padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/,
    );
    expect(legacyCss).toMatch(
      /\.theme-toggle-btn\s*\{[\s\S]*?bottom:\s*calc\(20px \+ env\(safe-area-inset-bottom,\s*0px\)\);[\s\S]*?left:\s*calc\(20px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });
});
