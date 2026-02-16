import { access, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcRoot = path.resolve(__dirname, "..", "src");
const checkOnly = process.argv.includes("--check");

/**
 * Recursively scans src directory and finds JavaScript files that shadow
 * TypeScript/TSX sources with the same base path.
 */
async function collectJsMirrors(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const mirrors = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      mirrors.push(...(await collectJsMirrors(fullPath)));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const tsPath = fullPath.slice(0, -3) + ".ts";
    const tsxPath = fullPath.slice(0, -3) + ".tsx";

    const hasTypeScriptSibling = await Promise.any([
      access(tsPath).then(() => true),
      access(tsxPath).then(() => true),
    ]).catch(() => false);

    if (hasTypeScriptSibling) {
      mirrors.push(fullPath);
    }
  }

  return mirrors;
}

async function main() {
  const mirrors = await collectJsMirrors(srcRoot);

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

  await Promise.all(mirrors.map((mirror) => rm(mirror)));
  console.log(
    `[clean-js-mirrors] Removed ${mirrors.length} JS mirror file(s) from src/.`,
  );
}

main().catch((error) => {
  console.error("[clean-js-mirrors] Failed:", error);
  process.exit(1);
});
