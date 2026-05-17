# PatchPilot

PatchPilot is an AI-powered pull request review assistant that analyzes GitHub PR diffs, detects potential bugs and security risks, ranks findings by severity, and generates structured developer review feedback.

The platform combines deterministic rule-based analysis with optional OpenAI-powered review pipelines to provide reliable, production-oriented code review workflows. PatchPilot supports unified diff analysis, GitHub PR imports, Markdown export, GitHub-style review comments, review replay, and patch-plan generation through a lightweight developer dashboard.

---

## Live Demo

https://patchpilot-production-e33f.up.railway.app/

---

## Features

- GitHub PR diff analysis
- Unified diff parsing and review
- AI-powered review generation
- Deterministic fallback reviewer
- Severity-ranked findings
- Suggested test generation
- Markdown review export
- GitHub-style inline review comments
- Patch-plan generation workflows
- Review history replay
- Dockerized local development setup
- Cloud deployment on Railway
- Lightweight browser dashboard

---

## Tech Stack

### Backend
- Node.js
- Native HTTP Server
- JavaScript (ES Modules)

### AI & Analysis
- OpenAI API
- Deterministic Review Engine
- Diff Parsing Pipeline

### Infrastructure & Tooling
- Docker
- Docker Compose
- Railway
- GitHub API
- Environment-based configuration

---

## Architecture

```text
Browser Dashboard
        |
Node HTTP API
        |
Review Service Pipeline
        |
 ├── Diff Parser
 ├── Deterministic Reviewer
 ├── OpenAI Reviewer
 ├── Severity Ranking
 └── Artifact Generator
        |
History Store
        |
Markdown Reports / GitHub Comments / Patch Plans
```

---

## Local Development

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm start
```

Application runs at:

```text
http://localhost:4173
```

---

## Docker Setup

### Build and Run

```bash
docker compose up --build
```

Application runs at:

```text
http://localhost:4173
```

### Stop Containers

```bash
docker compose down
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
PORT=4173
PATCHPILOT_PROVIDER=openai
OPENAI_MODEL=gpt-5.1
GITHUB_TOKEN=your_github_token
```

---

## AI Review Modes

### Local Deterministic Reviewer
- Runs without API keys
- Fast rule-based analysis
- Reliable fallback behavior

### OpenAI Review Pipeline
- AI-assisted code review
- Context-aware findings
- Structured review generation

If OpenAI mode is selected without an API key, PatchPilot automatically falls back to the deterministic reviewer.

---

## Testing

Run the test suite:

```bash
npm test
```

---

## Demo Workflow

1. Load a sample diff or import a GitHub PR URL
2. Select review mode (`Local` or `OpenAI`)
3. Run analysis
4. Review generated findings and severity rankings
5. Export Markdown reports or GitHub-style comments
6. Replay saved reviews from history

---

## Project Structure

```text
PATCHPILOT/
├── data/                  # Local review persistence
├── docs/                  # Architecture and documentation
├── public/                # Browser dashboard UI
├── src/                   # Review pipeline and backend services
├── test/                  # Test suite
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── README.md
```

---

## Roadmap

- PostgreSQL/Supabase persistence
- GitHub OAuth & GitHub App integration
- Repository context retrieval
- Streaming review generation
- CI/CD pipelines
- Team workspaces
- Advanced security rule engine

---

## Vision

PatchPilot aims to evolve into a developer productivity platform that combines deterministic static analysis with AI-assisted review pipelines to streamline pull request workflows, debugging, and code quality assurance.