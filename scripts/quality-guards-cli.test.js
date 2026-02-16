const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS,
  WEB_RESPONSIVE_MANUAL_MATRIX_CONFIG_PATH,
  WEB_RESPONSIVE_TARGETS_CONFIG_PATH,
} = require("./quality-guards-lib.js");

const guardCliPath = path.resolve(__dirname, "quality-guards.js");

function createTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "quality-guards-cli-"));
}

function writeFile(filePath, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function getDefaultResponsiveTargets() {
  return [...DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS];
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
    /Tip: in AppLayout\/AdminLayout call helpers from `apps\/web\/src\/lib\/responsive\.ts` instead of comparing `window\.innerWidth` directly/,
  );
});

test("quality-guards check mode reports tip for reverse-order layout breakpoint comparisons", () => {
  const workspaceRoot = createTempWorkspace();
  const appLayoutPath = path.join(
    workspaceRoot,
    "apps/web/src/components/AppLayout.tsx",
  );
  const adminLayoutPath = path.join(
    workspaceRoot,
    "apps/web/src/pages/admin/AdminLayout.tsx",
  );

  writeFile(appLayoutPath, "const mobile = APP_MAX >= window.innerWidth;");
  writeFile(adminLayoutPath, "const desktop = ADMIN_MAX < window.innerWidth;");

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: in AppLayout\/AdminLayout call helpers from `apps\/web\/src\/lib\/responsive\.ts` instead of comparing `window\.innerWidth` directly/,
  );
});

test("quality-guards check mode reports responsive suite coverage remediation tip", () => {
  const workspaceRoot = createTempWorkspace();
  const webPackagePath = path.join(workspaceRoot, "apps/web/package.json");

  writeFile(
    webPackagePath,
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive":
            "pnpm run clean:js-mirrors && vitest run tests/components/AppLayout.test.tsx",
        },
      },
      null,
      2,
    ),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/package\.json` test:responsive in sync with required responsive suites/,
  );
});

test("quality-guards check mode reports responsive suite tip when pre-step is missing", () => {
  const workspaceRoot = createTempWorkspace();
  const webPackagePath = path.join(workspaceRoot, "apps/web/package.json");
  const responsiveTargets = getDefaultResponsiveTargets();

  writeFile(
    webPackagePath,
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive": `vitest run ${responsiveTargets.join(" ")}`,
        },
      },
      null,
      2,
    ),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/package\.json` test:responsive in sync with required responsive suites/,
  );
});

test("quality-guards check mode reports layout test viewport literal remediation tip", () => {
  const workspaceRoot = createTempWorkspace();
  const appLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/components/AppLayout.test.tsx",
  );
  const adminLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/pages/AdminLayout.test.tsx",
  );

  writeFile(
    appLayoutTestPath,
    "import { setViewportWidth } from '../utils/viewport';\nsetViewportWidth(390);",
  );
  writeFile(
    adminLayoutTestPath,
    "import { setViewportWidth } from '../utils/viewport';\nsetViewportWidth(1280);",
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: in AppLayout\/AdminLayout test suites use shared viewport constants\/helpers from `tests\/utils\/responsiveMatrix\.ts` instead of numeric setViewportWidth\(\.\.\.\) literals/,
  );
});

test("quality-guards check mode reports responsive suite tip when targets are out of canonical order", () => {
  const workspaceRoot = createTempWorkspace();
  const webPackagePath = path.join(workspaceRoot, "apps/web/package.json");
  const responsiveTargets = getDefaultResponsiveTargets();
  const viewportTargetIndex = responsiveTargets.indexOf(
    "tests/utils/viewport.test.ts",
  );
  const matrixTargetIndex = responsiveTargets.indexOf(
    "tests/utils/responsiveMatrix.test.ts",
  );
  const reorderedTargets = [...responsiveTargets];
  if (viewportTargetIndex !== -1 && matrixTargetIndex !== -1) {
    reorderedTargets[viewportTargetIndex] = responsiveTargets[matrixTargetIndex];
    reorderedTargets[matrixTargetIndex] = responsiveTargets[viewportTargetIndex];
  }

  writeFile(
    webPackagePath,
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive": `pnpm run clean:js-mirrors && vitest run ${reorderedTargets.join(
            " ",
          )}`,
        },
      },
      null,
      2,
    ),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/package\.json` test:responsive in sync with required responsive suites/,
  );
});

test("quality-guards check mode reports layout breakpoint literal remediation tip for tests", () => {
  const workspaceRoot = createTempWorkspace();
  const appLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/components/AppLayout.test.tsx",
  );
  const adminLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/pages/AdminLayout.test.tsx",
  );

  writeFile(appLayoutTestPath, "const shouldOpen = width <= 768;");
  writeFile(
    adminLayoutTestPath,
    "const shouldOpen = width <= ADMIN_DRAWER_MAX_WIDTH;",
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: in AppLayout\/AdminLayout test suites derive mobile\/open expectations via `isAppMobileViewport` \/ `isAdminMobileViewport` instead of direct width comparisons/,
  );
});

