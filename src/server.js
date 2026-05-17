import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReviewArtifacts } from "./artifacts.js";
import { fetchPullRequestDiff } from "./github.js";
import { historyStore } from "./historyStore.js";
import { runReview } from "./reviewService.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 4173);

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/review") {
      const body = await readJson(request);
      const diffText = String(body.diff || "");
      const result = await runReview(String(body.diff || ""), {
        provider: body.provider,
        context: String(body.context || "")
      });
      const record = await historyStore.createReview({
        inputType: "diff",
        inputValue: diffText.slice(0, 400),
        inputRaw: diffText,
        context: String(body.context || ""),
        result
      });
      sendJson(response, 200, {
        ...result,
        reviewId: record.id,
        createdAt: record.createdAt
      });
      return;
    }

    if (request.method === "POST" && request.url === "/api/review-pr") {
      const body = await readJson(request);
      const pullRequest = await fetchPullRequestDiff(String(body.url || ""));
      const result = await runReview(pullRequest.diff, {
        provider: body.provider,
        context: String(body.context || "")
      });
      const resultWithSource = {
        ...result,
        source: {
          type: "github_pr",
          owner: pullRequest.owner,
          repo: pullRequest.repo,
          pullNumber: pullRequest.pullNumber,
          diffUrl: pullRequest.diffUrl
        }
      };
      const record = await historyStore.createReview({
        inputType: "github_pr",
        inputValue: String(body.url || ""),
        inputRaw: pullRequest.diff,
        context: String(body.context || ""),
        result: resultWithSource
      });
      sendJson(response, 200, {
        ...resultWithSource,
        reviewId: record.id,
        createdAt: record.createdAt
      });
      return;
    }

    if (request.method === "GET" && request.url?.startsWith("/api/artifacts/")) {
      const id = decodeURIComponent(request.url.split("/").pop() || "");
      const review = await historyStore.getReview(id);
      if (!review) {
        sendJson(response, 404, { error: "Review not found" });
        return;
      }
      sendJson(response, 200, buildReviewArtifacts(review.result, review.inputRaw || ""));
      return;
    }

    if (request.method === "GET" && request.url?.startsWith("/api/history")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const limit = Number(url.searchParams.get("limit") || 20);
      sendJson(response, 200, {
        reviews: await historyStore.listReviews(limit)
      });
      return;
    }

    if (request.method === "GET" && request.url?.startsWith("/api/reviews/")) {
      const id = decodeURIComponent(request.url.split("/").pop() || "");
      const review = await historyStore.getReview(id);
      if (!review) {
        sendJson(response, 404, { error: "Review not found" });
        return;
      }
      sendJson(response, 200, review);
      return;
    }

    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    sendJson(response, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`PatchPilot running at http://localhost:${port}`);
});

function readJson(request) {
  return new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function serveStatic(request, response) {
  const url = request.url === "/" ? "/index.html" : request.url;
  const pathname = decodeURIComponent(url.split("?")[0]);
  const filePath = resolve(publicDir, `.${pathname}`);
  const pathFromPublic = relative(publicDir, filePath);

  if (pathFromPublic.startsWith("..") || pathFromPublic === "" || resolve(pathFromPublic) === pathFromPublic) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  const file = await readFile(filePath);
  response.writeHead(200, { "content-type": contentType(filePath) });
  response.end(file);
}

function contentType(filePath) {
  const extension = extname(filePath);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}
