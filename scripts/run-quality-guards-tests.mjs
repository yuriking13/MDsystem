import { spawnSync } from "node:child_process";

const guardTestFiles = [
  "scripts/quality-guards-lib.test.js",
  "scripts/js-mirror-utils.test.js",
  "scripts/quality-guards-cli.test.js",
];

const result = spawnSync(process.execPath, ["--test", ...guardTestFiles], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
