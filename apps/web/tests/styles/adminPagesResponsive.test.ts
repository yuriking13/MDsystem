import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminCss = readFileSync(
  resolve(process.cwd(), "src/styles/admin.css"),
  "utf8",
);

describe("admin page-level responsive css regressions", () => {
  it("keeps mobile filter and search stacks for admin content pages", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-search-form,\s*\.admin-filters-row\s*\{[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*stretch;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.admin-filters-row \.admin-search-form\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*100%;/,
    );
  });

  it("keeps responsive table wrapper and row action ergonomics at 640px", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-table-wrapper\s*\{[\s\S]*?margin:\s*0 calc\(-8px - env\(safe-area-inset-right,\s*0px\)\)\s*0[\s\S]*?calc\(-8px - env\(safe-area-inset-left,\s*0px\)\);[\s\S]*?padding:\s*0 calc\(8px \+ env\(safe-area-inset-right,\s*0px\)\)\s*4px[\s\S]*?calc\(8px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-action-btn\s*\{[\s\S]*?min-width:\s*32px;[\s\S]*?min-height:\s*32px;[\s\S]*?display:\s*inline-flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-table-actions\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?gap:\s*6px;/,
    );
  });

  it("keeps mobile table text wrapping safeguards at 640px", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-table-message,\s*\.admin-table-detail,\s*\.admin-table-title,\s*\.admin-progress-text,\s*\.admin-error-preview\s*\{[\s\S]*?max-width:\s*none;[\s\S]*?white-space:\s*normal;[\s\S]*?overflow:\s*visible;[\s\S]*?text-overflow:\s*clip;[\s\S]*?overflow-wrap:\s*anywhere;/,
    );
  });

  it("keeps admin filters and actions full-width and wrap-safe on mobile", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-filter-group select,\s*\.admin-filter-group input\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*100%;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-export-actions,\s*\.admin-header-actions,\s*\.admin-user-actions,\s*\.admin-cleanup-actions\s*\{[\s\S]*?width:\s*100%;[\s\S]*?gap:\s*8px;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-export-actions \.btn,\s*\.admin-header-actions \.btn,\s*\.admin-user-actions \.btn,\s*\.admin-cleanup-actions \.btn\s*\{[\s\S]*?flex:\s*1 1 140px;[\s\S]*?min-width:\s*0;[\s\S]*?justify-content:\s*center;/,
    );
  });

  it("keeps admin job summaries compact on 640px and single-column on 420px", () => {
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.admin-job-summary-item\s*\{[\s\S]*?flex:\s*1 1 calc\(50% - 4px\);[\s\S]*?min-width:\s*0;[\s\S]*?padding:\s*12px 10px;/,
    );
    expect(adminCss).toMatch(
      /@media\s*\(max-width:\s*420px\)\s*\{[\s\S]*?\.admin-job-summary-item\s*\{[\s\S]*?flex-basis:\s*100%;/,
    );
  });
});
