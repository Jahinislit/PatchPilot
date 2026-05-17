import test from "node:test";
import assert from "node:assert/strict";

import { generatePatchFromReview } from "../src/patchGenerator.js";

test("generatePatchFromReview creates patch for hardcoded secret and innerHTML", () => {
  const diff = `diff --git a/src/auth.js b/src/auth.js
--- a/src/auth.js
+++ b/src/auth.js
@@ -1,2 +1,4 @@
 export function render(message) {
+  const apiKey = "abc123";
+  element.innerHTML = message;
 }`;

  const review = {
    findings: [
      {
        file: "src/auth.js",
        line: 2,
        title: "Possible hardcoded secret"
      },
      {
        file: "src/auth.js",
        line: 3,
        title: "Potential XSS sink"
      }
    ]
  };

  const patch = generatePatchFromReview(diff, review);

  assert.match(patch, /process\.env\.API_KEY/);
  assert.match(patch, /element\.textContent = message/);
  assert.match(patch, /diff --git a\/src\/auth\.js b\/src\/auth\.js/);
});

test("generatePatchFromReview returns empty string when no safe replacement exists", () => {
  const diff = `diff --git a/src/a.js b/src/a.js
--- a/src/a.js
+++ b/src/a.js
@@ -1,1 +1,2 @@
+  fetch("/api/users");`;

  const patch = generatePatchFromReview(diff, {
    findings: [{ file: "src/a.js", line: 1, title: "Network call lacks visible failure handling" }]
  });

  assert.equal(patch, "");
});
