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

test("quality-guards check mode reports standalone js source file tip", () => {
  const workspaceRoot = createTempWorkspace();
  const jsSourcePath = path.join(workspaceRoot, "apps/web/src/lib/legacy-helper.js");

  writeFile(jsSourcePath, "export const legacy = true;");

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
});
