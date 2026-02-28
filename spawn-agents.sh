#!/bin/bash
# 2ndCTO Production Readiness - Agent Swarm Deployment
# Uses Kimi-first Ruflo to analyze and improve 2ndCTO

set -e

echo "🚀 2ndCTO Production Readiness - Agent Swarm"
echo "=============================================="
echo ""

# Configuration
export MOONSHOT_API_KEY="${MOONSHOT_API_KEY:-your-key-here}"
export DEFAULT_PROVIDER="moonshot"
export DEFAULT_MODEL="kimi-k2.5"

cd ~/.openclaw/workspace/projects/ruflo

echo "1. Spawning Architecture Review Agent..."
node -e "
const { SpawnAgentCommandHandler } = require('./v3/@claude-flow/swarm/src/application/commands/spawn-agent.command.js');
const { InMemoryAgentRepository } = require('./v3/@claude-flow/swarm/src/infrastructure/persistence/in-memory-agent-repository.js');

const repo = new InMemoryAgentRepository();
const handler = new SpawnAgentCommandHandler(repo);

handler.execute({
  name: 'architect-2ndcto',
  role: 'core-architect',
  domain: 'backend-architecture',
  capabilities: [
    'architecture-review',
    'scalability-analysis',
    'api-design-review',
    'database-optimization'
  ],
  maxConcurrentTasks: 2,
  metadata: {
    model: 'kimi-k2.5',
    targetProject: '2ndCTO',
    focusAreas: ['scalability', 'maintainability', 'security'],
    systemPrompt: \`You are a senior software architect reviewing 2ndCTO codebase.
Analyze the Express.js API structure, database patterns, and overall architecture.
Identify:
- Scalability bottlenecks
- Security vulnerabilities
- Code organization issues
- Missing error handling
- Performance optimizations needed

Provide specific, actionable recommendations with code examples.\`
  },
  autoStart: true
}).then(result => {
  console.log('✅ Architect agent spawned:', result.agentId);
}).catch(err => {
  console.error('❌ Failed to spawn architect:', err.message);
});
"

echo ""
echo "2. Spawning Security Audit Agent..."
node -e "
const { SpawnAgentCommandHandler } = require('./v3/@claude-flow/swarm/src/application/commands/spawn-agent.command.js');
const { InMemoryAgentRepository } = require('./v3/@claude-flow/swarm/src/infrastructure/persistence/in-memory-agent-repository.js');

const repo = new InMemoryAgentRepository();
const handler = new SpawnAgentCommandHandler(repo);

handler.execute({
  name: 'security-auditor-2ndcto',
  role: 'security-auditor',
  domain: 'security',
  capabilities: [
    'vulnerability-scanning',
    'secret-detection',
    'auth-review',
    'input-validation-check'
  ],
  maxConcurrentTasks: 3,
  metadata: {
    model: 'kimi-k2.5',
    targetProject: '2ndCTO',
    focusAreas: ['authentication', 'authorization', 'input-sanitization', 'secrets-management'],
    systemPrompt: \`You are a security auditor analyzing 2ndCTO for vulnerabilities.
Check for:
- Hardcoded secrets in code
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication bypasses
- Insecure direct object references
- Missing input validation
- Weak cryptography

For each finding, provide:
1. Severity (Critical/High/Medium/Low)
2. Location (file:line)
3. Explanation of risk
4. Fix with code example\`
  },
  autoStart: true
}).then(result => {
  console.log('✅ Security auditor spawned:', result.agentId);
}).catch(err => {
  console.error('❌ Failed to spawn security auditor:', err.message);
});
"

echo ""
echo "3. Spawning Code Modernization Agent..."
node -e "
const { SpawnAgentCommandHandler } = require('./v3/@claude-flow/swarm/src/application/commands/spawn-agent.command.js');
const { InMemoryAgentRepository } = require('./v3/@claude-flow/swarm/src/infrastructure/persistence/in-memory-agent-repository.js');

const repo = new InMemoryAgentRepository();
const handler = new SpawnAgentCommandHandler(repo);

handler.execute({
  name: 'modernizer-2ndcto',
  role: 'coder',
  domain: 'code-modernization',
  capabilities: [
    'es5-to-es2022',
    'async-await-conversion',
    'typescript-migration',
    'dependency-update'
  ],
  maxConcurrentTasks: 2,
  metadata: {
    model: 'kimi-k2.5',
    targetProject: '2ndCTO',
    focusAreas: ['es2022-features', 'async-patterns', 'error-handling', 'typescript'],
    systemPrompt: \`You are a code modernization expert upgrading 2ndCTO to modern standards.
Tasks:
1. Convert callbacks to async/await
2. Replace var with const/let
3. Use ES2022 features (optional chaining, nullish coalescing)
4. Add proper TypeScript types
5. Update error handling (try/catch with specific errors)
6. Modernize Express patterns

For each file:
- Show before/after comparison
- Explain the improvement
- Ensure backward compatibility where needed\`
  },
  autoStart: true
}).then(result => {
  console.log('✅ Modernization agent spawned:', result.agentId);
}).catch(err => {
  console.error('❌ Failed to spawn modernizer:', err.message);
});
"

echo ""
echo "4. Spawning Documentation Agent..."
node -e "
const { SpawnAgentCommandHandler } = require('./v3/@claude-flow/swarm/src/application/commands/spawn-agent.command.js');
const { InMemoryAgentRepository } = require('./v3/@claude-flow/swarm/src/infrastructure/persistence/in-memory-agent-repository.js');

const repo = new InMemoryAgentRepository();
const handler = new SpawnAgentCommandHandler(repo);

handler.execute({
  name: 'documenter-2ndcto',
  role: 'researcher',
  domain: 'documentation',
  capabilities: [
    'api-documentation',
    'code-comments',
    'readme-generation',
    'setup-guide-creation'
  ],
  maxConcurrentTasks: 2,
  metadata: {
    model: 'kimi-k2.5',
    targetProject: '2ndCTO',
    focusAreas: ['api-docs', 'setup-instructions', 'architecture-docs', 'examples'],
    systemPrompt: \`You are a technical writer creating production-ready documentation for 2ndCTO.
Create:
1. Comprehensive README with quick start
2. API endpoint documentation
3. Environment variable reference
4. Architecture overview diagram (in text)
5. Deployment guide (Render, Railway, VPS)
6. Contributing guidelines
7. Troubleshooting guide

Make it easy for anyone to:
- Understand what 2ndCTO does
- Install and run locally
- Deploy to production
- Contribute to the project\`
  },
  autoStart: true
}).then(result => {
  console.log('✅ Documentation agent spawned:', result.agentId);
}).catch(err => {
  console.error('❌ Failed to spawn documenter:', err.message);
});
"

echo ""
echo "5. Spawning Testing Agent..."
node -e "
const { SpawnAgentCommandHandler } = require('./v3/@claude-flow/swarm/src/application/commands/spawn-agent.command.js');
const { InMemoryAgentRepository } = require('./v3/@claude-flow/swarm/src/infrastructure/persistence/in-memory-agent-repository.js');

const repo = new InMemoryAgentRepository();
const handler = new SpawnAgentCommandHandler(repo);

handler.execute({
  name: 'tester-2ndcto',
  role: 'tester',
  domain: 'testing',
  capabilities: [
    'unit-test-generation',
    'integration-test-creation',
    'test-coverage-analysis',
    'edge-case-identification'
  ],
  maxConcurrentTasks: 2,
  metadata: {
    model: 'kimi-k2.5',
    targetProject: '2ndCTO',
    focusAreas: ['unit-tests', 'integration-tests', 'api-tests', 'error-scenarios'],
    systemPrompt: \`You are a QA engineer creating comprehensive tests for 2ndCTO.
Generate:
1. Unit tests for all services
2. API integration tests
3. Error handling tests
4. Authentication/authorization tests
5. Database operation tests

Use Jest + Supertest patterns.
Include:
- Happy path tests
- Error scenarios
- Edge cases
- Mock external services (Supabase, Redis, GitHub)

Aim for 80%+ coverage.\`
  },
  autoStart: true
}).then(result => {
  console.log('✅ Testing agent spawned:', result.agentId);
}).catch(err => {
  console.error('❌ Failed to spawn tester:', err.message);
});
"

echo ""
echo "=============================================="
echo "✅ AGENT SWARM DEPLOYED!"
echo "=============================================="
echo ""
echo "5 specialized agents spawned:"
echo "  1. architect-2ndcto (Core Architecture)"
echo "  2. security-auditor-2ndcto (Security)"
echo "  3. modernizer-2ndcto (Code Modernization)"
echo "  4. documenter-2ndcto (Documentation)"
echo "  5. tester-2ndcto (Testing)"
echo ""
echo "All agents use Kimi K2.5 (256k context)"
echo ""
echo "Next: Assigning tasks to analyze 2ndCTO..."
echo "Run: ./assign-tasks.sh"
