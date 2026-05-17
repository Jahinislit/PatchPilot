import { parseUnifiedDiff } from "./diffParser.js";

export function generatePatchFromReview(diffText, review) {
  if (!diffText?.trim()) {
    return "";
  }

  const files = parseUnifiedDiff(diffText);
  const replacements = collectReplacements(files, review);

  if (!replacements.length) {
    return "";
  }

  const lines = [];
  for (const replacement of replacements) {
    lines.push(
      `diff --git a/${replacement.file} b/${replacement.file}`,
      `--- a/${replacement.file}`,
      `+++ b/${replacement.file}`,
      `@@ -${replacement.line},1 +${replacement.line},1 @@`,
      `-${replacement.before}`,
      `+${replacement.after}`
    );
  }

  return lines.join("\n") + "\n";
}

function collectReplacements(files, review) {
  const findings = review.findings || [];
  const replacements = [];

  for (const finding of findings) {
    const changedLine = findAddedLine(files, finding.file, finding.line);
    if (!changedLine) {
      continue;
    }

    const replacement = buildReplacement(finding, changedLine.content);
    if (!replacement || replacement === changedLine.content) {
      continue;
    }

    replacements.push({
      file: finding.file,
      line: finding.line,
      before: changedLine.content,
      after: replacement
    });
  }

  return dedupeReplacements(replacements);
}

function findAddedLine(files, filePath, lineNumber) {
  for (const file of files) {
    if (file.newPath !== filePath) {
      continue;
    }

    for (const hunk of file.hunks) {
      const match = hunk.changes.find((change) => change.type === "added" && change.newLine === lineNumber);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function buildReplacement(finding, line) {
  if (finding.title === "Potential XSS sink") {
    return line.replace(".innerHTML", ".textContent");
  }

  if (finding.title === "Possible hardcoded secret") {
    return replaceHardcodedSecret(line);
  }

  if (finding.title === "Swallowed exception" && /catch\s*\(([^)]*)\)\s*{\s*}/.test(line)) {
    const errorName = /catch\s*\(([^)]*)\)/.exec(line)?.[1]?.trim() || "error";
    return line.replace(/{\s*}/, `{ throw ${errorName}; }`);
  }

  return null;
}

function replaceHardcodedSecret(line) {
  const assignment = /(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"]).*?\3/.exec(line);
  if (!assignment) {
    return null;
  }

  const variableName = assignment[2];
  const envName = toEnvName(variableName);
  return line.replace(assignment[0], `${assignment[1]} ${variableName} = process.env.${envName}`);
}

function toEnvName(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();
}

function dedupeReplacements(replacements) {
  const seen = new Set();
  return replacements.filter((replacement) => {
    const key = `${replacement.file}:${replacement.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

