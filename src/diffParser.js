export function parseUnifiedDiff(diffText) {
  const files = [];
  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  let currentFile = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (currentFile) {
        files.push(currentFile);
      }
      currentFile = createFileFromDiffHeader(line);
      continue;
    }

    if (!currentFile && line.startsWith("+++ ")) {
      currentFile = {
        oldPath: "unknown",
        newPath: normalizePath(line.slice(4)),
        hunks: []
      };
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith("--- ")) {
      currentFile.oldPath = normalizePath(line.slice(4));
      continue;
    }

    if (line.startsWith("+++ ")) {
      currentFile.newPath = normalizePath(line.slice(4));
      continue;
    }

    if (line.startsWith("@@")) {
      const hunk = parseHunkHeader(line);
      oldLine = hunk.oldStart;
      newLine = hunk.newStart;
      currentFile.hunks.push({ header: line, changes: [] });
      continue;
    }

    const activeHunk = currentFile.hunks[currentFile.hunks.length - 1];
    if (!activeHunk) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      activeHunk.changes.push({
        type: "added",
        oldLine: null,
        newLine,
        content: line.slice(1)
      });
      newLine += 1;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      activeHunk.changes.push({
        type: "removed",
        oldLine,
        newLine: null,
        content: line.slice(1)
      });
      oldLine += 1;
      continue;
    }

    activeHunk.changes.push({
      type: "context",
      oldLine,
      newLine,
      content: line.startsWith(" ") ? line.slice(1) : line
    });
    oldLine += 1;
    newLine += 1;
  }

  if (currentFile) {
    files.push(currentFile);
  }

  return files.filter((file) => file.hunks.length > 0);
}

function createFileFromDiffHeader(line) {
  const parts = line.split(" ");
  const oldPath = normalizePath(parts[2] || "unknown");
  const newPath = normalizePath(parts[3] || oldPath);

  return {
    oldPath,
    newPath,
    hunks: []
  };
}

function normalizePath(path) {
  return path.replace(/^a\//, "").replace(/^b\//, "").trim();
}

function parseHunkHeader(line) {
  const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (!match) {
    return { oldStart: 1, newStart: 1 };
  }

  return {
    oldStart: Number(match[1]),
    newStart: Number(match[2])
  };
}

