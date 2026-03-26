# 2ndCTO

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

AI-powered codebase risk analyzer. Scans GitHub repositories for security vulnerabilities, bus factor risk, and technical debt — and delivers actionable insights to keep your engineering healthy.

## Features

- **Security Analysis** — Detect secrets, SQL injection, XSS, and unsafe patterns with a 0–100 risk score
- **Bus Factor Analysis** — Identify knowledge concentration and single points of failure across your team
- **Code Modernization** — Surface legacy patterns (ES5, callbacks, `var`) ready for upgrade
- **AI Insights** — Prioritized recommendations with before/after fix examples

## Prerequisites

- Node.js 18+
- PostgreSQL (Supabase recommended)
- Redis (Upstash recommended)

## Quick Start

```bash
git clone https://github.com/nKOxxx/2ndCTO.git
cd 2ndCTO
npm install
cp .env.example .env   # fill in your credentials
npm run db:migrate
npm run dev
```

Open http://localhost:3001 in your browser.

## Environment Variables

```bash
PORT=3001
NODE_ENV=development

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

REDIS_URL=rediss://your_upstash_url

GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

## API

```bash
# Add a repository for analysis
curl -X POST http://localhost:3001/api/repos \
  -H "Content-Type: application/json" \
  -d '{"owner":"facebook","name":"react"}'

# Fetch report
curl http://localhost:3001/api/repos/{repo-id}/report

# AI insights
curl http://localhost:3001/api/repos/{repo-id}/insights

# Bus factor
curl http://localhost:3001/api/repos/{repo-id}/bus-factor
```

Full API reference: [docs/API.md](docs/API.md)

## Chrome Extension

1. Go to `chrome://extensions/` and enable Developer mode
2. Click "Load unpacked" and select the `chrome-extension/` folder
3. Visit any GitHub repo and click "Analyze with 2ndCTO"

## GitHub Action

```yaml
- uses: nKOxxx/2ndCTO/.github/actions/2ndcto-analyze@main
  with:
    server-url: 'https://your-2ndcto-server.com'
    fail-on-critical: 'true'
    create-issues: 'true'
```

## Architecture

```
Chrome Ext / Web Dashboard / GitHub Action
                    │
          Express API (port 3001)
                    │
    ┌───────────────┼───────────────┐
 PostgreSQL    Redis (Bull)    GitHub API
 (Supabase)   (Job Queue)
```

**Stack:** Node.js, Express, PostgreSQL, Redis + Bull, Tree-sitter, Socket.io

## Risk Scoring

| Score | Grade | Action |
|-------|-------|--------|
| 0–30  | A     | Maintain practices |
| 30–50 | B     | Minor improvements |
| 50–70 | C     | Review recommended |
| 70–90 | D     | Address issues soon |
| 90–100| F     | Immediate action required |

## Project Structure

```
2ndCTO/
├── src/
│   ├── api/           # Express routes
│   ├── analysis/      # Code analyzers
│   ├── db/            # Database connection
│   ├── ingestion/     # Repo cloning
│   ├── queue/         # Bull job queue
│   └── index.js       # Entry point
├── public/            # Web UI
├── chrome-extension/  # Browser extension
├── scripts/           # SQL migrations
└── .github/           # GitHub Actions
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Render, Railway, and Docker instructions.

## Contributing

1. Fork the repo and create a feature branch
2. Make your changes with tests
3. Open a pull request

## License

[MIT](LICENSE)
