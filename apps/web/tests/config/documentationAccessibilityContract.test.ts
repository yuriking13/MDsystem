import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const docsSource = readFileSync(
  resolve(process.cwd(), "src/pages/DocumentationPage.tsx"),
  "utf8",
);
const pagesCss = readFileSync(
  resolve(process.cwd(), "src/styles/pages.css"),
  "utf8",
);

describe("documentation accessibility contract", () => {
  it("keeps section and topic semantics wired with aria attributes", () => {
    expect(docsSource).toMatch(/aria-current=\{/);
    expect(docsSource).toMatch(/role="tablist"/);
    expect(docsSource).toMatch(/aria-orientation="vertical"/);
    expect(docsSource).toMatch(/role="tab"/);
    expect(docsSource).toMatch(/id=\{`docs-tab-\$\{topic\.id\}`\}/);
    expect(docsSource).toMatch(
      /aria-controls=\{`docs-panel-\$\{topic\.id\}`\}/,
    );
    expect(docsSource).toMatch(/role="tabpanel"/);
    expect(docsSource).toMatch(
      /aria-labelledby=\{`docs-tab-\$\{activeTopic\.id\}`\}/,
    );
  });

  it("keeps docs navigation controls explicitly non-submit buttons", () => {
    expect(docsSource).toMatch(
      /<button[\s\S]*?key=\{section\.id\}[\s\S]*?type="button"/,
    );
    expect(docsSource).toMatch(
      /<button[\s\S]*?key=\{topic\.id\}[\s\S]*?type="button"/,
    );
  });

  it("keeps focus-visible affordances for keyboard navigation in docs styles", () => {
    expect(pagesCss).toMatch(/\.doc-nav-item:focus-visible\s*\{/);
    expect(pagesCss).toMatch(/\.docs-subnav-item:focus-visible\s*\{/);
    expect(pagesCss).toMatch(
      /box-shadow:\s*0 0 0 2px rgba\(37,\s*99,\s*235,\s*0\.2\);/,
    );
  });

  it("keeps pending-focus reset protections during manual navigation", () => {
    expect(docsSource).toMatch(
      /if \(pendingFocusTopicId !== activeTopicId\) \{[\s\S]*?setPendingFocusTopicId\(null\);/,
    );
    expect(docsSource).toMatch(
      /onClick=\{\(\) => \{[\s\S]*?setPendingFocusTopicId\(null\);[\s\S]*?setActiveSectionId\(section\.id\);/,
    );
    expect(docsSource).toMatch(
      /onClick=\{\(\) => \{[\s\S]*?setPendingFocusTopicId\(null\);[\s\S]*?setActiveTopicId\(topic\.id\);/,
    );
  });
});
