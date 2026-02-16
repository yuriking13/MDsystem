import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const legacyCss = readFileSync(
  resolve(process.cwd(), "src/styles/legacy.css"),
  "utf8",
);

describe("auth page responsive css regressions", () => {
  it("keeps auth shell viewport-height fallback and scroll safety", () => {
    expect(legacyCss).toMatch(
      /\.auth-page\s*\{[\s\S]*?min-height:\s*100vh;[\s\S]*?min-height:\s*100dvh;[\s\S]*?overflow-x:\s*hidden;[\s\S]*?overflow-y:\s*auto;/,
    );
    expect(legacyCss).toMatch(
      /\.auth-grid\s*\{[\s\S]*?min-height:\s*calc\(100vh - 160px\);[\s\S]*?min-height:\s*calc\(100dvh - 160px\);/,
    );
  });

  it("keeps auth container and footer safe-area aware", () => {
    expect(legacyCss).toMatch(
      /\.auth-container\s*\{[\s\S]*?padding:\s*calc\(40px \+ env\(safe-area-inset-top,\s*0px\)\)\s*24px[\s\S]*?calc\(40px \+ env\(safe-area-inset-bottom,\s*0px\)\);/,
    );
    expect(legacyCss).toMatch(
      /\.auth-footer\s*\{[\s\S]*?padding-bottom:\s*calc\(16px \+ env\(safe-area-inset-bottom,\s*0px\)\);/,
    );
  });

  it("keeps desktop two-column auth layout and desktop-only features panel", () => {
    expect(legacyCss).toMatch(
      /@media\s*\(min-width:\s*1024px\)\s*\{[\s\S]*?\.auth-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr 1fr;[\s\S]*?gap:\s*64px;/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(min-width:\s*1024px\)\s*\{[\s\S]*?\.auth-features\s*\{[\s\S]*?display:\s*block;/,
    );
  });

  it("keeps tablet auth card and form controls touch-friendly", () => {
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.auth-grid\s*\{[\s\S]*?min-height:\s*calc\(100vh - 120px\);[\s\S]*?min-height:\s*calc\(100dvh - 120px\);[\s\S]*?gap:\s*20px;/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.auth-options\s*\{[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*flex-start;/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.auth-submit\s*\{[\s\S]*?min-height:\s*42px;/,
    );
  });

  it("keeps compact 480px auth spacing and typography safeguards", () => {
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.auth-container\s*\{[\s\S]*?padding:\s*calc\(14px \+ env\(safe-area-inset-top,\s*0px\)\)\s*12px[\s\S]*?calc\(14px \+ env\(safe-area-inset-bottom,\s*0px\)\);/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.auth-field input\s*\{[\s\S]*?padding:\s*12px 14px;[\s\S]*?border-radius:\s*12px;[\s\S]*?font-size:\s*14px;/,
    );
    expect(legacyCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.auth-footer\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?padding:\s*12px 12px calc\(12px \+ env\(safe-area-inset-bottom,\s*0px\)\);/,
    );
  });
});
