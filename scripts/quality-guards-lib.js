const fs = require("node:fs");
const path = require("node:path");
const { collectJsMirrorFiles } = require("./js-mirror-utils.js");

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  ".turbo",
  ".next",
  "build",
]);

const checks = [
  {
    name: "explicit-any",
    roots: ["apps/api", "apps/web"],
    fileExtensions: new Set([".ts", ".tsx"]),
    pattern: /Record<string,\s*any>|:\s*any\b|as\s+any\b|<any>|any\[\]/g,
    description: "Explicit any typing is not allowed",
  },
  {
    name: "inline-style-literal",
    roots: ["apps/web/src"],
    fileExtensions: new Set([".tsx"]),
    pattern: /style=\{\{/g,
    description: "Inline React style literals are not allowed",
  },
  {
    name: "dom-style-mutation",
    roots: ["apps/web/src"],
    fileExtensions: new Set([".ts", ".tsx"]),
    pattern: /\.style\./g,
    description: "Direct DOM style mutation is not allowed",
  },
  {
    name: "inline-style-attribute-string",
    roots: ["apps/web/src"],
    fileExtensions: new Set([".ts", ".tsx"]),
    pattern: /style=["']/g,
    description: "Inline HTML style attributes in strings are not allowed",
  },
  {
    name: "dom-style-attribute-mutation",
    roots: ["apps/web/src"],
    fileExtensions: new Set([".ts", ".tsx"]),
    pattern: /setAttribute\(\s*["']style["']/g,
    description: "setAttribute('style', ...) is not allowed",
  },
];

const webJsMirrorCheck = {
  name: "web-js-mirrors",
  description:
    "JS mirror files that shadow TS/TSX modules are not allowed after cleanup",
};

const webJsSourceCheck = {
  name: "web-js-source-files",
  description: "JavaScript/JSX source files are not allowed in apps/web/src",
};

const webStylePropCheck = {
  name: "web-style-prop-usage",
  description: "style={...} usage is not allowed in apps/web/src",
};

const webCssViewportFallbackCheck = {
  name: "web-css-100vh-without-dvh-fallback",
  description:
    "CSS declarations using 100vh for height/min-height/max-height must be followed by a 100dvh fallback",
};

const webLayoutMobileBreakpointLiteralCheck = {
  name: "web-layout-mobile-breakpoint-literals",
  description:
    "AppLayout/AdminLayout should not compare window.innerWidth directly; use shared responsive helper functions",
};

const webResponsiveTestScriptCoverageCheck = {
  name: "web-responsive-test-script-coverage",
  description:
    "apps/web package test:responsive must be config-runner based or include clean-js-mirrors pre-step with canonical responsive targets",
};

const webLayoutTestViewportLiteralCheck = {
  name: "web-layout-test-viewport-literals",
  description:
    "AppLayout/AdminLayout responsive tests should use shared viewport constants instead of numeric setViewportWidth literals",
};

const webLayoutTestBreakpointLiteralCheck = {
  name: "web-layout-test-breakpoint-literals",
  description:
    "AppLayout/AdminLayout responsive tests should use shared breakpoint helpers instead of direct width comparisons",
};

const webLayoutTestInlineViewportArrayCheck = {
  name: "web-layout-test-inline-viewport-arrays",
  description:
    "AppLayout/AdminLayout responsive tests should use shared viewport matrix constants instead of inline numeric arrays",
};

const webLayoutTestRouteMatrixCoverageCheck = {
  name: "web-layout-test-route-matrix-coverage",
  description:
    "AppLayout/AdminLayout responsive tests should keep required route+viewport matrix coverage from responsive fixtures",
};

const webResponsiveTargetConfigCheck = {
  name: "web-responsive-target-config",
  description:
    "apps/web/tests/config/responsiveSuiteTargets.json must be a valid unique .ts/.tsx target list and retain required responsive suite core targets",
};

const webResponsiveManualMatrixConfigCheck = {
  name: "web-responsive-manual-matrix-config",
  description:
    "apps/web/tests/config/responsiveManualMatrix.json must keep valid viewport and route matrix structure",
};

const DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS = [
  "src/lib/responsive.test.ts",
  "tests/components/AppLayout.test.tsx",
  "tests/pages/AdminLayout.test.tsx",
  "tests/components/AppSidebar.test.tsx",
  "tests/styles/articlesLayout.test.ts",
  "tests/styles/legacyResponsiveSafeguards.test.ts",
  "tests/styles/layoutResponsiveShell.test.ts",
  "tests/styles/docsAndGraphResponsive.test.ts",
  "tests/styles/projectsAndSettingsResponsive.test.ts",
  "tests/styles/adminPagesResponsive.test.ts",
  "tests/styles/authResponsive.test.ts",
  "tests/utils/responsiveMatrix.test.ts",
  "tests/utils/viewport.test.ts",
  "tests/config/responsiveManualMatrixContract.test.ts",
  "tests/config/responsiveSuiteContract.test.ts",
  "tests/config/responsiveTestConventions.test.ts",
];

const WEB_RESPONSIVE_TARGETS_CONFIG_PATH = path.join(
  "apps",
  "web",
  "tests",
  "config",
  "responsiveSuiteTargets.json",
);

const WEB_RESPONSIVE_MANUAL_MATRIX_CONFIG_PATH = path.join(
  "apps",
  "web",
  "tests",
  "config",
  "responsiveManualMatrix.json",
);

function loadRequiredWebResponsiveTestTargets(workspaceRoot) {
  const configPath = path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH);
  if (!fs.existsSync(configPath)) {
    return {
      targets: DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS,
      loadedFromConfig: false,
    };
  }

  try {
    const parsedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!Array.isArray(parsedConfig)) {
      return {
        targets: DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS,
        loadedFromConfig: false,
      };
    }

    const normalizedTargets = parsedConfig.filter(
      (target) => typeof target === "string",
    );
    if (normalizedTargets.length === 0) {
      return {
        targets: DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS,
        loadedFromConfig: false,
      };
    }

    return {
      targets: normalizedTargets,
      loadedFromConfig: true,
    };
  } catch (error) {
    return {
      targets: DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS,
      loadedFromConfig: false,
    };
  }
}

function readRequiredWebResponsiveTestTargets(workspaceRoot) {
  return loadRequiredWebResponsiveTestTargets(workspaceRoot).targets;
}

function walkFiles(rootDir, extensions) {
  const output = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) {
          continue;
        }
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        output.push(fullPath);
      }
    }
  }

  return output;
}

