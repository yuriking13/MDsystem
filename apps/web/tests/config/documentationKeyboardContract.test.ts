import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const docsSource = readFileSync(
  resolve(process.cwd(), "src/pages/DocumentationPage.tsx"),
  "utf8",
);

describe("documentation keyboard navigation contract", () => {
  it("keeps topic keyboard handler with full arrow/home/end coverage", () => {
    expect(docsSource).toMatch(
      /const handleTopicTabKeyDown = \([\s\S]*?switch \(event\.key\)\s*\{/,
    );
    expect(docsSource).toMatch(/case "ArrowDown":/);
    expect(docsSource).toMatch(/case "ArrowRight":/);
    expect(docsSource).toMatch(/case "ArrowUp":/);
    expect(docsSource).toMatch(/case "ArrowLeft":/);
    expect(docsSource).toMatch(/case "Home":/);
    expect(docsSource).toMatch(/case "End":/);
  });

  it("keeps wrap-around logic at both submenu boundaries", () => {
    expect(docsSource).toMatch(
      /const nextIndex = topicIndex >= lastIndex \? 0 : topicIndex \+ 1;/,
    );
    expect(docsSource).toMatch(
      /const nextIndex = topicIndex <= 0 \? lastIndex : topicIndex - 1;/,
    );
  });

  it("keeps active tab focus synchronization after keyboard navigation", () => {
    expect(docsSource).toMatch(
      /const \[pendingFocusTopicId, setPendingFocusTopicId\] = useState<string \| null>\(/,
    );
    expect(docsSource).toMatch(/if \(!pendingFocusTopicId\) return;/);
    expect(docsSource).toMatch(
      /const tab = document\.getElementById\([\s\S]*?as HTMLButtonElement \| null;/,
    );
    expect(docsSource).toMatch(/tab\?\.focus\(\);/);
    expect(docsSource).toMatch(/setPendingFocusTopicId\(null\);/);
  });

  it("keeps semantic tab attributes that power roving tabindex behavior", () => {
    expect(docsSource).toMatch(/role="tablist"/);
    expect(docsSource).toMatch(/aria-orientation="vertical"/);
    expect(docsSource).toMatch(/role="tab"/);
    expect(docsSource).toMatch(
      /tabIndex=\{activeTopic\.id === topic\.id \? 0 : -1\}/,
    );
    expect(docsSource).toMatch(/role="tabpanel"/);
  });
});
