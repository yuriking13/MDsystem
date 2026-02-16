const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { lineForIndex, runQualityGuards } = require("./quality-guards-lib.js");

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function createWorkspaceFixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "quality-guards-"));
}

test("lineForIndex returns expected 1-based line number", () => {
  const source = ["first", "second", "third", "fourth"].join("\n");
  const indexOfThird = source.indexOf("third");
  assert.equal(lineForIndex(source, indexOfThird), 3);
});

test("runQualityGuards detects explicit any and inline style violations", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/Test.tsx"),
    [
      "export function Test() {",
      "  const bad: any = 1;",
      "  return <div style={{ color: 'red' }}>{bad}</div>;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/src/lib/dom.ts"),
    "document.body.style.cursor = 'wait';",
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const checkNames = result.allViolations.map((entry) => entry.check.name);
  assert.ok(checkNames.includes("explicit-any"));
  assert.ok(checkNames.includes("inline-style-literal"));
  assert.ok(checkNames.includes("dom-style-mutation"));
});

test("runQualityGuards removes web js mirrors when auto clean is enabled", () => {
  const workspaceRoot = createWorkspaceFixture();

  const tsxPath = path.join(workspaceRoot, "apps/web/src/pages/Home.tsx");
  const jsMirrorPath = path.join(workspaceRoot, "apps/web/src/pages/Home.js");
  writeFile(tsxPath, "export const Home = () => null;");
  writeFile(jsMirrorPath, "export const Home = () => null;");

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: true,
  });

  assert.equal(result.removedWebJsMirrors.length, 1);
  assert.equal(fs.existsSync(jsMirrorPath), false);
  assert.equal(
    result.allViolations.some((entry) => entry.check.name === "web-js-mirrors"),
    false,
  );
});

test("runQualityGuards reports web js mirrors in check-only mode", () => {
  const workspaceRoot = createWorkspaceFixture();

  const tsxPath = path.join(workspaceRoot, "apps/web/src/pages/Home.tsx");
  const jsMirrorPath = path.join(workspaceRoot, "apps/web/src/pages/Home.js");
  writeFile(tsxPath, "export const Home = () => null;");
  writeFile(jsMirrorPath, "export const Home = () => null;");

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  assert.equal(result.removedWebJsMirrors.length, 0);
  assert.equal(fs.existsSync(jsMirrorPath), true);
  assert.ok(
    result.allViolations.some((entry) => entry.check.name === "web-js-mirrors"),
  );
});

test("runQualityGuards reports standalone js/jsx files in web source", () => {
  const workspaceRoot = createWorkspaceFixture();
  const jsSourcePath = path.join(workspaceRoot, "apps/web/src/lib/legacy-helper.js");
  const jsxSourcePath = path.join(
    workspaceRoot,
    "apps/web/src/components/LegacyWidget.jsx",
  );
  const mjsSourcePath = path.join(
    workspaceRoot,
    "apps/web/src/utils/legacy-module.mjs",
  );
  const cjsSourcePath = path.join(
    workspaceRoot,
    "apps/web/src/utils/legacy-commonjs.cjs",
  );
  writeFile(jsSourcePath, "export const legacy = true;");
  writeFile(jsxSourcePath, "export const LegacyWidget = () => null;");
  writeFile(mjsSourcePath, "export const legacyModule = true;");
  writeFile(cjsSourcePath, "module.exports = { legacyCommonJs: true };");

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  assert.ok(
    result.allViolations.some(
      (entry) => entry.check.name === "web-js-source-files",
    ),
  );
  assert.equal(fs.existsSync(jsSourcePath), true);
  assert.equal(fs.existsSync(jsxSourcePath), true);
  assert.equal(fs.existsSync(mjsSourcePath), true);
  assert.equal(fs.existsSync(cjsSourcePath), true);
});

test("runQualityGuards blocks style prop usage in web source", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/InlineStyleLeak.tsx"),
    [
      "export function InlineStyleLeak() {",
      "  const styleObj = { opacity: 0.9 };",
      "  return <div style={styleObj}>Leak</div>;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const stylePropViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-style-prop-usage",
  );
  assert.ok(stylePropViolation);
  assert.equal(stylePropViolation.violations.length, 1);
  assert.match(stylePropViolation.violations[0].file, /InlineStyleLeak\.tsx$/);
});
