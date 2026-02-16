const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const guardCliPath = path.resolve(__dirname, "quality-guards.js");

function createTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "quality-guards-cli-"));
}

function writeFile(filePath, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

test("quality-guards check mode reports mirror remediation tip", () => {
  const workspaceRoot = createTempWorkspace();
  const tsxPath = path.join(workspaceRoot, "apps/web/src/pages/Home.tsx");
  const jsMirrorPath = path.join(workspaceRoot, "apps/web/src/pages/Home.js");

  writeFile(tsxPath, "export const Home = () => null;");
  writeFile(jsMirrorPath, "export const Home = () => null;");

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: run `pnpm --filter web run clean:js-mirrors` to remove JS mirrors/,
  );
  assert.equal(fs.existsSync(jsMirrorPath), true);
});

test("quality-guards default mode auto-cleans mirrors", () => {
  const workspaceRoot = createTempWorkspace();
  const tsxPath = path.join(workspaceRoot, "apps/web/src/pages/Home.tsx");
  const jsMirrorPath = path.join(workspaceRoot, "apps/web/src/pages/Home.js");

  writeFile(tsxPath, "export const Home = () => null;");
  writeFile(jsMirrorPath, "export const Home = () => null;");

  const result = spawnSync(process.execPath, [guardCliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Removed 1 JS mirror file\(s\)/);
  assert.equal(fs.existsSync(jsMirrorPath), false);
});

test("quality-guards check mode reports standalone js/jsx source file tip", () => {
  const workspaceRoot = createTempWorkspace();
  const jsSourcePath = path.join(workspaceRoot, "apps/web/src/lib/legacy-helper.js");
  const jsxSourcePath = path.join(
    workspaceRoot,
    "apps/web/src/components/legacy-widget.jsx",
  );

  writeFile(jsSourcePath, "export const legacy = true;");
  writeFile(jsxSourcePath, "export const LegacyWidget = () => null;");

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: remove JavaScript files from apps\/web\/src or migrate them to TypeScript/,
  );
  assert.equal(fs.existsSync(jsSourcePath), true);
  assert.equal(fs.existsSync(jsxSourcePath), true);
});

test("quality-guards check mode prints both remediation tips when needed", () => {
  const workspaceRoot = createTempWorkspace();
  const tsxPath = path.join(workspaceRoot, "apps/web/src/pages/Home.tsx");
  const jsMirrorPath = path.join(workspaceRoot, "apps/web/src/pages/Home.js");
  const standaloneJsPath = path.join(
    workspaceRoot,
    "apps/web/src/lib/legacy-helper.js",
  );

  writeFile(tsxPath, "export const Home = () => null;");
  writeFile(jsMirrorPath, "export const Home = () => null;");
  writeFile(standaloneJsPath, "export const legacy = true;");

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: run `pnpm --filter web run clean:js-mirrors` to remove JS mirrors/,
  );
  assert.match(
    result.stderr,
    /Tip: remove JavaScript files from apps\/web\/src or migrate them to TypeScript/,
  );
});

test("quality-guards check mode reports style-prop remediation tip", () => {
  const workspaceRoot = createTempWorkspace();
  const styleLeakPath = path.join(
    workspaceRoot,
    "apps/web/src/components/style-leak.tsx",
  );

  writeFile(
    styleLeakPath,
    [
      "export function StyleLeak() {",
      "  const styleObj = { opacity: 0.8 };",
      "  return <div style={styleObj}>Leak</div>;",
      "}",
    ].join("\n"),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: move styles to CSS classes; style=\{\.\.\.\} is disallowed in apps\/web\/src/,
  );
});

test("quality-guards check mode reports 100vh fallback remediation tip", () => {
  const workspaceRoot = createTempWorkspace();
  const cssFilePath = path.join(workspaceRoot, "apps/web/src/styles/viewport.css");

  writeFile(
    cssFilePath,
    [".bad {", "  min-height: 100vh;", "}"].join("\n"),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: after any `height\|min-height\|max-height: 100vh`, add the same property with `100dvh` on the next line/,
  );
});

test("quality-guards check mode passes when 100vh fallback is present", () => {
  const workspaceRoot = createTempWorkspace();
  const cssFilePath = path.join(workspaceRoot, "apps/web/src/styles/viewport.css");

  writeFile(
    cssFilePath,
    [
      ".ok {",
      "  min-height: 100vh;",
      "  min-height: 100dvh;",
      "}",
    ].join("\n"),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.doesNotMatch(
    result.stderr,
    /Tip: after any `height\|min-height\|max-height: 100vh`, add the same property with `100dvh` on the next line/,
  );
});

test("quality-guards check mode reports layout breakpoint literal remediation tip", () => {
  const workspaceRoot = createTempWorkspace();
  const appLayoutPath = path.join(
    workspaceRoot,
    "apps/web/src/components/AppLayout.tsx",
  );
  const adminLayoutPath = path.join(
    workspaceRoot,
    "apps/web/src/pages/admin/AdminLayout.tsx",
  );

  writeFile(appLayoutPath, "const mobile = window.innerWidth <= 768;");
  writeFile(adminLayoutPath, "const mobile = window.innerWidth <= 900;");

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: in AppLayout\/AdminLayout use helpers from `apps\/web\/src\/lib\/responsive\.ts` instead of numeric `window\.innerWidth` literals/,
  );
});
