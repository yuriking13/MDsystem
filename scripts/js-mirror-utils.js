const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SOURCE_EXTENSIONS = [".ts", ".tsx"];

function collectJsMirrorFiles(rootDir, sourceExtensions = DEFAULT_SOURCE_EXTENSIONS) {
  const mirrors = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    if (!currentDir || !fs.existsSync(currentDir)) {
      continue;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile() || path.extname(entry.name) !== ".js") {
        continue;
      }

      const basePath = fullPath.slice(0, -3);
      const hasSourceSibling = sourceExtensions.some((extension) =>
        fs.existsSync(`${basePath}${extension}`),
      );

      if (hasSourceSibling) {
        mirrors.push(fullPath);
      }
    }
  }

  return mirrors;
}

module.exports = {
  collectJsMirrorFiles,
};
