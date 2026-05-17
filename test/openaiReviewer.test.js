import test from "node:test";
import assert from "node:assert/strict";

import { reviewDiffWithOpenAI } from "../src/ai/openaiReviewer.js";

test("reviewDiffWithOpenAI falls back when API key is absent", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = await reviewDiffWithOpenAI("diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -1,1 +1,2 @@\n+const token = \"abc\";");

  assert.equal(result.mode, "local");
  assert.equal(result.provider, "deterministic");
  assert.match(result.notice, /OPENAI_API_KEY/);

  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  }
});