function getCachedFiles(rootDir, extensions, fileCache) {
  const extensionKey = Array.from(extensions).sort().join(",");
  const cacheKey = `${rootDir}|${extensionKey}`;
  const cachedFiles = fileCache.get(cacheKey);
  if (cachedFiles) {
    return cachedFiles;
  }

  const files = walkFiles(rootDir, extensions);
  fileCache.set(cacheKey, files);
  return files;
}

function lineForIndex(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function runGuardCheck(check, workspaceRoot, fileCache) {
  const violations = [];

  for (const relativeRoot of check.roots) {
    const absoluteRoot = path.join(workspaceRoot, relativeRoot);
    const files = getCachedFiles(absoluteRoot, check.fileExtensions, fileCache);

    for (const filePath of files) {
      const source = fs.readFileSync(filePath, "utf8");
      const matcher = new RegExp(check.pattern.source, check.pattern.flags);
      let match = matcher.exec(source);

      while (match) {
        violations.push({
          file: path.relative(workspaceRoot, filePath),
          line: lineForIndex(source, match.index),
          snippet: match[0],
        });
        match = matcher.exec(source);
      }
    }
  }

  return violations;
}

function collectWebJsMirrors(workspaceRoot) {
  const webSrcRoot = path.join(workspaceRoot, "apps/web/src");
  const jsMirrors = collectJsMirrorFiles(webSrcRoot);

  return jsMirrors.map((jsFilePath) => ({
    file: path.relative(workspaceRoot, jsFilePath),
    line: 1,
    snippet: "js-mirror-file",
  }));
}

function collectWebSourceJsFiles(workspaceRoot, fileCache) {
  const webSrcRoot = path.join(workspaceRoot, "apps/web/src");
  const jsLikeExtensions = [".js", ".jsx", ".mjs", ".cjs"];
  const jsFiles = jsLikeExtensions.flatMap((extension) =>
    getCachedFiles(webSrcRoot, new Set([extension]), fileCache),
  );

  return jsFiles.map((jsFilePath) => ({
    file: path.relative(workspaceRoot, jsFilePath),
    line: 1,
    snippet: "js-source-file",
  }));
}

function collectWebStylePropViolations(workspaceRoot, fileCache) {
  const webSrcRoot = path.join(workspaceRoot, "apps/web/src");
  const tsxFiles = getCachedFiles(webSrcRoot, new Set([".tsx"]), fileCache);

  const violations = [];
  for (const filePath of tsxFiles) {
    const relativeFile = path.relative(workspaceRoot, filePath).replaceAll(path.sep, "/");
    const source = fs.readFileSync(filePath, "utf8");
    const matcher = /style=\{/g;
    let match = matcher.exec(source);

    while (match) {
      violations.push({
        file: relativeFile,
        line: lineForIndex(source, match.index),
        snippet: match[0],
      });
      match = matcher.exec(source);
    }
  }

  return violations;
}

function collectWebCssViewportFallbackViolations(workspaceRoot, fileCache) {
  const webSrcRoot = path.join(workspaceRoot, "apps/web/src");
  const cssFiles = getCachedFiles(webSrcRoot, new Set([".css"]), fileCache);

  const violations = [];
  for (const filePath of cssFiles) {
    const relativeFile = path
      .relative(workspaceRoot, filePath)
      .replaceAll(path.sep, "/");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const match = line.match(
        /^\s*(height|min-height|max-height):\s*100vh(?:\s*!important)?\s*;/,
      );
      if (!match) {
        continue;
      }

      const propertyName = match[1];
      let nextLineIndex = i + 1;
      while (
        nextLineIndex < lines.length &&
        (lines[nextLineIndex].trim().length === 0 ||
          lines[nextLineIndex].trim().startsWith("/*") ||
          lines[nextLineIndex].trim().startsWith("*") ||
          lines[nextLineIndex].trim().startsWith("*/"))
      ) {
        nextLineIndex += 1;
      }

      const nextLine = lines[nextLineIndex] || "";
      const fallbackMatcher = new RegExp(
        `^\\s*${propertyName}:\\s*100dvh(?:\\s*!important)?\\s*;`,
      );
      if (!fallbackMatcher.test(nextLine)) {
        violations.push({
          file: relativeFile,
          line: i + 1,
          snippet: line.trim(),
        });
      }
    }
  }

  return violations;
}

function collectWebLayoutMobileBreakpointLiteralViolations(workspaceRoot) {
  const layoutFiles = [
    path.join(workspaceRoot, "apps/web/src/components/AppLayout.tsx"),
    path.join(workspaceRoot, "apps/web/src/pages/admin/AdminLayout.tsx"),
  ];
  const violations = [];

  for (const filePath of layoutFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const source = fs.readFileSync(filePath, "utf8");
    const matcher =
      /(?:(?:window\.)?innerWidth\s*[<>]=?\s*[^\s;,)]+|[^\s;,(]+\s*[<>]=?\s*(?:window\.)?innerWidth)/g;
    let match = matcher.exec(source);

    while (match) {
      violations.push({
        file: path.relative(workspaceRoot, filePath).replaceAll(path.sep, "/"),
        line: lineForIndex(source, match.index),
        snippet: match[0],
      });
      match = matcher.exec(source);
    }
  }

  return violations;
}

function extractVitestTargetsFromScript(command) {
  const marker = "vitest run";
  const markerIndex = command.indexOf(marker);
  if (markerIndex === -1) {
    return [];
  }

  const targetSlice = command.slice(markerIndex + marker.length).trim();
  if (!targetSlice) {
    return [];
  }

  return targetSlice
    .split(/\s+/)
    .filter((token) => token.endsWith(".ts") || token.endsWith(".tsx"));
}

function collectWebResponsiveTestScriptCoverageViolations(workspaceRoot) {
  const packagePath = path.join(workspaceRoot, "apps/web/package.json");
  if (!fs.existsSync(packagePath)) {
    return [];
  }

  const relativeFile = path
    .relative(workspaceRoot, packagePath)
    .replaceAll(path.sep, "/");
  const source = fs.readFileSync(packagePath, "utf8");
  const scriptIndex = source.indexOf('"test:responsive"');
  const scriptLine = scriptIndex === -1 ? 1 : lineForIndex(source, scriptIndex);

  let parsedPackage;
  try {
    parsedPackage = JSON.parse(source);
  } catch (error) {
    return [
      {
        file: relativeFile,
        line: 1,
        snippet: "invalid-json:apps/web/package.json",
      },
    ];
  }

  const responsiveScript =
    parsedPackage &&
    parsedPackage.scripts &&
    parsedPackage.scripts["test:responsive"];

  if (typeof responsiveScript !== "string") {
    return [
      {
        file: relativeFile,
        line: scriptLine,
        snippet: "missing-script:test:responsive",
      },
    ];
  }

  const violations = [];
  const normalizedResponsiveScript = responsiveScript.trim();
  const configRunnerScript = "node scripts/run-responsive-suite.mjs";
  const usesConfigRunnerScript = normalizedResponsiveScript === configRunnerScript;
  if (
    !usesConfigRunnerScript &&
    !responsiveScript.includes("pnpm run clean:js-mirrors && vitest run")
  ) {
    violations.push({
      file: relativeFile,
      line: scriptLine,
      snippet: "missing-pre-step:clean-js-mirrors+vitest-run",
    });
  }

  const { loadedFromConfig, targets: requiredTargets } =
    loadRequiredWebResponsiveTestTargets(workspaceRoot);
  if (usesConfigRunnerScript && !loadedFromConfig) {
    violations.push({
      file: relativeFile,
      line: scriptLine,
      snippet: "missing-config:responsiveSuiteTargets.json",
    });
  }

  const responsiveTargets = usesConfigRunnerScript
    ? [...requiredTargets]
    : extractVitestTargetsFromScript(responsiveScript);
  const targetSet = new Set(responsiveTargets);
  let hasDuplicateTargets = false;

  for (const requiredTarget of requiredTargets) {
    if (!targetSet.has(requiredTarget)) {
      violations.push({
        file: relativeFile,
        line: scriptLine,
        snippet: `missing-target:${requiredTarget}`,
      });
    }
  }

  if (targetSet.size !== responsiveTargets.length) {
    hasDuplicateTargets = true;
    const seen = new Set();
    for (const target of responsiveTargets) {
      if (seen.has(target)) {
        violations.push({
          file: relativeFile,
          line: scriptLine,
          snippet: `duplicate-target:${target}`,
        });
      }
      seen.add(target);
    }
  }

  for (const target of responsiveTargets) {
    if (!requiredTargets.includes(target)) {
      violations.push({
        file: relativeFile,
        line: scriptLine,
        snippet: `unexpected-target:${target}`,
      });
    }
  }

  const hasMissingOrUnexpected = violations.some(
    (violation) =>
      violation.snippet.startsWith("missing-target:") ||
      violation.snippet.startsWith("unexpected-target:"),
  );

  if (
    !hasDuplicateTargets &&
    !hasMissingOrUnexpected &&
    responsiveTargets.length === requiredTargets.length
  ) {
    let mismatchIndex = -1;
    for (let i = 0; i < requiredTargets.length; i += 1) {
      if (responsiveTargets[i] !== requiredTargets[i]) {
        mismatchIndex = i;
        break;
      }
    }

    if (mismatchIndex !== -1) {
      violations.push({
        file: relativeFile,
        line: scriptLine,
        snippet: `target-order-mismatch:index-${mismatchIndex + 1}`,
      });
    }
  }

  if (loadedFromConfig) {
    for (const requiredTarget of requiredTargets) {
      const targetPath = path.join(workspaceRoot, "apps", "web", requiredTarget);
      if (!fs.existsSync(targetPath)) {
        violations.push({
          file: WEB_RESPONSIVE_TARGETS_CONFIG_PATH.replaceAll(path.sep, "/"),
          line: 1,
          snippet: `missing-required-target-file:${requiredTarget}`,
        });
      }
    }
  }

  return violations;
}

function collectWebLayoutTestViewportLiteralViolations(workspaceRoot) {
  const layoutTestFiles = [
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
  ];
  const violations = [];

  for (const filePath of layoutTestFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const source = fs.readFileSync(filePath, "utf8");
    const matcher = /setViewportWidth\(\s*\d+\s*\)/g;
    let match = matcher.exec(source);

    while (match) {
      violations.push({
        file: path.relative(workspaceRoot, filePath).replaceAll(path.sep, "/"),
        line: lineForIndex(source, match.index),
        snippet: match[0],
      });
      match = matcher.exec(source);
    }
  }

  return violations;
}

function collectWebLayoutTestBreakpointLiteralViolations(workspaceRoot) {
  const layoutTestFiles = [
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
  ];
  const violations = [];

  for (const filePath of layoutTestFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const source = fs.readFileSync(filePath, "utf8");
    const widthIdentifierPattern =
      "(?:width|viewportWidth|[A-Za-z_$][\\w$]*[Ww]idth)";
    const matcher = new RegExp(
      `(?:${widthIdentifierPattern}\\s*[<>]=?\\s*(?:APP_DRAWER_MAX_WIDTH|ADMIN_DRAWER_MAX_WIDTH|\\d+)|(?:APP_DRAWER_MAX_WIDTH|ADMIN_DRAWER_MAX_WIDTH|\\d+)\\s*[<>]=?\\s*${widthIdentifierPattern})`,
      "g",
    );
    let match = matcher.exec(source);

    while (match) {
      violations.push({
        file: path.relative(workspaceRoot, filePath).replaceAll(path.sep, "/"),
        line: lineForIndex(source, match.index),
        snippet: match[0],
      });
      match = matcher.exec(source);
    }
  }

  return violations;
}

function collectWebLayoutTestInlineViewportArrayViolations(workspaceRoot) {
  const layoutTestFiles = [
    path.join(workspaceRoot, "apps/web/tests/components/AppLayout.test.tsx"),
    path.join(workspaceRoot, "apps/web/tests/pages/AdminLayout.test.tsx"),
  ];
  const violations = [];

  for (const filePath of layoutTestFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const source = fs.readFileSync(filePath, "utf8");
    const patterns = [
      /for\s*\(\s*const\s+\w+\s+of\s+\[[^\]]*\d[^\]]*\]\s*\)/g,
      /(?:it|test)\.each\(\s*\[[^\]]*\d[^\]]*\]/g,
    ];

    for (const pattern of patterns) {
      const matcher = new RegExp(pattern.source, pattern.flags);
      let match = matcher.exec(source);

      while (match) {
        violations.push({
          file: path
            .relative(workspaceRoot, filePath)
            .replaceAll(path.sep, "/"),
          line: lineForIndex(source, match.index),
          snippet: match[0],
        });
        match = matcher.exec(source);
      }
    }
  }

  return violations;
}

