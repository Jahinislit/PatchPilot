import test from "node:test";
import assert from "node:assert/strict";

import { parseUnifiedDiff } from "../src/diffParser.js";

test("parseUnifiedDiff extracts files, hunks, and added lines", () => {
  const diff = `diff --git a/src/auth.js b/src/auth.js
--- a/src/auth.js
+++ b/src/auth.js
@@ -1,2 +1,3 @@
 export function login() {
+  return true;
 }`;

  const files = parseUnifiedDiff(diff);

  assert.equal(files.length, 1);
  assert.equal(files[0].newPath, "src/auth.js");
  assert.equal(files[0].hunks.length, 1);
  assert.deepEqual(files[0].hunks[0].changes[1], {
    type: "added",
    oldLine: null,
    newLine: 2,
    content: "  return true;"
  });
});