test("quality-guards check mode reports layout breakpoint tip for custom *Width variable comparisons", () => {
  const workspaceRoot = createTempWorkspace();
  const appLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/components/AppLayout.test.tsx",
  );
  const adminLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/pages/AdminLayout.test.tsx",
  );

  writeFile(appLayoutTestPath, "const shouldOpen = screenWidth <= 768;");
  writeFile(
    adminLayoutTestPath,
    "const shouldOpen = ADMIN_DRAWER_MAX_WIDTH >= currentWidth;",
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: in AppLayout\/AdminLayout test suites derive mobile\/open expectations via `isAppMobileViewport` \/ `isAdminMobileViewport` instead of direct width comparisons/,
  );
});

test("quality-guards check mode reports inline viewport array remediation tip for tests", () => {
  const workspaceRoot = createTempWorkspace();
  const appLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/components/AppLayout.test.tsx",
  );

  writeFile(appLayoutTestPath, "for (const width of [360, 390, 768]) { }");

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: in AppLayout\/AdminLayout test suites iterate shared matrix constants \(`TARGET_VIEWPORT_WIDTHS`, `MOBILE_VIEWPORT_WIDTHS`, etc\.\) instead of inline numeric arrays/,
  );
});

test("quality-guards check mode reports route matrix coverage remediation tip for tests", () => {
  const workspaceRoot = createTempWorkspace();
  const appLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/components/AppLayout.test.tsx",
  );
  const adminLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/pages/AdminLayout.test.tsx",
  );

  writeFile(
    appLayoutTestPath,
    "describe('AppLayout', () => { it('placeholder', () => {}); });",
  );
  writeFile(
    adminLayoutTestPath,
    "describe('AdminLayout', () => { it('placeholder', () => {}); });",
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep AppLayout\/AdminLayout responsive suites iterating required route matrices/,
  );
});

test("quality-guards check mode reports responsive suite tip when configured target file is missing", () => {
  const workspaceRoot = createTempWorkspace();
  const webPackagePath = path.join(workspaceRoot, "apps/web/package.json");

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    JSON.stringify(["tests/config/present.test.ts", "tests/config/missing.test.ts"], null, 2),
  );
  writeFile(
    path.join(workspaceRoot, "apps/web/tests/config/present.test.ts"),
    "export {};",
  );
  writeFile(
    webPackagePath,
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive":
            "pnpm run clean:js-mirrors && vitest run tests/config/present.test.ts tests/config/missing.test.ts",
        },
      },
      null,
      2,
    ),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/package\.json` test:responsive in sync with required responsive suites and ensure every target from `apps\/web\/tests\/config\/responsiveSuiteTargets\.json` exists/,
  );
});

test("quality-guards check mode reports responsive target config remediation tip", () => {
  const workspaceRoot = createTempWorkspace();

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    JSON.stringify(["tests/config/bad-target.js"], null, 2),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/tests\/config\/responsiveSuiteTargets\.json` as a unique non-empty array of \.ts\/\.tsx target paths/,
  );
});

test("quality-guards check mode reports responsive target config tip when required targets are missing", () => {
  const workspaceRoot = createTempWorkspace();
  const responsiveTargets = getDefaultResponsiveTargets().slice(0, 5);

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    JSON.stringify(responsiveTargets, null, 2),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/tests\/config\/responsiveSuiteTargets\.json` as a unique non-empty array of \.ts\/\.tsx target paths/,
  );
});

test("quality-guards check mode reports responsive suite tip when config-runner script has no config file", () => {
  const workspaceRoot = createTempWorkspace();
  const webPackagePath = path.join(workspaceRoot, "apps/web/package.json");

  writeFile(
    webPackagePath,
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive": "node scripts/run-responsive-suite.mjs",
        },
      },
      null,
      2,
    ),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/package\.json` test:responsive in sync with required responsive suites and ensure every target from `apps\/web\/tests\/config\/responsiveSuiteTargets\.json` exists/,
  );
});

test("quality-guards check mode reports responsive manual matrix remediation tip", () => {
  const workspaceRoot = createTempWorkspace();

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_MANUAL_MATRIX_CONFIG_PATH),
    JSON.stringify(
      {
        viewportWidths: [360, 390, 768],
        userRoutes: {
          auth: ["/login"],
          shell: ["/projects"],
          projectTabs: ["articles"],
          projectDocumentRoutePattern: "(",
          projectGraphRoutePattern: "^/projects/[^/]+\\?tab=graph$",
        },
        adminRoutes: ["/admin"],
      },
      null,
      2,
    ),
  );

  const result = spawnSync(process.execPath, [guardCliPath, "--check"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Tip: keep `apps\/web\/tests\/config\/responsiveManualMatrix\.json` aligned with the required manual QA viewport\+route matrix and valid regex patterns/,
  );
});
