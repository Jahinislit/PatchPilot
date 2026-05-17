# PatchPilot

PatchPilot is an AI-powered code review and bug-fixing assistant for pull request diffs.

The MVP accepts a GitHub PR URL or unified diff, analyzes changed files, produces structured review findings, suggests tests, generates patch guidance, and exports PR-ready review artifacts. It ships with a deterministic local reviewer and an optional OpenAI reviewer behind the same review contract.



## Run

```bash
npm install
npm start
```

Then open:

```text
http://localhost:4173
```

## Optional AI Mode

PatchPilot works without an API key in local mode.

To enable OpenAI mode:

```bash
$env:OPENAI_API_KEY="your_api_key"
$env:PATCHPILOT_PROVIDER="openai"
npm start
```

Optional model override:

```bash
$env:OPENAI_MODEL="gpt-5.1"
```

The browser UI also has a review mode selector. If OpenAI mode is selected but no API key is set, PatchPilot falls back to the local deterministic reviewer.

## Optional GitHub Token

Public PR diff import works without a token. To increase rate limits or prepare for private repositories later:

```bash
$env:GITHUB_TOKEN="your_github_token"
npm start
```

## Test

```bash
npm test
```

## Demo Flow

1. Click `Load Sample`.
2. Keep review mode as `Local`.
3. Click `Review Diff`.
4. Open a saved item from `History`.
5. Click `Copy Markdown`, `Copy Comments`, or `Patch Plan`.
6. Optional: paste a public GitHub PR URL and click `Review PR URL`.

## MVP Features

- Paste a GitHub PR URL and fetch its `.diff`
- Paste a unified diff
- Parse changed files and added lines
- Accept optional repository context for better AI review prompts
- Review through local deterministic rules or OpenAI mode
- Save review history locally
- Generate structured findings
- Rank issues by severity
- Suggest tests
- Produce a PR-style review summary
- Export Markdown review reports
- Export GitHub-style file comments
- Download safe patch plans
- Download generated `.patch` files for safe deterministic fixes
- Browser dashboard with sample diff

## Architecture

```text
Browser UI
  |
Node HTTP API
  |
Review Service
  |-- Deterministic Reviewer
  |-- OpenAI Reviewer
  |
History Store
  |
Artifacts: Markdown, GitHub comments, patch plan
```



## Future Milestones

1. Store review history in SQLite/PostgreSQL.
2. Add GitHub App auth for private repositories and real PR comments.
3. Add repo context retrieval for multi-file reasoning.
4. Expand code-edit patch generation with AI and human approval.
5. Deploy frontend/backend and add screenshots to the README.
