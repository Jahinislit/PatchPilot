import { SeverityRank } from "./models.js";
import { parseUnifiedDiff } from "./diffParser.js";

export function reviewDiff(diffText) {
  const files = parseUnifiedDiff(diffText);
  const findings = files.flatMap((file) => reviewFile(file));
  const sortedFindings = findings.sort((a, b) => SeverityRank[b.severity] - SeverityRank[a.severity]);
  const riskScore = calculateRiskScore(sortedFindings, files);

  return {
    summary: buildSummary(files, sortedFindings, riskScore),
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    filesReviewed: files.length,
    findings: sortedFindings,
    suggestedTests: suggestTests(files, sortedFindings),
    patchSuggestions: suggestPatches(sortedFindings)
  };
}

export function createEmptyReview(message = "No reviewable unified diff content was found.") {
  return {
    summary: message,
    riskScore: 0,
    riskLevel: "LOW",
    filesReviewed: 0,
    findings: [],
    suggestedTests: ["Provide a unified diff so PatchPilot can review changed lines."],
    patchSuggestions: []
  };
}

function reviewFile(file) {
  const findings = [];

  for (const hunk of file.hunks) {
    for (const change of hunk.changes) {
      if (change.type !== "added") {
        continue;
      }

      const line = change.content.trim();
      const location = {
        file: file.newPath,
        line: change.newLine
      };

      if (/api[_-]?key|secret|password|token/i.test(line) && /=/.test(line) && !/process\.env|import\.meta\.env/.test(line)) {
        findings.push({
          ...location,
          severity: "critical",
          category: "security",
          title: "Possible hardcoded secret",
          comment: "This line appears to introduce a credential-like value directly in code. Move it to environment configuration or a secret manager.",
          suggestion: "Replace the literal value with an environment variable and add a validation check during startup."
        });
      }

      if (/catch\s*\([^)]*\)\s*{\s*}/.test(line) || /catch\s*\([^)]*\)\s*{\s*console\.log/.test(line)) {
        findings.push({
          ...location,
          severity: "high",
          category: "bug",
          title: "Swallowed exception",
          comment: "The error path does not preserve failure context. This can hide production bugs and make incidents hard to debug.",
          suggestion: "Log structured context and return or rethrow a meaningful error."
        });
      }

      if (/TODO|FIXME/.test(line)) {
        findings.push({
          ...location,
          severity: "low",
          category: "maintainability",
          title: "Unresolved marker added",
          comment: "This change adds a TODO/FIXME marker. Make sure it is tracked or resolved before merge.",
          suggestion: "Convert the TODO into a linked issue or finish the implementation in this PR."
        });
      }

      if (/setTimeout|setInterval/.test(line) && !/clearTimeout|clearInterval/.test(line)) {
        findings.push({
          ...location,
          severity: "medium",
          category: "performance",
          title: "Timer lifecycle needs cleanup",
          comment: "Timers can leak work when component or request lifecycles end without cleanup.",
          suggestion: "Store the timer handle and clear it in the appropriate cleanup path."
        });
      }

      if (/fetch\(|axios\./.test(line) && !/try|catch|timeout|AbortController/.test(line)) {
        findings.push({
          ...location,
          severity: "medium",
          category: "bug",
          title: "Network call lacks visible failure handling",
          comment: "The added network call does not show timeout, cancellation, or error handling in the changed line.",
          suggestion: "Wrap the call with timeout/error handling and surface a recoverable failure state."
        });
      }

      if (/SELECT\s+\*/i.test(line)) {
        findings.push({
          ...location,
          severity: "medium",
          category: "performance",
          title: "Broad database query",
          comment: "Selecting every column can increase payload size and accidentally expose fields that callers do not need.",
          suggestion: "Select only the required columns and keep sensitive fields out of the query result."
        });
      }

      if (/innerHTML\s*=/.test(line)) {
        findings.push({
          ...location,
          severity: "critical",
          category: "security",
          title: "Potential XSS sink",
          comment: "Assigning to innerHTML can execute untrusted markup if the value is user-controlled.",
          suggestion: "Use textContent or sanitize trusted HTML with a well-reviewed sanitizer."
        });
      }
    }
  }

  if (file.newPath.includes("auth") && !hasAddedTestFile(file, "auth")) {
    findings.push({
      file: file.newPath,
      line: firstAddedLine(file),
      severity: "medium",
      category: "tests",
      title: "Authentication change needs targeted tests",
      comment: "Authentication logic changed, but this diff does not include an obvious auth test file.",
      suggestion: "Add tests for successful auth, invalid credentials, expired tokens, and unauthorized access."
    });
  }

  return findings;
}

function hasAddedTestFile(file, keyword) {
  const path = file.newPath.toLowerCase();
  return path.includes(keyword) && (path.includes(".test.") || path.includes(".spec.") || path.includes("__tests__"));
}

function firstAddedLine(file) {
  for (const hunk of file.hunks) {
    const change = hunk.changes.find((item) => item.type === "added");
    if (change) {
      return change.newLine;
    }
  }
  return 1;
}

function calculateRiskScore(findings, files) {
  const issueScore = findings.reduce((total, finding) => total + SeverityRank[finding.severity], 0);
  const fileScore = Math.min(files.length * 4, 20);
  return Math.min(100, issueScore * 7 + fileScore);
}

function riskLevelFromScore(score) {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function buildSummary(files, findings, riskScore) {
  if (!files.length) {
    return "No reviewable unified diff content was found.";
  }

  if (!findings.length) {
    return `Reviewed ${files.length} file(s). No major deterministic issues were detected. Risk score: ${riskScore}/100.`;
  }

  const critical = findings.filter((finding) => finding.severity === "critical").length;
  const high = findings.filter((finding) => finding.severity === "high").length;
  return `Reviewed ${files.length} file(s) and found ${findings.length} issue(s), including ${critical} critical and ${high} high severity finding(s). Risk score: ${riskScore}/100.`;
}

function suggestTests(files, findings) {
  const tests = new Set();

  if (findings.some((finding) => finding.category === "security")) {
    tests.add("Add security regression tests for unsafe input, secret handling, and authorization boundaries.");
  }

  if (findings.some((finding) => finding.category === "bug")) {
    tests.add("Add failure-path tests for network errors, invalid inputs, and exception handling.");
  }

  if (files.some((file) => file.newPath.includes("auth"))) {
    tests.add("Add authentication tests for valid, invalid, expired, and unauthorized flows.");
  }

  if (files.some((file) => file.newPath.includes("api") || file.newPath.includes("route"))) {
    tests.add("Add API contract tests covering success, validation failure, and server error responses.");
  }

  if (!tests.size) {
    tests.add("Add regression tests around the changed behavior and edge cases introduced by this PR.");
  }

  return [...tests];
}

function suggestPatches(findings) {
  return findings.slice(0, 5).map((finding) => ({
    file: finding.file,
    line: finding.line,
    title: finding.title,
    patchHint: finding.suggestion
  }));
}
