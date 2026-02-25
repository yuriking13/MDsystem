const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { collectJsMirrorFiles } = require("./js-mirror-utils.js");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "js-mirror-utils-"));
}

function writeFile(filePath, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

test("collectJsMirrorFiles detects js files shadowing ts/tsx modules", () => {
  const rootDir = createTempDir();
  writeFile(path.join(rootDir, "feature/alpha.ts"));
  writeFile(path.join(rootDir, "feature/alpha.js"));
  writeFile(path.join(rootDir, "feature/beta.tsx"));
  writeFile(path.join(rootDir, "feature/beta.js"));

  const mirrors = collectJsMirrorFiles(rootDir)
    .map((filePath) => toPosixPath(path.relative(rootDir, filePath)))
    .sort();

  assert.deepEqual(mirrors, ["feature/alpha.js", "feature/beta.js"]);
});

test("collectJsMirrorFiles ignores js files without ts/tsx siblings", () => {
  const rootDir = createTempDir();
  writeFile(path.join(rootDir, "feature/only-js.js"));
  writeFile(path.join(rootDir, "feature/only-ts.ts"));

  const mirrors = collectJsMirrorFiles(rootDir).map((filePath) =>
    toPosixPath(path.relative(rootDir, filePath)),
  );

  assert.deepEqual(mirrors, []);
});

test("collectJsMirrorFiles traverses nested directories", () => {
  const rootDir = createTempDir();
  writeFile(path.join(rootDir, "a/b/c/component.ts"));
  writeFile(path.join(rootDir, "a/b/c/component.js"));

  const mirrors = collectJsMirrorFiles(rootDir);
  assert.equal(mirrors.length, 1);
  assert.equal(toPosixPath(path.relative(rootDir, mirrors[0])), "a/b/c/component.js");
});

test("collectJsMirrorFiles supports custom source extensions", () => {
  const rootDir = createTempDir();
  writeFile(path.join(rootDir, "feature/custom.mts"));
  writeFile(path.join(rootDir, "feature/custom.js"));

  const mirrors = collectJsMirrorFiles(rootDir, [".mts"]).map((filePath) =>
    toPosixPath(path.relative(rootDir, filePath)),
  );

  assert.deepEqual(mirrors, ["feature/custom.js"]);
});
