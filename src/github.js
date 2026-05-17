export function parseGitHubPullRequestUrl(urlText) {
  let url;
  try {
    url = new URL(urlText);
  } catch {
    throw new Error("Enter a valid GitHub pull request URL.");
  }

  if (url.hostname !== "github.com") {
    throw new Error("Only github.com pull request URLs are supported.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const pullIndex = parts.indexOf("pull");

  if (parts.length < 4 || pullIndex !== 2 || !parts[pullIndex + 1]) {
    throw new Error("Expected a GitHub URL like https://github.com/owner/repo/pull/123.");
  }

  return {
    owner: parts[0],
    repo: parts[1],
    pullNumber: parts[pullIndex + 1],
    diffUrl: `https://github.com/${parts[0]}/${parts[1]}/pull/${parts[pullIndex + 1]}.diff`
  };
}

export async function fetchPullRequestDiff(urlText, options = {}) {
  const parsed = parseGitHubPullRequestUrl(urlText);
  const token = options.token || process.env.GITHUB_TOKEN;
  const headers = {
    accept: "application/vnd.github.v3.diff",
    "user-agent": "PatchPilot"
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(parsed.diffUrl, { headers });
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} while fetching the PR diff.`);
  }

  return {
    ...parsed,
    diff: await response.text()
  };
}

