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
    const matcher = /innerWidth\s*[<>]=?/g;
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

  return { removedWebJsMirrors, allViolations };
}

module.exports = {
  checks,
  webJsMirrorCheck,
  webJsSourceCheck,
  webStylePropCheck,
  webCssViewportFallbackCheck,
  webLayoutMobileBreakpointLiteralCheck,
  runQualityGuards,
  lineForIndex,
};
