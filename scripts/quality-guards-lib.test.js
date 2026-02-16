const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS,
  WEB_RESPONSIVE_TARGETS_CONFIG_PATH,
  lineForIndex,
  readRequiredWebResponsiveTestTargets,
  runQualityGuards,
} = require("./quality-guards-lib.js");

function getDefaultResponsiveTargets() {
  return [...DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS];
}

test("readRequiredWebResponsiveTestTargets returns defaults when config is missing", () => {
  const workspaceRoot = createWorkspaceFixture();

  const result = readRequiredWebResponsiveTestTargets(workspaceRoot);

  assert.deepEqual(result, getDefaultResponsiveTargets());
});

test("readRequiredWebResponsiveTestTargets returns config targets when valid", () => {
  const workspaceRoot = createWorkspaceFixture();
  const configuredTargets = [
    "tests/config/custom-a.test.ts",
    "tests/config/custom-b.test.ts",
  ];

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    JSON.stringify(configuredTargets, null, 2),
  );

  const result = readRequiredWebResponsiveTestTargets(workspaceRoot);

  assert.deepEqual(result, configuredTargets);
});

test("readRequiredWebResponsiveTestTargets falls back to defaults for malformed config", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    "{not-valid-json",
  );

  const result = readRequiredWebResponsiveTestTargets(workspaceRoot);

  assert.deepEqual(result, getDefaultResponsiveTargets());
});

test("readRequiredWebResponsiveTestTargets falls back to defaults for empty array config", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH), "[]");

  const result = readRequiredWebResponsiveTestTargets(workspaceRoot);

  assert.deepEqual(result, getDefaultResponsiveTargets());
});

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function createWorkspaceFixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "quality-guards-"));
}

test("lineForIndex returns expected 1-based line number", () => {
  const source = ["first", "second", "third", "fourth"].join("\n");
  const indexOfThird = source.indexOf("third");
  assert.equal(lineForIndex(source, indexOfThird), 3);
});

test("runQualityGuards detects explicit any and inline style violations", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/Test.tsx"),
    [
      "export function Test() {",
      "  const bad: any = 1;",
      "  return <div style={{ color: 'red' }}>{bad}</div>;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/src/lib/dom.ts"),
    "document.body.style.cursor = 'wait';",
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const checkNames = result.allViolations.map((entry) => entry.check.name);
  assert.ok(checkNames.includes("explicit-any"));
  assert.ok(checkNames.includes("inline-style-literal"));
  assert.ok(checkNames.includes("dom-style-mutation"));
});

test("runQualityGuards removes web js mirrors when auto clean is enabled", () => {
  const workspaceRoot = createWorkspaceFixture();

  const tsxPath = path.join(workspaceRoot, "apps/web/src/pages/Home.tsx");
  const jsMirrorPath = path.join(workspaceRoot, "apps/web/src/pages/Home.js");
  writeFile(tsxPath, "export const Home = () => null;");
  writeFile(jsMirrorPath, "export const Home = () => null;");

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: true,
  });

  assert.equal(result.removedWebJsMirrors.length, 1);
  assert.equal(fs.existsSync(jsMirrorPath), false);
  assert.equal(
    result.allViolations.some((entry) => entry.check.name === "web-js-mirrors"),
    false,
  );
});

test("runQualityGuards reports web js mirrors in check-only mode", () => {
  const workspaceRoot = createWorkspaceFixture();

  const tsxPath = path.join(workspaceRoot, "apps/web/src/pages/Home.tsx");
  const jsMirrorPath = path.join(workspaceRoot, "apps/web/src/pages/Home.js");
  writeFile(tsxPath, "export const Home = () => null;");
  writeFile(jsMirrorPath, "export const Home = () => null;");

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  assert.equal(result.removedWebJsMirrors.length, 0);
  assert.equal(fs.existsSync(jsMirrorPath), true);
  assert.ok(
    result.allViolations.some((entry) => entry.check.name === "web-js-mirrors"),
  );
});

