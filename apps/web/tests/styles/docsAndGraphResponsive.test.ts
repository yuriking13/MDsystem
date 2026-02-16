import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pagesCss = readFileSync(
  resolve(process.cwd(), "src/styles/pages.css"),
  "utf8",
);
const graphCss = readFileSync(
  resolve(process.cwd(), "src/styles/citation-graph.css"),
  "utf8",
);

describe("docs and citation-graph responsive css regressions", () => {
  it("keeps mobile page container safe-area padding for core pages", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.page-container\s*\{[\s\S]*?padding:\s*16px calc\(12px \+ env\(safe-area-inset-right,\s*0px\)\)\s*calc\(16px \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*calc\(12px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });

  it("keeps project detail fullwidth shell overflow-safe for graph/editor tabs", () => {
    expect(pagesCss).toMatch(
      /\.project-detail-fullwidth\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?overflow:\s*hidden;/,
    );
    expect(pagesCss).toMatch(
      /\.project-detail-fullwidth \.tab-content\s*\{[\s\S]*?flex:\s*1;[\s\S]*?min-height:\s*0;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?overflow:\s*hidden;/,
    );
  });

  it("keeps docs nav safe-area paddings and constrained item width at tablet breakpoint", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.docs-nav\s*\{[\s\S]*?padding:\s*6px calc\(6px \+ env\(safe-area-inset-right,\s*0px\)\)\s*6px\s*calc\(6px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.docs-nav \.doc-nav-item\s*\{[\s\S]*?max-width:\s*min\(260px,\s*calc\(100vw - 48px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\)\);/,
    );
  });

  it("keeps docs nav safe-area paddings at mobile breakpoint", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.docs-nav\s*\{[\s\S]*?padding:\s*4px calc\(4px \+ env\(safe-area-inset-right,\s*0px\)\)\s*4px\s*calc\(4px \+ env\(safe-area-inset-left,\s*0px\)\);/,
    );
  });

  it("keeps docs header and action row stack-safe on mobile breakpoint", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.docs-page-header\s*\{[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*flex-start;[\s\S]*?\}[\s\S]*?\.docs-page-header \.row\.gap\s*\{[\s\S]*?flex-wrap:\s*wrap;/,
    );
  });

  it("keeps docs nav items compact at narrow-mobile breakpoint", () => {
    expect(pagesCss).toMatch(
      /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.docs-nav \.doc-nav-item\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?padding:\s*8px 10px;/,
    );
  });

  it("keeps graph fullscreen height fallbacks and toolbar safe-area anchor", () => {
    expect(graphCss).toMatch(
      /\.graph-fullscreen\s*\{[\s\S]*?height:\s*100vh !important;[\s\S]*?height:\s*100dvh !important;/,
    );
    expect(graphCss).toMatch(
      /\.graph-toolbar\s*\{[\s\S]*?top:\s*calc\(16px \+ env\(safe-area-inset-top,\s*0px\)\);/,
    );
  });

  it("keeps graph side panels safe-area aware on mobile breakpoints", () => {
    expect(graphCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.graph-control-panel,\s*\.node-details-panel\s*\{[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\);[\s\S]*?padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/,
    );
    expect(graphCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.graph-control-panel:not\(\.collapsed\)\s*\{[\s\S]*?width:\s*min\(calc\(84vw - env\(safe-area-inset-left,\s*0px\)\),\s*300px\);/,
    );
    expect(graphCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.node-details-panel\s*\{[\s\S]*?width:\s*min\(calc\(88vw - env\(safe-area-inset-right,\s*0px\)\),\s*320px\);/,
    );
  });

  it("keeps graph toolbar width safe-area constraints on mobile and narrow mobile", () => {
    expect(graphCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.graph-toolbar\s*\{[\s\S]*?max-width:\s*calc\(100% - 32px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\);/,
    );
    expect(graphCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.graph-toolbar\s*\{[\s\S]*?max-width:\s*calc\(100% - 16px - env\(safe-area-inset-left,\s*0px\) - env\(safe-area-inset-right,\s*0px\)\);/,
    );
  });
});
