import test from "node:test";
import assert from "node:assert/strict";

import { parseGitHubPullRequestUrl } from "../src/github.js";

test("parseGitHubPullRequestUrl extracts PR metadata", () => {
  const result = parseGitHubPullRequestUrl("https://github.com/openai/openai-node/pull/123");

  assert.deepEqual(result, {
    owner: "openai",
    repo: "openai-node",
    pullNumber: "123",
    diffUrl: "https://github.com/openai/openai-node/pull/123.diff"
  });
});

test("parseGitHubPullRequestUrl rejects non-GitHub URLs", () => {
  assert.throws(() => parseGitHubPullRequestUrl("https://example.com/a/b/pull/1"), /github.com/);
});