test("runQualityGuards reports standalone js/jsx files in web source", () => {
  const workspaceRoot = createWorkspaceFixture();
  const jsSourcePath = path.join(workspaceRoot, "apps/web/src/lib/legacy-helper.js");
  const jsxSourcePath = path.join(
    workspaceRoot,
    "apps/web/src/components/LegacyWidget.jsx",
  );
  const mjsSourcePath = path.join(
    workspaceRoot,
    "apps/web/src/utils/legacy-module.mjs",
  );
  const cjsSourcePath = path.join(
    workspaceRoot,
    "apps/web/src/utils/legacy-commonjs.cjs",
  );
  writeFile(jsSourcePath, "export const legacy = true;");
  writeFile(jsxSourcePath, "export const LegacyWidget = () => null;");
  writeFile(mjsSourcePath, "export const legacyModule = true;");
  writeFile(cjsSourcePath, "module.exports = { legacyCommonJs: true };");

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  assert.ok(
    result.allViolations.some(
      (entry) => entry.check.name === "web-js-source-files",
    ),
  );
  assert.equal(fs.existsSync(jsSourcePath), true);
  assert.equal(fs.existsSync(jsxSourcePath), true);
  assert.equal(fs.existsSync(mjsSourcePath), true);
  assert.equal(fs.existsSync(cjsSourcePath), true);
});

test("runQualityGuards blocks style prop usage in web source", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/InlineStyleLeak.tsx"),
    [
      "export function InlineStyleLeak() {",
      "  const styleObj = { opacity: 0.9 };",
      "  return <div style={styleObj}>Leak</div>;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const stylePropViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-style-prop-usage",
  );
  assert.ok(stylePropViolation);
  assert.equal(stylePropViolation.violations.length, 1);
  assert.match(stylePropViolation.violations[0].file, /InlineStyleLeak\.tsx$/);
});

test("runQualityGuards blocks 100vh declarations without 100dvh fallback", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/styles/viewport.css"),
    [
      ".ok {",
      "  height: 100vh;",
      "  height: 100dvh;",
      "}",
      "",
      ".ok-with-comment {",
      "  min-height: 100vh;",
      "  /* dynamic viewport fallback */",
      "  min-height: 100dvh;",
      "}",
      "",
      ".bad {",
      "  max-height: 100vh !important;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const viewportViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-css-100vh-without-dvh-fallback",
  );
  assert.ok(viewportViolation);
  assert.equal(viewportViolation.violations.length, 1);
  assert.equal(viewportViolation.violations[0].line, 13);
  assert.match(viewportViolation.violations[0].snippet, /max-height:\s*100vh/);
});

test("runQualityGuards accepts 100vh declarations with 100dvh fallback", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/styles/viewport-ok.css"),
    [
      ".ok-height {",
      "  height: 100vh !important;",
      "  /* fallback for dynamic mobile bars */",
      "  height: 100dvh !important;",
      "}",
      "",
      ".ok-min-height {",
      "  min-height: 100vh;",
      "  min-height: 100dvh;",
      "}",
      "",
      ".ok-max-height {",
      "  max-height: 100vh;",
      "  max-height: 100dvh;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const viewportViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-css-100vh-without-dvh-fallback",
  );
  assert.equal(viewportViolation, undefined);
});

test("runQualityGuards accepts fallback after multiline CSS comment block", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/styles/viewport-comment.css"),
    [
      ".ok-comment-block {",
      "  height: 100vh;",
      "  /*",
      "   * dynamic viewport fallback for mobile browsers",
      "   */",
      "  height: 100dvh;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const viewportViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-css-100vh-without-dvh-fallback",
  );
  assert.equal(viewportViolation, undefined);
});

test("runQualityGuards requires matching property for 100dvh fallback", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/styles/viewport-mismatch.css"),
    [
      ".bad-mismatch {",
      "  min-height: 100vh;",
      "  height: 100dvh;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const viewportViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-css-100vh-without-dvh-fallback",
  );
  assert.ok(viewportViolation);
  assert.equal(viewportViolation.violations.length, 1);
  assert.equal(viewportViolation.violations[0].line, 2);
  assert.match(viewportViolation.violations[0].snippet, /min-height:\s*100vh/);
});

test("runQualityGuards blocks direct innerWidth comparisons in layout files", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/AppLayout.tsx"),
    [
      "export function AppLayout() {",
      "  const isMobile = window.innerWidth <= 768;",
      "  return isMobile ? null : null;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/src/pages/admin/AdminLayout.tsx"),
    [
      "export function AdminLayout() {",
      "  const isMobile = window.innerWidth <= 900;",
      "  return isMobile ? null : null;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutBreakpointViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-mobile-breakpoint-literals",
  );
  assert.ok(layoutBreakpointViolation);
  assert.equal(layoutBreakpointViolation.violations.length, 2);
});

