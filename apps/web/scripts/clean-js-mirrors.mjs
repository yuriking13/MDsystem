import { rmSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcRoot = path.resolve(__dirname, "..", "src");
const checkOnly = process.argv.includes("--check");
const require = createRequire(import.meta.url);
const { collectJsMirrorFiles } = require(path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "scripts",
  "js-mirror-utils.js",
));

async function main() {
  const mirrors = collectJsMirrorFiles(srcRoot);

  if (mirrors.length === 0) {
    return;
  }

  if (checkOnly) {
    console.error(
      `[clean-js-mirrors] Found ${mirrors.length} JS mirror file(s) in src/ that shadow TS/TSX modules:`,
    );
    for (const mirror of mirrors) {
      console.error(`- ${path.relative(path.resolve(__dirname, ".."), mirror)}`);
    }
    process.exitCode = 1;
    return;
  }

  mirrors.forEach((mirror) => rmSync(mirror));
  console.log(
    `[clean-js-mirrors] Removed ${mirrors.length} JS mirror file(s) from src/.`,
  );
}

main().catch((error) => {
  console.error("[clean-js-mirrors] Failed:", error);
  process.exit(1);
});
