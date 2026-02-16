const { runQualityGuards } = require("./quality-guards-lib.js");

function main() {
  const checkOnly = process.argv.includes("--check");
  const { removedWebJsMirrors, allViolations } = runQualityGuards({
    workspaceRoot: process.cwd(),
    autoCleanWebJsMirrors: !checkOnly,
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

  if (checkOnly) {
    if (allViolations.some(({ check }) => check.name === "web-js-mirrors")) {
      console.error(
        "\n[quality-guards] Tip: run `pnpm --filter web run clean:js-mirrors` to remove JS mirrors, then re-run checks.",
      );
    }

    if (allViolations.some(({ check }) => check.name === "web-js-source-files")) {
      console.error(
        "\n[quality-guards] Tip: remove JavaScript files from apps/web/src or migrate them to TypeScript.",
      );
    }

    if (allViolations.some(({ check }) => check.name === "web-style-prop-usage")) {
      console.error(
        "\n[quality-guards] Tip: move styles to CSS classes; style={...} is disallowed in apps/web/src.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-css-100vh-without-dvh-fallback",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: after any `height|min-height|max-height: 100vh`, add the same property with `100dvh` on the next line.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-layout-mobile-breakpoint-literals",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: in AppLayout/AdminLayout call helpers from `apps/web/src/lib/responsive.ts` instead of comparing `window.innerWidth` directly.",
      );
    }
  }

  process.exit(1);
}

main();
