const diffInput = document.querySelector("#diffInput");
const reviewButton = document.querySelector("#reviewButton");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");
const reviewPrButton = document.querySelector("#reviewPrButton");
const refreshHistoryButton = document.querySelector("#refreshHistoryButton");
const copyMarkdownButton = document.querySelector("#copyMarkdownButton");
const copyCommentsButton = document.querySelector("#copyCommentsButton");
const downloadPatchButton = document.querySelector("#downloadPatchButton");
const downloadGeneratedPatchButton = document.querySelector("#downloadGeneratedPatchButton");
const riskBadge = document.querySelector("#riskBadge");
const modeBadge = document.querySelector("#modeBadge");
const providerSelect = document.querySelector("#providerSelect");
const prUrlInput = document.querySelector("#prUrlInput");
const contextInput = document.querySelector("#contextInput");
const summary = document.querySelector("#summary");
const findings = document.querySelector("#findings");
const historyList = document.querySelector("#historyList");
const testsList = document.querySelector("#testsList");
const patchList = document.querySelector("#patchList");
const metricRisk = document.querySelector("#metricRisk");
const metricFindings = document.querySelector("#metricFindings");
const metricTests = document.querySelector("#metricTests");
const filterChips = document.querySelectorAll(".filter-chip");

let currentReviewId = null;
let currentFilter = "all";
let currentResult = null;

const sampleDiff = `diff --git a/src/auth.js b/src/auth.js
index 1234567..890abcd 100644
--- a/src/auth.js
+++ b/src/auth.js
@@ -1,5 +1,12 @@
 export async function login(email, password) {
+  const apiKey = "sk_live_123456";
+  const response = await fetch("/api/login", {
+    method: "POST",
+    body: JSON.stringify({ email, password, apiKey })
+  });
+  return response.json();
 }

 export function renderMessage(message) {
+  document.querySelector("#message").innerHTML = message;
 }
diff --git a/src/jobs.js b/src/jobs.js
index 2222222..3333333 100644
--- a/src/jobs.js
+++ b/src/jobs.js
@@ -4,4 +4,8 @@ export function startPolling() {
+  setInterval(() => {
+    console.log("polling");
+  }, 1000);
+  // TODO: stop polling when user logs out
 }`;

sampleButton.addEventListener("click", () => {
  diffInput.value = sampleDiff;
  contextInput.value = "Node/JavaScript app. Auth and DOM rendering changes are high risk. Prefer explicit error handling and no hardcoded credentials.";
});

clearButton.addEventListener("click", () => {
  prUrlInput.value = "";
  contextInput.value = "";
  diffInput.value = "";
  renderEmpty();
});

reviewButton.addEventListener("click", async () => {
  await runReviewRequest(
    "/api/review",
    { diff: diffInput.value, provider: providerSelect.value, context: contextInput.value },
    reviewButton,
    "Review Diff"
  );
});

reviewPrButton.addEventListener("click", async () => {
  await runReviewRequest(
    "/api/review-pr",
    { url: prUrlInput.value, provider: providerSelect.value, context: contextInput.value },
    reviewPrButton,
    "Review PR URL"
  );
});

refreshHistoryButton.addEventListener("click", loadHistory);
copyMarkdownButton.addEventListener("click", () => copyArtifact("markdown", copyMarkdownButton, "Copy Markdown"));
copyCommentsButton.addEventListener("click", () => copyArtifact("comments", copyCommentsButton, "Copy Comments"));
downloadPatchButton.addEventListener("click", downloadPatchPlan);
downloadGeneratedPatchButton.addEventListener("click", downloadGeneratedPatch);
filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    currentFilter = chip.dataset.filter;
    filterChips.forEach((item) => item.classList.toggle("active", item === chip));
    renderFindings(currentResult?.findings || []);
  });
});

async function runReviewRequest(endpoint, payload, button, label) {
  button.disabled = true;
  button.textContent = "Reviewing...";
  setBusyState(true);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Review failed");
    }
    renderResult(result);
    await loadHistory();
  } catch (error) {
    summary.textContent = error.message || "Review failed. Check that the local server is still running.";
    summary.classList.remove("empty");
  } finally {
    button.disabled = false;
    button.textContent = label;
    setBusyState(false);
  }
}

function renderResult(result) {
  currentResult = result;
  currentReviewId = result.reviewId || currentReviewId;
  riskBadge.textContent = `${result.riskLevel} Risk - ${result.riskScore}/100`;
  riskBadge.dataset.level = String(result.riskLevel || "").toLowerCase();
  modeBadge.textContent = `${result.provider || "local"}${result.model ? ` - ${result.model}` : ""}`;
  riskBadge.className = "risk-badge";

  const source = result.source ? ` Source: ${result.source.owner}/${result.source.repo}#${result.source.pullNumber}.` : "";
  summary.textContent = `${result.notice ? `${result.summary} ${result.notice}` : result.summary}${source}`;
  summary.classList.remove("empty");

  metricRisk.textContent = `${result.riskScore}/100`;
  metricFindings.textContent = String(result.findings?.length || 0);
  metricTests.textContent = String(result.suggestedTests?.length || 0);
  renderFindings(result.findings || []);
  renderList(testsList, result.suggestedTests || []);
  renderList(
    patchList,
    (result.patchSuggestions || []).map((item) => `${item.file}:${item.line} - ${item.patchHint}`)
  );
}

