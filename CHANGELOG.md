# Changelog

All notable changes to 2ndCTO will be documented in this file.

## [1.1.0] - 2026-02-17

### 🚀 The "Gold Master" Release

This is the production-ready release after extensive security hardening and usability improvements.

#### Security & Infrastructure
- **Full Security Audit** - Input validation, rate limiting, resource limits
- **Authentication System** - API keys with usage tracking
- **Sentry Integration** - Error tracking and performance monitoring
- **Auto-Cleanup** - Scheduled data retention and disk management
- **Backup System** - Automated daily backups with integrity checks
- **Admin Panel** - System management endpoints
- **Request IDs** - Full request tracing for debugging

#### Usability
- **Skeleton Loading** - Animated placeholders instead of "Loading..."
- **Empty States** - Helpful illustrations with CTAs
- **Error States** - Actionable error messages with retry options
- **Toast Notifications** - Non-blocking user feedback
- **Global Search** - Find findings across all repos with autocomplete
- **Onboarding Tour** - Interactive first-time user guide
- **Keyboard Shortcuts** - Cmd+K for search, shortcuts throughout

---

## [1.0.0] - 2026-02-17

### 🚀 Added

#### Core Features
- **Repository Analysis** - Clone, scan, and analyze any public GitHub repository
- **Security Scanning** - 10+ security rules including secrets, SQL injection, eval detection
- **Bus Factor Analysis** - Calculate knowledge concentration using git history
- **Risk Scoring** - 0-100 score based on security, complexity, and team distribution
- **Code Modernization** - Convert legacy code (ES5→ES2022, callbacks→async/await)

#### AI Features
- **Smart Insights** - AI-generated action plans with effort/impact estimates
- **Fix Suggestions** - Before/after code examples for every finding
- **Prioritization** - Ranked recommendations based on risk reduction

#### Integrations
- **Chrome Extension** - One-click analysis from any GitHub repo page
- **GitHub Action** - Automated PR analysis with issue creation
- **WebSocket Real-time** - Live progress bars and log streaming

#### UI/UX
- **Landing Page** - Professional GitHub-style design with FAQ
- **Dashboard** - Trend visualization and repository management
- **Report Page** - Detailed findings with explanations
- **Modernization Studio** - Side-by-side code conversion interface
- **Progress Page** - Animated analysis progress with stats

#### API
- REST API for all features
- WebSocket for real-time updates
- GitHub webhook support

### 🔧 Technical

- Node.js 18+ with Express
- PostgreSQL (Supabase) for persistence
- Redis (Upstash) for job queues
- Tree-sitter for AST parsing
- Socket.io for real-time communication
- Bull for background job processing

### 📦 Dependencies
- express: ^4.18.x
- bull: ^4.12.x
- socket.io: ^4.7.x
- @supabase/supabase-js: ^2.38.x
- ioredis: ^5.3.x
- simple-git: ^3.20.x
- tree-sitter: ^0.20.x

## [0.2.0] - 2026-02-10

### Added
- Week 2 features: Redis integration, job queues, entity extraction
- Multi-tenancy support
- Audit logging

## [0.1.0] - 2026-02-05

### Added
- Initial release
- Basic repository cloning
- Security scanning (3 rules)
- Supabase database integration
- Simple dashboard

---

## Roadmap

### v1.1.0 (Planned)
- [ ] GitHub OAuth for private repos
- [ ] Team collaboration features
- [ ] Slack/Discord notifications
- [ ] PDF report export
- [ ] More languages (Go, Rust, Java)

### v1.2.0 (Planned)
- [ ] CLI tool (`npx 2ndcto`)
- [ ] VS Code extension
- [ ] Public leaderboard
- [ ] API rate limiting
- [ ] Webhook integrations

### v2.0.0 (Future)
- [ ] AI-powered auto-fixes
- [ ] Architecture recommendations
- [ ] Performance profiling
- [ ] Custom security rules
- [ ] Enterprise features