function collectWebLayoutTestRouteMatrixCoverageViolations(workspaceRoot) {
  const appLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/components/AppLayout.test.tsx",
  );
  const adminLayoutTestPath = path.join(
    workspaceRoot,
    "apps/web/tests/pages/AdminLayout.test.tsx",
  );
  const violations = [];

  const appRelativeFile = path
    .relative(workspaceRoot, appLayoutTestPath)
    .replaceAll(path.sep, "/");
  if (fs.existsSync(appLayoutTestPath)) {
    const appSource = fs.readFileSync(appLayoutTestPath, "utf8");
    const appRequirements = [
      {
        id: "app-non-fixed-routes-target-width-loop",
        pattern:
          /it\.each\(APP_NON_FIXED_ROUTE_CASES\)[\s\S]*?for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
      },
      {
        id: "app-fixed-routes-target-width-loop",
        pattern:
          /it\.each\(APP_FIXED_ROUTE_CASES\)[\s\S]*?for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
      },
      {
        id: "app-project-tabs-target-width-loop",
        pattern:
          /it\.each\(PROJECT_TABS\)[\s\S]*?for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
      },
      {
        id: "app-auth-routes-target-width-loop",
        pattern:
          /it\.each\(APP_AUTH_ROUTE_CASES\)[\s\S]*?for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
      },
      {
        id: "app-admin-no-shell-routes-target-width-loop",
        pattern:
          /it\.each\(APP_ADMIN_NO_SHELL_ROUTE_CASES\)[\s\S]*?for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
      },
    ];

    for (const requirement of appRequirements) {
      if (!requirement.pattern.test(appSource)) {
        violations.push({
          file: appRelativeFile,
          line: 1,
          snippet: `missing-route-matrix-coverage:${requirement.id}`,
        });
      }
    }
  }

  const adminRelativeFile = path
    .relative(workspaceRoot, adminLayoutTestPath)
    .replaceAll(path.sep, "/");
  if (fs.existsSync(adminLayoutTestPath)) {
    const adminSource = fs.readFileSync(adminLayoutTestPath, "utf8");
    const adminRequirements = [
      {
        id: "admin-routes-map-case",
        pattern:
          /ADMIN_RESPONSIVE_ROUTE_CASES\.map\(\(\{\s*route,\s*pageLabel\s*\}\)\s*=>\s*\[/,
      },
      {
        id: "admin-routes-target-width-loop",
        pattern: /for\s*\(\s*const\s+\w+\s+of\s+TARGET_VIEWPORT_WIDTHS\s*\)/,
      },
      {
        id: "admin-mobile-title-map-case",
        pattern:
          /ADMIN_RESPONSIVE_ROUTE_CASES\.map\(\(\{\s*route,\s*pageLabel,\s*mobileTitle\s*\}\)\s*=>\s*\[/,
      },
      {
        id: "admin-mobile-title-mobile-width-loop",
        pattern: /for\s*\(\s*const\s+\w+\s+of\s+MOBILE_VIEWPORT_WIDTHS\s*\)/,
      },
    ];

    for (const requirement of adminRequirements) {
      if (!requirement.pattern.test(adminSource)) {
        violations.push({
          file: adminRelativeFile,
          line: 1,
          snippet: `missing-route-matrix-coverage:${requirement.id}`,
        });
      }
    }
  }

  return violations;
}

function collectWebResponsiveTargetConfigViolations(workspaceRoot) {
  const configPath = path.join(workspaceRoot, WEB_RESPONSIVE_TARGETS_CONFIG_PATH);
  if (!fs.existsSync(configPath)) {
    return [];
  }

  const relativeFile = WEB_RESPONSIVE_TARGETS_CONFIG_PATH.replaceAll(
    path.sep,
    "/",
  );
  let parsedConfig;
  try {
    parsedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    return [
      {
        file: relativeFile,
        line: 1,
        snippet: "invalid-json:responsiveSuiteTargets.json",
      },
    ];
  }

  if (!Array.isArray(parsedConfig)) {
    return [
      {
        file: relativeFile,
        line: 1,
        snippet: "invalid-config-shape:expected-array",
      },
    ];
  }

  if (parsedConfig.length === 0) {
    return [
      {
        file: relativeFile,
        line: 1,
        snippet: "empty-target-list",
      },
    ];
  }

  const violations = [];
  const seenTargets = new Set();
  const validTrimmedTargets = [];
  for (let index = 0; index < parsedConfig.length; index += 1) {
    const target = parsedConfig[index];
    if (typeof target !== "string") {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: `invalid-target-type:index-${index + 1}`,
      });
      continue;
    }

    const trimmedTarget = target.trim();
    if (trimmedTarget.length === 0) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: `empty-target:index-${index + 1}`,
      });
      continue;
    }

    if (trimmedTarget !== target) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: `untrimmed-target:${target}`,
      });
    }

    if (!trimmedTarget.endsWith(".ts") && !trimmedTarget.endsWith(".tsx")) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: `invalid-target-extension:${trimmedTarget}`,
      });
      continue;
    }

    if (seenTargets.has(trimmedTarget)) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: `duplicate-config-target:${trimmedTarget}`,
      });
      continue;
    }

    seenTargets.add(trimmedTarget);
    validTrimmedTargets.push(trimmedTarget);
  }

  for (const requiredTarget of DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS) {
    if (!seenTargets.has(requiredTarget)) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: `missing-required-config-target:${requiredTarget}`,
      });
    }
  }

  const hasMissingRequiredTargets = violations.some((violation) =>
    violation.snippet.startsWith("missing-required-config-target:"),
  );
  if (!hasMissingRequiredTargets) {
    let lastIndex = -1;
    let mismatchIndex = -1;
    for (
      let requiredIndex = 0;
      requiredIndex < DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS.length;
      requiredIndex += 1
    ) {
      const requiredTarget =
        DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS[requiredIndex];
      const currentIndex = validTrimmedTargets.indexOf(requiredTarget);
      if (currentIndex <= lastIndex) {
        mismatchIndex = requiredIndex;
        break;
      }
      lastIndex = currentIndex;
    }

    if (mismatchIndex !== -1) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: `required-target-order-mismatch:index-${mismatchIndex + 1}`,
      });
    }
  }

  return violations;
}

