import test from "node:test";
import assert from "node:assert/strict";

import { buildGitHubComments, buildMarkdownReview, buildPatchPlan } from "../src/artifacts.js";

const review = {
  summary: "Found one risky change.",
  riskLevel: "HIGH",
  riskScore: 81,
  provider: "deterministic",
  findings: [
    {
      file: "src/auth.js",
      line: 12,
      severity: "critical",
      category: "security",
      title: "Possible hardcoded secret",
      comment: "A token-like value was added.",
      suggestion: "Move it to environment configuration."
    }
  ],
  suggestedTests: ["Add secret handling tests."],
  patchSuggestions: [
    {
      file: "src/auth.js",
      line: 12,
      title: "Possible hardcoded secret",
      patchHint: "Use process.env.AUTH_TOKEN."
    }
  ]
};

test("buildMarkdownReview exports review content", () => {
  const markdown = buildMarkdownReview(review);

  assert.match(markdown, /PatchPilot Review/);
  assert.match(markdown, /Possible hardcoded secret/);
  assert.match(markdown, /Add secret handling tests/);
});

test("buildGitHubComments exports file-level comments", () => {
  const comments = buildGitHubComments(review);

  assert.equal(comments.length, 1);
  assert.equal(comments[0].path, "src/auth.js");
  assert.equal(comments[0].line, 12);
});

test("buildPatchPlan exports safe patch guidance", () => {
  const patchPlan = buildPatchPlan(review);

  assert.match(patchPlan, /PatchPilot Patch Plan/);
  assert.match(patchPlan, /process.env.AUTH_TOKEN/);
});
