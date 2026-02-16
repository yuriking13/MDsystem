import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const responsiveTargetConfigPath = resolve(
  projectRoot,
  "tests/config/responsiveSuiteTargets.json",
);

function fail(message) {
  console.error(`[run-responsive-suite] ${message}`);
  process.exit(1);
}

function parseResponsiveTargets() {
  let parsedConfig;
  try {
    parsedConfig = JSON.parse(readFileSync(responsiveTargetConfigPath, "utf8"));
  } catch {
    fail(`Failed to parse ${responsiveTargetConfigPath} as JSON.`);
  }

  if (!Array.isArray(parsedConfig) || parsedConfig.length === 0) {
    fail("responsiveSuiteTargets.json must be a non-empty array.");
  }

  const targets = [];
  const seen = new Set();
  for (const target of parsedConfig) {
    if (typeof target !== "string") {
      fail("responsiveSuiteTargets.json entries must be strings.");
    }

    const trimmedTarget = target.trim();
    if (
      trimmedTarget.length === 0 ||
      (!trimmedTarget.endsWith(".ts") && !trimmedTarget.endsWith(".tsx"))
    ) {
      fail("responsiveSuiteTargets.json entries must end with .ts or .tsx.");
    }

    if (seen.has(trimmedTarget)) {
      fail(`Duplicate responsive target detected: ${trimmedTarget}`);
    }
    seen.add(trimmedTarget);
    targets.push(trimmedTarget);
  }

  return targets;
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (typeof result.status === "number") {
    return result.status;
  }

  return 1;
}

const targets = parseResponsiveTargets();
const cleanStatus = runCommand("pnpm", ["run", "clean:js-mirrors"]);
if (cleanStatus !== 0) {
  process.exit(cleanStatus);
}

const forwardedArgs = process.argv.slice(2);
const vitestStatus = runCommand("pnpm", [
  "exec",
  "vitest",
  "run",
  ...targets,
  ...forwardedArgs,
]);
process.exit(vitestStatus);
