const fs = require("node:fs");
const path = require("node:path");

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

function collectWebJsMirrors(workspaceRoot, fileCache) {
  const webSrcRoot = path.join(workspaceRoot, "apps/web/src");
  const jsFiles = getCachedFiles(webSrcRoot, new Set([".js"]), fileCache);

  const violations = [];
  for (const jsFilePath of jsFiles) {
    const modulePath = jsFilePath.slice(0, -3);
    const hasTypeScriptSibling =
      fs.existsSync(`${modulePath}.ts`) || fs.existsSync(`${modulePath}.tsx`);

    if (!hasTypeScriptSibling) {
      continue;
    }

    violations.push({
      file: path.relative(workspaceRoot, jsFilePath),
      line: 1,
      snippet: "js-mirror-file",
    });
  }

  return violations;
}

function cleanupWebJsMirrors(workspaceRoot, fileCache) {
  const mirrors = collectWebJsMirrors(workspaceRoot, fileCache);
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
    removedWebJsMirrors = cleanupWebJsMirrors(workspaceRoot, fileCache);
    fileCache.clear();
  }

  const allViolations = [];

  for (const check of checks) {
    const violations = runGuardCheck(check, workspaceRoot, fileCache);
    if (violations.length > 0) {
      allViolations.push({ check, violations });
    }
  }

  const jsMirrorViolations = collectWebJsMirrors(workspaceRoot, fileCache);
  if (jsMirrorViolations.length > 0) {
    allViolations.push({ check: webJsMirrorCheck, violations: jsMirrorViolations });
  }

  return { removedWebJsMirrors, allViolations };
}

module.exports = {
  checks,
  webJsMirrorCheck,
  runQualityGuards,
  lineForIndex,
};
