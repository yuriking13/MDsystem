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

    if (
      allViolations.some(
        ({ check }) => check.name === "web-responsive-test-script-coverage",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: keep `apps/web/package.json` test:responsive in sync with required responsive suites and ensure every target from `apps/web/tests/config/responsiveSuiteTargets.json` exists.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-layout-test-viewport-literals",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: in AppLayout/AdminLayout test suites use shared viewport constants/helpers from `tests/utils/responsiveMatrix.ts` instead of numeric setViewportWidth(...) literals.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-layout-test-breakpoint-literals",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: in AppLayout/AdminLayout test suites derive mobile/open expectations via `isAppMobileViewport` / `isAdminMobileViewport` instead of direct width comparisons.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-layout-test-inline-viewport-arrays",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: in AppLayout/AdminLayout test suites iterate shared matrix constants (`TARGET_VIEWPORT_WIDTHS`, `MOBILE_VIEWPORT_WIDTHS`, etc.) instead of inline numeric arrays.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-layout-test-route-matrix-coverage",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: keep AppLayout/AdminLayout responsive suites iterating required route matrices (`APP_NON_FIXED_ROUTE_CASES`, `APP_FIXED_ROUTE_CASES`, `PROJECT_TABS`, `APP_AUTH_ROUTE_CASES`, `APP_ADMIN_NO_SHELL_ROUTE_CASES`, `ADMIN_RESPONSIVE_ROUTE_CASES`) across shared viewport constants.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-responsive-target-config",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: keep `apps/web/tests/config/responsiveSuiteTargets.json` as a unique non-empty array of .ts/.tsx target paths.",
      );
    }

    if (
      allViolations.some(
        ({ check }) => check.name === "web-responsive-manual-matrix-config",
      )
    ) {
      console.error(
        "\n[quality-guards] Tip: keep `apps/web/tests/config/responsiveManualMatrix.json` aligned with the required manual QA viewport+route matrix and valid regex patterns.",
      );
    }
  }

  process.exit(1);
}

main();
