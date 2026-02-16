const { runQualityGuards } = require("./quality-guards-lib.js");

function main() {
  const { removedWebJsMirrors, allViolations } = runQualityGuards({
    workspaceRoot: process.cwd(),
    autoCleanWebJsMirrors: true,
  });

  if (removedWebJsMirrors.length > 0) {
    console.log(
      `[quality-guards] Removed ${removedWebJsMirrors.length} JS mirror file(s) from apps/web/src before checks.`,
    );
  }

  if (allViolations.length === 0) {
    console.log("[quality-guards] All guard checks passed.");
    return;
  }

  console.error("[quality-guards] Guard violations found:");
  for (const { check, violations } of allViolations) {
    console.error(
      `\n- ${check.name}: ${check.description} (found ${violations.length})`,
    );
    for (const violation of violations) {
      console.error(
        `  ${violation.file}:${violation.line} -> ${violation.snippet}`,
      );
    }
  }

  process.exit(1);
}

main();
