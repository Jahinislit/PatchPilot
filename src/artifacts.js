import { generatePatchFromReview } from "./patchGenerator.js";

export function buildMarkdownReview(review) {
  const source = review.source?.type === "github_pr"
    ? `${review.source.owner}/${review.source.repo}#${review.source.pullNumber}`
    : "Pasted diff";

  const lines = [
    "# PatchPilot Review",
    "",
    `**Source:** ${source}`,
    `**Risk:** ${review.riskLevel} (${review.riskScore}/100)`,
    `**Provider:** ${review.provider || "unknown"}${review.model ? ` (${review.model})` : ""}`,
    "",
    "## Summary",
    "",
    review.summary || "No summary generated.",
    "",
    "## Findings",
    ""
  ];

  if (!review.findings?.length) {
    lines.push("No findings.");
  } else {
    for (const finding of review.findings) {
      lines.push(
        `### ${finding.severity.toUpperCase()} - ${finding.title}`,
        "",
        `- **File:** \`${finding.file}:${finding.line}\``,
        `- **Category:** ${finding.category}`,
        `- **Comment:** ${finding.comment}`,
        `- **Suggestion:** ${finding.suggestion}`,
        ""
      );
    }
  }

  lines.push("## Suggested Tests", "");
  for (const test of review.suggestedTests || []) {
    lines.push(`- ${test}`);
  }

  lines.push("", "## Patch Hints", "");
  for (const patch of review.patchSuggestions || []) {
    lines.push(`- \`${patch.file}:${patch.line}\` - ${patch.patchHint}`);
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function buildGitHubComments(review) {
  return (review.findings || []).map((finding) => ({
    path: finding.file,
    line: finding.line,
    side: "RIGHT",
    severity: finding.severity,
    category: finding.category,
    body: [
      `**${finding.title}**`,
      "",
      finding.comment,
      "",
      `Suggestion: ${finding.suggestion}`,
      "",
      `_PatchPilot: ${finding.severity} ${finding.category}_`
    ].join("\n")
  }));
}

export function buildPatchPlan(review) {
  const lines = [
    "# PatchPilot Patch Plan",
    "",
    "This is a safe patch plan, not an auto-applied code change. Review each item before editing code.",
    ""
  ];

  if (!review.patchSuggestions?.length) {
    lines.push("No patch hints generated.");
  } else {
    for (const item of review.patchSuggestions) {
      lines.push(
        `## ${item.title}`,
        "",
        `- File: \`${item.file}:${item.line}\``,
        `- Patch hint: ${item.patchHint}`,
        ""
      );
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function buildReviewArtifacts(review, sourceDiff = "") {
  return {
    markdown: buildMarkdownReview(review),
    comments: buildGitHubComments(review),
    patchPlan: buildPatchPlan(review),
    generatedPatch: generatePatchFromReview(sourceDiff, review)
  };
}
