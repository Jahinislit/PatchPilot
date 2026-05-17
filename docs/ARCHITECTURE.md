# PatchPilot Architecture

PatchPilot is a lightweight AI developer tool for reviewing pull request diffs.

## Core Flow

```text
GitHub PR URL / Raw Diff
    |
Diff Parser
    |
Review Service
    |
Local Reviewer or OpenAI Reviewer
    |
Risk Score + Findings + Suggested Tests
    |
History Store + Export Artifacts
```

## Modules

- `src/diffParser.js`: Parses unified diffs into files, hunks, and line-level changes.
- `src/reviewer.js`: Deterministic local reviewer for security, bug, performance, maintainability, and test findings.
- `src/ai/openaiReviewer.js`: Optional OpenAI reviewer using structured JSON output.
- `src/github.js`: Parses GitHub PR URLs and fetches `.diff` content.
- `src/historyStore.js`: Stores recent reviews in a local JSON file.
- `src/artifacts.js`: Builds Markdown reports, GitHub-style comments, and patch plans.
- `src/server.js`: Serves the browser UI and JSON APIs.

## API Surface

- `POST /api/review`: Review a raw diff.
- `POST /api/review-pr`: Fetch and review a GitHub PR diff.
- `GET /api/history`: List saved reviews.
- `GET /api/reviews/:id`: Load one saved review.
- `GET /api/artifacts/:id`: Export Markdown, GitHub comments, and patch plan.

## Production Upgrade Path

- Replace JSON history with SQLite/PostgreSQL.
- Add GitHub App OAuth and installation tokens.
- Post comments to PRs through the GitHub Reviews API.
- Add repository context retrieval through embeddings or indexed file summaries.
- Add human-approved code patch generation.
