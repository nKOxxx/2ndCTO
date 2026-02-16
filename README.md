# 2ndCTO

AI co-founder for technical continuity. When your CTO leaves, the knowledge doesn't.

## Week 1: Core Ingestion

- [x] Project structure
- [x] Database schema
- [x] GitHub integration
- [ ] Repo cloning service
- [ ] AST parsing
- [ ] Code entity extraction
- [ ] Background job queue

## Quick Start

```bash
# Install
cd /Users/ares/.openclaw/workspace/projects/2ndCTO
npm install

# Setup env
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npm run db:migrate

# Start API
npm run dev

# Start worker (in another terminal)
npm run worker
```

## API

```bash
# Add repository
POST /api/repos
{
  "owner": "facebook",
  "name": "react",
  "github_url": "https://github.com/facebook/react"
}

# Check status
GET /api/repos/:id/status

# Trigger analysis
POST /api/repos/:id/analyze
```

## Tech Stack

- Node.js + Express
- Supabase (PostgreSQL)
- Redis (Bull queues)
- Tree-sitter (AST parsing)
- GitHub API

## Architecture

See `docs/ARCHITECTURE.md`