function renderFindings(items) {
  findings.innerHTML = "";
  const visibleFindings = currentFilter === "all" ? items : items.filter((finding) => finding.severity === currentFilter);

  for (const finding of visibleFindings) {
    const card = document.createElement("article");
    card.className = `finding ${finding.severity}`;
    card.innerHTML = `
      <div class="finding-title">
        <strong>${escapeHtml(finding.title)}</strong>
        <span class="finding-meta">${escapeHtml(finding.severity.toUpperCase())} - ${escapeHtml(finding.category)} - ${escapeHtml(finding.file)}:${finding.line}</span>
      </div>
      <p>${escapeHtml(finding.comment)}</p>
      <p><strong>Suggestion:</strong> ${escapeHtml(finding.suggestion)}</p>
    `;
    findings.appendChild(card);
  }

  if (!items.length) {
    findings.innerHTML = `<div class="summary empty">No findings detected for this review.</div>`;
    return;
  }

  if (!visibleFindings.length) {
    findings.innerHTML = `<div class="summary empty">No ${currentFilter} findings in this review.</div>`;
  }
}

function renderList(element, items) {
  element.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  }
}

function renderEmpty() {
  currentReviewId = null;
  currentResult = null;
  riskBadge.textContent = "Idle";
  modeBadge.textContent = providerSelect.value === "openai" ? "OpenAI" : "Local";
  summary.textContent = "Run a review to see the PR summary.";
  summary.classList.add("empty");
  findings.innerHTML = "";
  testsList.innerHTML = "";
  patchList.innerHTML = "";
  metricRisk.textContent = "-";
  metricFindings.textContent = "-";
  metricTests.textContent = "-";
}

async function loadHistory() {
  try {
    const response = await fetch("/api/history?limit=20");
    const payload = await response.json();
    renderHistory(payload.reviews || []);
  } catch {
    historyList.innerHTML = `<div class="history-empty">Could not load review history.</div>`;
  }
}

function renderHistory(reviews) {
  historyList.innerHTML = "";

  if (!reviews.length) {
    historyList.innerHTML = `<div class="history-empty">No reviews saved yet.</div>`;
    return;
  }

  for (const review of reviews) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.dataset.reviewId = review.id;
    button.innerHTML = `
      <span class="history-title">${escapeHtml(historyTitle(review))}</span>
      <span class="history-meta">${escapeHtml(review.riskLevel)} - ${review.riskScore}/100 - ${review.findingCount} finding(s)</span>
      <span class="history-meta">${escapeHtml(new Date(review.createdAt).toLocaleString())}</span>
    `;
    button.addEventListener("click", () => loadReview(review.id));
    historyList.appendChild(button);
  }
}

async function loadReview(id) {
  const response = await fetch(`/api/reviews/${encodeURIComponent(id)}`);
  const review = await response.json();
  if (!response.ok) {
    summary.textContent = review.error || "Review not found.";
    summary.classList.remove("empty");
    return;
  }
  currentReviewId = review.id;
  document.querySelectorAll(".history-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.reviewId === id);
  });
  renderResult({ ...review.result, reviewId: review.id });
}

async function getArtifacts() {
  if (!currentReviewId) {
    throw new Error("Run or select a saved review first.");
  }

  const response = await fetch(`/api/artifacts/${encodeURIComponent(currentReviewId)}`);
  const artifacts = await response.json();
  if (!response.ok) {
    throw new Error(artifacts.error || "Could not load artifacts.");
  }
  return artifacts;
}

async function copyArtifact(kind, button, label) {
  try {
    const artifacts = await getArtifacts();
    const value = kind === "comments" ? JSON.stringify(artifacts.comments, null, 2) : artifacts[kind];
    await navigator.clipboard.writeText(value);
    button.textContent = "Copied";
    showToast("Copied artifact to clipboard.");
  } catch (error) {
    summary.textContent = error.message;
    summary.classList.remove("empty");
  } finally {
    setTimeout(() => {
      button.textContent = label;
    }, 1200);
  }
}

async function downloadPatchPlan() {
  try {
    const artifacts = await getArtifacts();
    downloadTextFile("patchpilot-patch-plan.md", artifacts.patchPlan, "text/markdown");
    showToast("Patch plan downloaded.");
  } catch (error) {
    summary.textContent = error.message;
    summary.classList.remove("empty");
  }
}

async function downloadGeneratedPatch() {
  try {
    const artifacts = await getArtifacts();
    if (!artifacts.generatedPatch) {
      throw new Error("No safe generated patch is available for this review.");
    }
    downloadTextFile("patchpilot-generated.patch", artifacts.generatedPatch, "text/x-patch");
    showToast("Generated patch downloaded.");
  } catch (error) {
    summary.textContent = error.message;
    summary.classList.remove("empty");
  }
}

function downloadTextFile(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function setBusyState(isBusy) {
  document.body.classList.toggle("busy", isBusy);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  summary.insertAdjacentElement("afterend", toast);
  setTimeout(() => toast.remove(), 1800);
}

function historyTitle(review) {
  if (review.source?.type === "github_pr") {
    return `${review.source.owner}/${review.source.repo}#${review.source.pullNumber}`;
  }
  if (review.inputType === "github_pr") {
    return review.inputValue;
  }
  return "Pasted diff review";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadHistory();
