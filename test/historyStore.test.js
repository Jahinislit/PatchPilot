import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { HistoryStore } from "../src/historyStore.js";

test("HistoryStore saves, lists, and retrieves reviews", async () => {
  const dir = await mkdtemp(join(tmpdir(), "patchpilot-"));
  const store = new HistoryStore(join(dir, "reviews.json"));

  const created = await store.createReview({
    inputType: "diff",
    inputValue: "diff --git a/a.js b/a.js",
    result: {
      riskLevel: "LOW",
      riskScore: 10,
      findings: [],
      provider: "deterministic"
    }
  });

  const list = await store.listReviews();
  const retrieved = await store.getReview(created.id);

  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.id);
  assert.equal(retrieved.result.riskScore, 10);

  await rm(dir, { recursive: true, force: true });
});