test("runQualityGuards blocks innerWidth comparisons even with constants", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/AppLayout.tsx"),
    [
      "import { APP_MOBILE_MAX_WIDTH } from '../lib/responsive';",
      "export function AppLayout() {",
      "  const isMobile = window.innerWidth <= APP_MOBILE_MAX_WIDTH;",
      "  return isMobile ? null : null;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/src/pages/admin/AdminLayout.tsx"),
    [
      "import { ADMIN_MOBILE_MAX_WIDTH } from '../../lib/responsive';",
      "export function AdminLayout() {",
      "  const isDesktop = window.innerWidth > ADMIN_MOBILE_MAX_WIDTH;",
      "  return isDesktop ? null : null;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutBreakpointViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-mobile-breakpoint-literals",
  );
  assert.ok(layoutBreakpointViolation);
  assert.equal(layoutBreakpointViolation.violations.length, 2);
});

test("runQualityGuards blocks reverse-order innerWidth comparisons in layout files", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/AppLayout.tsx"),
    [
      "import { APP_MOBILE_MAX_WIDTH } from '../lib/responsive';",
      "export function AppLayout() {",
      "  const isMobile = APP_MOBILE_MAX_WIDTH >= window.innerWidth;",
      "  return isMobile ? null : null;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/src/pages/admin/AdminLayout.tsx"),
    [
      "import { ADMIN_MOBILE_MAX_WIDTH } from '../../lib/responsive';",
      "export function AdminLayout() {",
      "  const isDesktop = ADMIN_MOBILE_MAX_WIDTH < window.innerWidth;",
      "  return isDesktop ? null : null;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutBreakpointViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-mobile-breakpoint-literals",
  );
  assert.ok(layoutBreakpointViolation);
  assert.equal(layoutBreakpointViolation.violations.length, 2);
});

test("runQualityGuards accepts shared responsive helpers in layout files", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/src/components/AppLayout.tsx"),
    [
      "import { isAppMobileViewport } from '../lib/responsive';",
      "export function AppLayout() {",
      "  const isMobile = isAppMobileViewport(window.innerWidth);",
      "  return isMobile ? null : null;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/src/pages/admin/AdminLayout.tsx"),
    [
      "import { isAdminMobileViewport } from '../../lib/responsive';",
      "export function AdminLayout() {",
      "  const isMobile = isAdminMobileViewport(window.innerWidth);",
      "  return isMobile ? null : null;",
      "}",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutBreakpointViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-mobile-breakpoint-literals",
  );
  assert.equal(layoutBreakpointViolation, undefined);
});

test("runQualityGuards blocks incomplete web test:responsive script coverage", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
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

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.ok(responsiveScriptCoverageViolation);
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes("missing-target:tests/pages/AdminLayout.test.tsx"),
    ),
  );
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes(
        "missing-target:tests/config/responsiveSuiteContract.test.ts",
      ),
    ),
  );
});

