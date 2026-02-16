import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pagesCss = readFileSync(
  resolve(process.cwd(), "src/styles/pages.css"),
  "utf8",
);

describe("projects and settings responsive css regressions", () => {
  it("keeps projects grid single-column and card actions mobile-friendly at 768px", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.projects-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\}[\s\S]*?\.projects-create-btn\s*\{[\s\S]*?width:\s*100%;[\s\S]*?\}[\s\S]*?\.project-card-meta\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?\}[\s\S]*?\.project-card-actions\s*\{[\s\S]*?margin-top:\s*12px;/,
    );
  });

  it("keeps projects cards and actions compact at 480px", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.project-card-header\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?\}[\s\S]*?\.project-card-actions\s*\{[\s\S]*?gap:\s*8px;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?align-items:\s*stretch;/,
    );
  });

  it("keeps settings provider controls stacked and full-width on tablet/mobile", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.settings-provider-actions\s*\{[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*stretch;[\s\S]*?\}[\s\S]*?\.settings-provider-actions \.btn\s*\{[\s\S]*?width:\s*100%;[\s\S]*?justify-content:\s*center;[\s\S]*?\}[\s\S]*?\.settings-provider-input\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/,
    );
  });

  it("keeps settings cards and action buttons touch-friendly at 480px", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.settings-provider-item\s*\{[\s\S]*?padding:\s*12px;[\s\S]*?\}[\s\S]*?\.settings-provider-action-btn\s*\{[\s\S]*?width:\s*100%;[\s\S]*?justify-content:\s*center;/,
    );
  });
});
