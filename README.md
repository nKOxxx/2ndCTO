# 2ndCTO - AI-Powered Codebase Risk Analyzer

[![GitHub](https://img.shields.io/badge/GitHub-nKOxxx%2F2ndCTO-blue)](https://github.com/nKOxxx/2ndCTO)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> **Know Your Codebase Risk. Protect Your Engineering Investment.**

2ndCTO analyzes GitHub repositories for security risks, bus factor (knowledge concentration), and technical debt. Get actionable insights to keep your codebase healthy and your team resilient.

![2ndCTO Dashboard](docs/screenshot-dashboard.png)

## 🚀 Features

### Security Analysis
- 🔒 **Secret Detection** - Find API keys, passwords, tokens in code
- 🛡️ **Vulnerability Scanning** - SQL injection, XSS, unsafe eval detection
- 📊 **Risk Scoring** - 0-100 score with severity breakdown

### Bus Factor Analysis
- 🚌 **Knowledge Distribution** - Identify single points of failure
- 👥 **Team Insights** - See who knows what in your codebase
- ⚠️ **Risk Alerts** - Get warned before knowledge walks out the door

### Code Modernization
- 🔄 **Legacy Conversion** - ES5 → ES2022, Python 2 → 3
- 📈 **Pattern Detection** - Callbacks → async/await, var → const
- ✅ **Validation** - Syntax check and test generation

### AI-Powered Insights
- 🤖 **Smart Recommendations** - Prioritized action plans
- 💡 **Fix Suggestions** - Before/after code examples
- 📈 **Trend Analysis** - Track improvements over time

## 📦 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (Supabase recommended)
- Redis (Upstash recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/nKOxxx/2ndCTO.git
cd 2ndCTO

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
# (See scripts/ folder for SQL files)

# Start the application
npm run dev
```

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Redis
REDIS_URL=rediss://your_upstash_url

# GitHub
GITHUB_TOKEN=your_github_personal_access_token
```

## 🎯 Usage

### Web Interface

1. **Landing Page** - http://localhost:3001
2. **Dashboard** - http://localhost:3001/dashboard.html
3. **Analyze Repo** - Enter GitHub URL and click "Analyze"

### API Endpoints

```bash
# Add repository
curl -X POST http://localhost:3001/api/repos \
  -H "Content-Type: application/json" \
  -d '{"owner":"facebook","name":"react"}'

# Get analysis report
curl http://localhost:3001/api/repos/{repo-id}/report

# Get AI insights
curl http://localhost:3001/api/repos/{repo-id}/insights

# Get bus factor
curl http://localhost:3001/api/repos/{repo-id}/bus-factor
```

### Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension/` folder
5. Visit any GitHub repo and click "Analyze with 2ndCTO"

### GitHub Action

```yaml
name: Security Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: nKOxxx/2ndCTO/.github/actions/2ndcto-analyze@main
        with:
          server-url: 'http://your-2ndcto-server.com'
          fail-on-critical: 'true'
          create-issues: 'true'
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chrome Ext    │     │   Web Dashboard │     │   GitHub Action │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Express API (3001)    │
                    └─────────────┬─────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
┌────────▼────────┐    ┌─────────▼──────────┐   ┌────────▼────────┐
│  PostgreSQL     │    │  Redis (Bull)      │   │   GitHub API    │
│  (Supabase)     │    │  (Job Queue)       │   │                 │
└─────────────────┘    └────────────────────┘   └─────────────────┘
```

### Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Supabase)
- **Queue**: Redis + Bull
- **Parser**: Tree-sitter (AST analysis)
- **Frontend**: Vanilla HTML/JS (no framework)
- **Real-time**: Socket.io

## 📊 Understanding Reports

### Risk Score (0-100)

| Score | Grade | Meaning | Action |
|-------|-------|---------|--------|
| 0-30 | A | Excellent | Maintain practices |
| 30-50 | B | Good | Minor improvements |
| 50-70 | C | Fair | Review recommended |
| 70-90 | D | Poor | Address issues soon |
| 90-100 | F | Critical | Immediate action |

### Bus Factor

| Score | Status | Interpretation |
|-------|--------|----------------|
| 1-1.5 | 🔴 Critical | Single point of failure |
| 1.5-2.5 | 🟡 Warning | Limited knowledge spread |
| 2.5-4 | 🟢 Good | Decent distribution |
| 4+ | 🟢 Excellent | Healthy team resilience |

## 🛠️ Development

### Project Structure

```
2ndCTO/
├── src/
│   ├── api/           # Express routes
│   ├── analysis/      # Code analyzers
│   ├── db/            # Database connection
│   ├── ingestion/     # Repo cloning
│   ├── queue/         # Bull job queue
│   └── index.js       # Entry point
├── public/            # Static files (UI)
├── chrome-extension/  # Browser extension
├── scripts/           # SQL migrations
└── .github/           # GitHub Actions
```

### Running Tests

```bash
npm test
```

### Adding New Security Rules

Edit `src/analysis/security-scanner.js`:

```javascript
{
  id: 'MY_NEW_RULE',
  name: 'Descriptive Name',
  pattern: /regex pattern/,
  severity: 'high',
  category: 'vulnerability'
}
```

## 🚀 Deployment

### Render (Recommended)

1. Push to GitHub
2. Connect Render to repo
3. Set environment variables
4. Deploy!

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

```bash
docker build -t 2ndcto .
docker run -p 3001:3001 --env-file .env 2ndcto
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Tree-sitter for AST parsing
- Supabase for managed PostgreSQL
- Upstash for Redis hosting
- GitHub for the API

## 📞 Support

- GitHub Issues: [github.com/nKOxxx/2ndCTO/issues](https://github.com/nKOxxx/2ndCTO/issues)
- Documentation: http://localhost:3001 (when running locally)

---

**Built with ❤️ by 2ndCTO Team**