test("runQualityGuards accepts complete web test:responsive script coverage", () => {
  const workspaceRoot = createWorkspaceFixture();
  const responsiveTargets = getDefaultResponsiveTargets();

  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive": `pnpm run clean:js-mirrors && vitest run ${responsiveTargets.join(
            " ",
          )}`,
        },
      },
      null,
      2,
    ),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.equal(responsiveScriptCoverageViolation, undefined);
});

test("runQualityGuards blocks web test:responsive script without clean-js-mirrors pre-step", () => {
  const workspaceRoot = createWorkspaceFixture();
  const responsiveTargets = getDefaultResponsiveTargets();

  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
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

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.ok(responsiveScriptCoverageViolation);
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes("missing-pre-step:clean-js-mirrors+vitest-run"),
    ),
  );
});

test("runQualityGuards blocks duplicate test targets in web test:responsive script", () => {
  const workspaceRoot = createWorkspaceFixture();
  const responsiveTargets = [
    ...getDefaultResponsiveTargets(),
    "tests/components/AppLayout.test.tsx",
  ];

  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive": `pnpm run clean:js-mirrors && vitest run ${responsiveTargets.join(
            " ",
          )}`,
        },
      },
      null,
      2,
    ),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.ok(responsiveScriptCoverageViolation);
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes(
        "duplicate-target:tests/components/AppLayout.test.tsx",
      ),
    ),
  );
});

test("runQualityGuards blocks unexpected test targets in web test:responsive script", () => {
  const workspaceRoot = createWorkspaceFixture();
  const responsiveTargets = [
    ...getDefaultResponsiveTargets(),
    "tests/config/customExtraResponsive.test.ts",
  ];

  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive": `pnpm run clean:js-mirrors && vitest run ${responsiveTargets.join(
            " ",
          )}`,
        },
      },
      null,
      2,
    ),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.ok(responsiveScriptCoverageViolation);
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes(
        "unexpected-target:tests/config/customExtraResponsive.test.ts",
      ),
    ),
  );
});

test("runQualityGuards blocks out-of-order test targets in web test:responsive script", () => {
  const workspaceRoot = createWorkspaceFixture();
  const responsiveTargets = getDefaultResponsiveTargets();
  const viewportTargetIndex = responsiveTargets.indexOf(
    "tests/utils/viewport.test.ts",
  );
  const matrixTargetIndex = responsiveTargets.indexOf(
    "tests/utils/responsiveMatrix.test.ts",
  );
  const reorderedTargets = [...responsiveTargets];
  if (viewportTargetIndex !== -1 && matrixTargetIndex !== -1) {
    reorderedTargets[viewportTargetIndex] =
      responsiveTargets[matrixTargetIndex];
    reorderedTargets[matrixTargetIndex] =
      responsiveTargets[viewportTargetIndex];
  }

  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
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

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.ok(responsiveScriptCoverageViolation);
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes("target-order-mismatch:index-12"),
    ),
  );
});

test("runQualityGuards reads responsive targets from shared config file when present", () => {
  const workspaceRoot = createWorkspaceFixture();
  const customResponsiveTargets = [
    "tests/config/alpha.test.ts",
    "tests/config/beta.test.ts",
  ];

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    JSON.stringify(customResponsiveTargets, null, 2),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive":
            "pnpm run clean:js-mirrors && vitest run tests/config/alpha.test.ts",
        },
      },
      null,
      2,
    ),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.ok(responsiveScriptCoverageViolation);
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes("missing-target:tests/config/beta.test.ts"),
    ),
  );
  assert.equal(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes("missing-target:src/lib/responsive.test.ts"),
    ),
    false,
  );
});

test("runQualityGuards reports missing target files declared in responsive config", () => {
  const workspaceRoot = createWorkspaceFixture();
  const customResponsiveTargets = [
    "tests/config/alpha.test.ts",
    "tests/config/missing.test.ts",
  ];

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    JSON.stringify(customResponsiveTargets, null, 2),
  );
  writeFile(
    path.join(workspaceRoot, "apps/web/tests/config/alpha.test.ts"),
    "export {};",
  );
  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive":
            "pnpm run clean:js-mirrors && vitest run tests/config/alpha.test.ts tests/config/missing.test.ts",
        },
      },
      null,
      2,
    ),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.ok(responsiveScriptCoverageViolation);
  assert.ok(
    responsiveScriptCoverageViolation.violations.some((violation) =>
      violation.snippet.includes(
        "missing-required-target-file:tests/config/missing.test.ts",
      ),
    ),
  );
});

test("runQualityGuards accepts responsive config when all targets exist", () => {
  const workspaceRoot = createWorkspaceFixture();
  const customResponsiveTargets = [
    "tests/config/alpha.test.ts",
    "tests/config/beta.test.ts",
  ];

  writeFile(
    path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH),
    JSON.stringify(customResponsiveTargets, null, 2),
  );
  writeFile(
    path.join(workspaceRoot, "apps/web/tests/config/alpha.test.ts"),
    "export {};",
  );
  writeFile(
    path.join(workspaceRoot, "apps/web/tests/config/beta.test.ts"),
    "export {};",
  );
  writeFile(
    path.join(workspaceRoot, "apps/web/package.json"),
    JSON.stringify(
      {
        name: "web",
        scripts: {
          "test:responsive":
            "pnpm run clean:js-mirrors && vitest run tests/config/alpha.test.ts tests/config/beta.test.ts",
        },
      },
      null,
      2,
    ),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const responsiveScriptCoverageViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-responsive-test-script-coverage",
  );
  assert.equal(responsiveScriptCoverageViolation, undefined);
});

test("runQualityGuards blocks numeric setViewportWidth literals in layout responsive tests", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    [
      "import { setViewportWidth } from '../utils/viewport';",
      "setViewportWidth(390);",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
    [
      "import { setViewportWidth } from '../utils/viewport';",
      "setViewportWidth(1280);",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutViewportLiteralViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-test-viewport-literals",
  );
  assert.ok(layoutViewportLiteralViolation);
  assert.equal(layoutViewportLiteralViolation.violations.length, 2);
});

test("runQualityGuards accepts layout responsive tests using shared viewport constants", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    [
      "import { PRIMARY_MOBILE_TEST_WIDTH } from '../utils/responsiveMatrix';",
      "import { setViewportWidth } from '../utils/viewport';",
      "setViewportWidth(PRIMARY_MOBILE_TEST_WIDTH);",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
    [
      "import { PRIMARY_DESKTOP_TEST_WIDTH } from '../utils/responsiveMatrix';",
      "import { setViewportWidth } from '../utils/viewport';",
      "setViewportWidth(PRIMARY_DESKTOP_TEST_WIDTH);",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutViewportLiteralViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-test-viewport-literals",
  );
  assert.equal(layoutViewportLiteralViolation, undefined);
});

test("runQualityGuards blocks direct breakpoint comparisons in layout responsive tests", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    [
      "const shouldOpen = width <= 768;",
      "export const value = shouldOpen;",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
    [
      "const shouldOpen = width <= ADMIN_DRAWER_MAX_WIDTH;",
      "export const value = shouldOpen;",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutBreakpointLiteralViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-test-breakpoint-literals",
  );
  assert.ok(layoutBreakpointLiteralViolation);
  assert.equal(layoutBreakpointLiteralViolation.violations.length, 2);
});

test("runQualityGuards blocks direct breakpoint comparisons for custom *Width variable names", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    [
      "const shouldOpen = screenWidth <= APP_DRAWER_MAX_WIDTH;",
      "export const value = shouldOpen;",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
    [
      "const shouldOpen = ADMIN_DRAWER_MAX_WIDTH >= currentWidth;",
      "export const value = shouldOpen;",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutBreakpointLiteralViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-test-breakpoint-literals",
  );
  assert.ok(layoutBreakpointLiteralViolation);
  assert.equal(layoutBreakpointLiteralViolation.violations.length, 2);
});

test("runQualityGuards accepts helper-based breakpoint semantics in layout responsive tests", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    [
      "import { isAppMobileViewport } from '../../src/lib/responsive';",
      "const shouldOpen = isAppMobileViewport(width);",
      "export const value = shouldOpen;",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
    [
      "import { isAdminMobileViewport } from '../../src/lib/responsive';",
      "const shouldOpen = isAdminMobileViewport(width);",
      "export const value = shouldOpen;",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutBreakpointLiteralViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-test-breakpoint-literals",
  );
  assert.equal(layoutBreakpointLiteralViolation, undefined);
});

test("runQualityGuards blocks inline numeric viewport arrays in layout responsive tests", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    [
      "for (const width of [360, 390, 768]) {",
      "  void width;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
    [
      "it.each([[360, true], [1024, false]])('x', () => {});",
    ].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutInlineArrayViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-test-inline-viewport-arrays",
  );
  assert.ok(layoutInlineArrayViolation);
  assert.equal(layoutInlineArrayViolation.violations.length, 2);
});

test("runQualityGuards accepts shared viewport matrix constants in layout responsive tests", () => {
  const workspaceRoot = createWorkspaceFixture();

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    [
      "for (const width of TARGET_VIEWPORT_WIDTHS) {",
      "  void width;",
      "}",
    ].join("\n"),
  );

  writeFile(
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
    ["it.each(MOBILE_VIEWPORT_WIDTHS)('x', () => {});"].join("\n"),
  );

  const result = runQualityGuards({
    workspaceRoot,
    autoCleanWebJsMirrors: false,
  });

  const layoutInlineArrayViolation = result.allViolations.find(
    (entry) => entry.check.name === "web-layout-test-inline-viewport-arrays",
  );
  assert.equal(layoutInlineArrayViolation, undefined);
});
