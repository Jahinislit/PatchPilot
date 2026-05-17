import test from "node:test";
import assert from "node:assert/strict";

import { reviewDiff } from "../src/reviewer.js";
import { runReview } from "../src/reviewService.js";

test("reviewDiff flags hardcoded secrets and unsafe HTML", () => {
  const diff = `diff --git a/src/auth.js b/src/auth.js
--- a/src/auth.js
+++ b/src/auth.js
@@ -1,2 +1,4 @@
 export function render(message) {
+  const token = "abc123";
+  element.innerHTML = message;
 }`;

  const result = reviewDiff(diff);

  assert.equal(result.filesReviewed, 1);
  assert.equal(result.riskLevel, "HIGH");
  assert.ok(result.findings.some((finding) => finding.title === "Possible hardcoded secret"));
  assert.ok(result.findings.some((finding) => finding.title === "Potential XSS sink"));
  assert.ok(result.suggestedTests.length > 0);
});

test("runReview returns local provider metadata by default", async () => {
  const result = await runReview("");

  assert.equal(result.mode, "local");
  assert.equal(result.provider, "deterministic");
});