function collectWebResponsiveManualMatrixConfigViolations(workspaceRoot) {
  const configPath = path.join(
    workspaceRoot,
    WEB_RESPONSIVE_MANUAL_MATRIX_CONFIG_PATH,
  );
  if (!fs.existsSync(configPath)) {
    return [];
  }

  const relativeFile = WEB_RESPONSIVE_MANUAL_MATRIX_CONFIG_PATH.replaceAll(
    path.sep,
    "/",
  );
  let parsedConfig;
  try {
    parsedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    return [
      {
        file: relativeFile,
        line: 1,
        snippet: "invalid-json:responsiveManualMatrix.json",
      },
    ];
  }

  if (!parsedConfig || typeof parsedConfig !== "object" || Array.isArray(parsedConfig)) {
    return [
      {
        file: relativeFile,
        line: 1,
        snippet: "invalid-config-shape:expected-object",
      },
    ];
  }

  const violations = [];
  const requiredViewportWidths = [360, 390, 768, 1024, 1280, 1440, 1920];
  const {
    viewportWidths,
    userRoutes,
    adminRoutes,
  } = parsedConfig;

  if (!Array.isArray(viewportWidths)) {
    violations.push({
      file: relativeFile,
      line: 1,
      snippet: "invalid-viewport-widths:expected-array",
    });
  } else {
    if (
      viewportWidths.some(
        (width) => typeof width !== "number" || !Number.isFinite(width),
      )
    ) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: "invalid-viewport-width-entry:non-numeric",
      });
    }

    if (new Set(viewportWidths).size !== viewportWidths.length) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: "duplicate-viewport-widths",
      });
    }

    if (
      viewportWidths.length !== requiredViewportWidths.length ||
      viewportWidths.some(
        (width, index) => width !== requiredViewportWidths[index],
      )
    ) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: "viewport-width-mismatch:expected-plan-matrix",
      });
    }
  }

  if (!userRoutes || typeof userRoutes !== "object" || Array.isArray(userRoutes)) {
    violations.push({
      file: relativeFile,
      line: 1,
      snippet: "invalid-user-routes:expected-object",
    });
  } else {
    const userRouteArrayFields = [
      "auth",
      "shell",
      "projectTabs",
    ];
    for (const field of userRouteArrayFields) {
      const fieldValue = userRoutes[field];
      if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
        violations.push({
          file: relativeFile,
          line: 1,
          snippet: `invalid-user-routes-field:${field}`,
        });
        continue;
      }

      if (
        fieldValue.some(
          (value) => typeof value !== "string" || value.trim().length === 0,
        )
      ) {
        violations.push({
          file: relativeFile,
          line: 1,
          snippet: `invalid-user-routes-field-entry:${field}`,
        });
      }

      if (new Set(fieldValue).size !== fieldValue.length) {
        violations.push({
          file: relativeFile,
          line: 1,
          snippet: `duplicate-user-routes-field-entry:${field}`,
        });
      }
    }

    const userRoutePatternFields = [
      "projectDocumentRoutePattern",
      "projectGraphRoutePattern",
    ];
    for (const field of userRoutePatternFields) {
      const patternValue = userRoutes[field];
      if (typeof patternValue !== "string" || patternValue.trim().length === 0) {
        violations.push({
          file: relativeFile,
          line: 1,
          snippet: `invalid-user-route-pattern:${field}`,
        });
        continue;
      }

      try {
        new RegExp(patternValue);
      } catch (error) {
        violations.push({
          file: relativeFile,
          line: 1,
          snippet: `invalid-user-route-pattern-regex:${field}`,
        });
      }
    }
  }

  if (!Array.isArray(adminRoutes) || adminRoutes.length === 0) {
    violations.push({
      file: relativeFile,
      line: 1,
      snippet: "invalid-admin-routes:expected-non-empty-array",
    });
  } else {
    if (
      adminRoutes.some(
        (route) => typeof route !== "string" || route.trim().length === 0,
      )
    ) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: "invalid-admin-route-entry",
      });
    }

    if (new Set(adminRoutes).size !== adminRoutes.length) {
      violations.push({
        file: relativeFile,
        line: 1,
        snippet: "duplicate-admin-routes",
      });
    }
  }

  return violations;
}

