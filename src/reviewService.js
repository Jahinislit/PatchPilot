import { reviewDiffWithOpenAI } from "./ai/openaiReviewer.js";
import { reviewDiff } from "./reviewer.js";

export async function runReview(diffText, options = {}) {
  const provider = options.provider || process.env.PATCHPILOT_PROVIDER || "local";

  if (provider === "openai") {
    return reviewDiffWithOpenAI(diffText, options);
  }

  return {
    ...reviewDiff(diffText),
    mode: "local",
    provider: "deterministic",
    contextUsed: Boolean(options.context?.trim())
  };
}
