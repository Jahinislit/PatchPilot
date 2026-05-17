import { createEmptyReview, reviewDiff } from "../reviewer.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export async function reviewDiffWithOpenAI(diffText, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ...reviewDiff(diffText),
      mode: "local",
      provider: "deterministic",
      notice: "OPENAI_API_KEY is not set, so PatchPilot used the local deterministic reviewer."
    };
  }

  if (!diffText.trim()) {
    return {
      ...createEmptyReview(),
      mode: "ai",
      provider: "openai"
    };
  }

  const model = options.model || process.env.OPENAI_MODEL || "gpt-5.1";
  const localReview = reviewDiff(diffText);

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt()
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildUserPrompt(diffText, localReview, options.context)
            }
          ]
        }
      ],
      text: {
        format: reviewSchema()
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI review failed with ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  const parsed = extractStructuredOutput(payload);
  return normalizeAiReview(parsed, localReview, model);
}

function systemPrompt() {
  return [
    "You are PatchPilot, a senior code reviewer.",
    "Review only the changed lines and nearby context from a unified diff.",
    "Focus on concrete bugs, security issues, performance risks, maintainability issues, and missing tests.",
    "Avoid generic advice. Every finding must be actionable and tied to a file and line.",
    "Return JSON matching the provided schema."
  ].join("\n");
}

function buildUserPrompt(diffText, localReview, context = "") {
  return [
    "Review this pull request diff.",
    "",
    "Repository context supplied by the user:",
    context?.trim() || "No additional repository context supplied.",
    "",
    "Deterministic pre-scan findings:",
    JSON.stringify(localReview, null, 2),
    "",
    "Unified diff:",
    diffText
  ].join("\n");
}

function reviewSchema() {
  return {
    type: "json_schema",
    name: "patchpilot_review",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "riskScore", "riskLevel", "findings", "suggestedTests", "patchSuggestions"],
      properties: {
        summary: { type: "string" },
        riskScore: { type: "integer", minimum: 0, maximum: 100 },
        riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        findings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["file", "line", "severity", "category", "title", "comment", "suggestion"],
            properties: {
              file: { type: "string" },
              line: { type: "integer", minimum: 1 },
              severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
              category: { type: "string", enum: ["bug", "security", "performance", "maintainability", "tests"] },
              title: { type: "string" },
              comment: { type: "string" },
              suggestion: { type: "string" }
            }
          }
        },
        suggestedTests: {
          type: "array",
          items: { type: "string" }
        },
        patchSuggestions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["file", "line", "title", "patchHint"],
            properties: {
              file: { type: "string" },
              line: { type: "integer", minimum: 1 },
              title: { type: "string" },
              patchHint: { type: "string" }
            }
          }
        }
      }
    }
  };
}

function extractStructuredOutput(payload) {
  if (payload.output_parsed) {
    return payload.output_parsed;
  }

  if (payload.output_text) {
    return JSON.parse(payload.output_text);
  }

  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.parsed) {
        return content.parsed;
      }
      if (content.text) {
        return JSON.parse(content.text);
      }
    }
  }

  throw new Error("OpenAI response did not include structured review output.");
}

function normalizeAiReview(aiReview, localReview, model) {
  return {
    summary: aiReview.summary || localReview.summary,
    riskScore: clamp(Number(aiReview.riskScore || localReview.riskScore), 0, 100),
    riskLevel: aiReview.riskLevel || localReview.riskLevel,
    filesReviewed: localReview.filesReviewed,
    findings: Array.isArray(aiReview.findings) ? aiReview.findings : localReview.findings,
    suggestedTests: Array.isArray(aiReview.suggestedTests) ? aiReview.suggestedTests : localReview.suggestedTests,
    patchSuggestions: Array.isArray(aiReview.patchSuggestions) ? aiReview.patchSuggestions : localReview.patchSuggestions,
    mode: "ai",
    provider: "openai",
    model
  };
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