function cleanupWebJsMirrors(workspaceRoot) {
  const mirrors = collectWebJsMirrors(workspaceRoot);
  for (const mirror of mirrors) {
    fs.rmSync(path.join(workspaceRoot, mirror.file));
  }
  return mirrors;
}

function runQualityGuards(options = {}) {
  const {
    workspaceRoot = process.cwd(),
    autoCleanWebJsMirrors = true,
  } = options;
  const fileCache = new Map();

  let removedWebJsMirrors = [];
  if (autoCleanWebJsMirrors) {
    removedWebJsMirrors = cleanupWebJsMirrors(workspaceRoot);
    fileCache.clear();
  }

  const allViolations = [];

  for (const check of checks) {
    const violations = runGuardCheck(check, workspaceRoot, fileCache);
    if (violations.length > 0) {
      allViolations.push({ check, violations });
    }
  }

  const jsMirrorViolations = collectWebJsMirrors(workspaceRoot);
  if (jsMirrorViolations.length > 0) {
    allViolations.push({ check: webJsMirrorCheck, violations: jsMirrorViolations });
  }

  const webJsSourceViolations = collectWebSourceJsFiles(workspaceRoot, fileCache);
  if (webJsSourceViolations.length > 0) {
    allViolations.push({
      check: webJsSourceCheck,
      violations: webJsSourceViolations,
    });
  }

  const webStylePropViolations = collectWebStylePropViolations(
    workspaceRoot,
    fileCache,
  );
  if (webStylePropViolations.length > 0) {
    allViolations.push({
      check: webStylePropCheck,
      violations: webStylePropViolations,
    });
  }

  const webCssViewportFallbackViolations =
    collectWebCssViewportFallbackViolations(workspaceRoot, fileCache);
  if (webCssViewportFallbackViolations.length > 0) {
    allViolations.push({
      check: webCssViewportFallbackCheck,
      violations: webCssViewportFallbackViolations,
    });
  }

  const webLayoutMobileBreakpointLiteralViolations =
    collectWebLayoutMobileBreakpointLiteralViolations(workspaceRoot);
  if (webLayoutMobileBreakpointLiteralViolations.length > 0) {
    allViolations.push({
      check: webLayoutMobileBreakpointLiteralCheck,
      violations: webLayoutMobileBreakpointLiteralViolations,
    });
  }

  const webResponsiveTestScriptCoverageViolations =
    collectWebResponsiveTestScriptCoverageViolations(workspaceRoot);
  if (webResponsiveTestScriptCoverageViolations.length > 0) {
    allViolations.push({
      check: webResponsiveTestScriptCoverageCheck,
      violations: webResponsiveTestScriptCoverageViolations,
    });
  }

  const webLayoutTestViewportLiteralViolations =
    collectWebLayoutTestViewportLiteralViolations(workspaceRoot);
  if (webLayoutTestViewportLiteralViolations.length > 0) {
    allViolations.push({
      check: webLayoutTestViewportLiteralCheck,
      violations: webLayoutTestViewportLiteralViolations,
    });
  }

  const webLayoutTestBreakpointLiteralViolations =
    collectWebLayoutTestBreakpointLiteralViolations(workspaceRoot);
  if (webLayoutTestBreakpointLiteralViolations.length > 0) {
    allViolations.push({
      check: webLayoutTestBreakpointLiteralCheck,
      violations: webLayoutTestBreakpointLiteralViolations,
    });
  }

  const webLayoutTestInlineViewportArrayViolations =
    collectWebLayoutTestInlineViewportArrayViolations(workspaceRoot);
  if (webLayoutTestInlineViewportArrayViolations.length > 0) {
    allViolations.push({
      check: webLayoutTestInlineViewportArrayCheck,
      violations: webLayoutTestInlineViewportArrayViolations,
    });
  }

  const webLayoutTestRouteMatrixCoverageViolations =
    collectWebLayoutTestRouteMatrixCoverageViolations(workspaceRoot);
  if (webLayoutTestRouteMatrixCoverageViolations.length > 0) {
    allViolations.push({
      check: webLayoutTestRouteMatrixCoverageCheck,
      violations: webLayoutTestRouteMatrixCoverageViolations,
    });
  }

  const webResponsiveTargetConfigViolations =
    collectWebResponsiveTargetConfigViolations(workspaceRoot);
  if (webResponsiveTargetConfigViolations.length > 0) {
    allViolations.push({
      check: webResponsiveTargetConfigCheck,
      violations: webResponsiveTargetConfigViolations,
    });
  }

  const webResponsiveManualMatrixConfigViolations =
    collectWebResponsiveManualMatrixConfigViolations(workspaceRoot);
  if (webResponsiveManualMatrixConfigViolations.length > 0) {
    allViolations.push({
      check: webResponsiveManualMatrixConfigCheck,
      violations: webResponsiveManualMatrixConfigViolations,
    });
  }

  return { removedWebJsMirrors, allViolations };
}

module.exports = {
  checks,
  webJsMirrorCheck,
  webJsSourceCheck,
  webStylePropCheck,
  webCssViewportFallbackCheck,
  webLayoutMobileBreakpointLiteralCheck,
  webResponsiveTestScriptCoverageCheck,
  webLayoutTestViewportLiteralCheck,
  webLayoutTestBreakpointLiteralCheck,
  webLayoutTestInlineViewportArrayCheck,
  webLayoutTestRouteMatrixCoverageCheck,
  webResponsiveTargetConfigCheck,
  webResponsiveManualMatrixConfigCheck,
  DEFAULT_REQUIRED_WEB_RESPONSIVE_TEST_TARGETS,
  WEB_RESPONSIVE_TARGETS_CONFIG_PATH,
  WEB_RESPONSIVE_MANUAL_MATRIX_CONFIG_PATH,
  readRequiredWebResponsiveTestTargets,
  runQualityGuards,
  lineForIndex,
};
