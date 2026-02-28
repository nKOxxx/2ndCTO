#!/bin/bash
# Assign tasks to the 2ndCTO agent swarm
# Each agent analyzes a different aspect of the codebase

set -e

cd ~/.openclaw/workspace/projects/2ndCTO

echo "🎯 Assigning Tasks to 2ndCTO Agent Swarm"
echo "=========================================="
echo ""

# Task 1: Architecture Review
echo "📋 Task 1: Architecture Analysis"
echo "Agent: architect-2ndcto"
echo "Target: Complete codebase architecture"
echo ""
cat > ./tasks/architecture-review.md << 'EOF'
# Architecture Review Task

## Agent
architect-2ndcto

## Objective
Analyze 2ndCTO's architecture and identify improvements for production readiness.

## Scope
1. Express.js app structure
2. Database layer (Supabase integration)
3. Service layer organization
4. API route structure
5. Middleware usage
6. Error handling patterns
7. Configuration management

## Deliverables
- Architecture assessment document
- Scalability recommendations
- Security architecture review
- Refactoring plan with priorities
- Code examples for improvements

## Success Criteria
- Identify 5+ specific improvements
- Provide working code examples
- Ensure backward compatibility
EOF

echo "✅ Architecture task created"
echo ""

# Task 2: Security Audit
echo "📋 Task 2: Security Audit"
echo "Agent: security-auditor-2ndcto"
echo "Target: Security vulnerabilities"
echo ""
cat > ./tasks/security-audit.md << 'EOF'
# Security Audit Task

## Agent
security-auditor-2ndcto

## Objective
Perform comprehensive security audit of 2ndCTO codebase.

## Scope
1. Authentication flow
2. Authorization checks
3. Input validation
4. SQL injection risks
5. XSS vulnerabilities
6. Secret management
7. Rate limiting
8. CORS configuration

## Deliverables
- Security audit report
- Vulnerability list (with severity)
- Fix recommendations with code
- Security hardening guide

## Success Criteria
- Find all Critical/High issues
- Provide immediate fixes
- Document security best practices
EOF

echo "✅ Security audit task created"
echo ""

# Task 3: Code Modernization
echo "📋 Task 3: Code Modernization"
echo "Agent: modernizer-2ndcto"
echo "Target: ES2022 + async/await upgrades"
echo ""
cat > ./tasks/code-modernization.md << 'EOF'
# Code Modernization Task

## Agent
modernizer-2ndcto

## Objective
Modernize 2ndCTO codebase to ES2022 standards.

## Scope
1. Convert callbacks to async/await
2. Replace var with const/let
3. Add optional chaining (?.)
4. Use nullish coalescing (??)
5. Add proper TypeScript types
6. Modernize error handling
7. Update import/export syntax

## Target Files
- src/index.js (main entry)
- src/services/*.js
- src/middleware/*.js
- src/analysis/*.js

## Deliverables
- Modernized code for each file
- Before/after comparisons
- TypeScript migration plan
- Compatibility notes

## Success Criteria
- All files use modern syntax
- No breaking changes
- Improved readability
- Better error handling
EOF

echo "✅ Modernization task created"
echo ""

# Task 4: Documentation
echo "📋 Task 4: Documentation"
echo "Agent: documenter-2ndcto"
echo "Target: Complete documentation suite"
echo ""
cat > ./tasks/documentation.md << 'EOF'
# Documentation Task

## Agent
documenter-2ndcto

## Objective
Create comprehensive, production-ready documentation.

## Deliverables

### 1. README.md (Improved)
- Clear project description
- Visual demo/screenshots
- Quick start guide
- Feature list with emojis
- Tech stack badges

### 2. API_DOCUMENTATION.md
- All endpoints documented
- Request/response examples
- Authentication requirements
- Error codes reference

### 3. DEPLOYMENT.md
- Render deployment guide
- Railway deployment guide
- Docker setup
- Environment variables reference
- Database setup instructions

### 4. CONTRIBUTING.md
- Development setup
- Code style guide
- Testing requirements
- PR process

### 5. ARCHITECTURE.md
- System diagram (text)
- Data flow explanation
- Component descriptions
- Database schema

## Success Criteria
- New user can install in 5 minutes
- All API endpoints documented
- Deployment is copy-paste easy
- Architecture is clearly explained
EOF

echo "✅ Documentation task created"
echo ""

# Task 5: Testing
echo "📋 Task 5: Test Suite Creation"
echo "Agent: tester-2ndcto"
echo "Target: Comprehensive test coverage"
echo ""
cat > ./tasks/testing.md << 'EOF'
# Testing Task

## Agent
tester-2ndcto

## Objective
Create comprehensive test suite for 2ndCTO.

## Test Types

### 1. Unit Tests (Jest)
- Service layer tests
- Middleware tests  
- Utility function tests
- Mock external dependencies

### 2. Integration Tests
- API endpoint tests (Supertest)
- Database integration tests
- Authentication flow tests
- GitHub API integration tests

### 3. Security Tests
- Authentication bypass attempts
- Input validation tests
- Rate limiting tests
- CORS configuration tests

### 4. Edge Cases
- Empty repository analysis
- Large repository handling
- Invalid GitHub tokens
- Database connection failures

## Target Coverage
- Services: 90%+
- Routes: 80%+
- Middleware: 80%+
- Overall: 80%+

## Deliverables
- __tests__/ directory with all tests
- jest.config.js
- Test data fixtures
- CI/CD test workflow

## Success Criteria
- All tests pass
- 80%+ coverage
- Tests run in CI/CD
- Clear test documentation
EOF

echo "✅ Testing task created"
echo ""

# Create task directory structure
mkdir -p ./tasks
mkdir -p ./analysis-output
mkdir -p ./modernized-code
mkdir -p ./docs-generated
mkdir -p ./tests-generated

echo "============================================"
echo "✅ ALL TASKS ASSIGNED!"
echo "============================================"
echo ""
echo "5 tasks ready for agent swarm:"
echo "  📐 tasks/architecture-review.md"
echo "  🔒 tasks/security-audit.md"
echo "  🚀 tasks/code-modernization.md"
echo "  📝 tasks/documentation.md"
echo "  🧪 tasks/testing.md"
echo ""
echo "Output directories created:"
echo "  - ./analysis-output/"
echo "  - ./modernized-code/"
echo "  - ./docs-generated/"
echo "  - ./tests-generated/"
echo ""
echo "Ready to execute!"
echo ""
echo "To run the agents:"
echo "  1. cd ~/.openclaw/workspace/projects/2ndCTO"
echo "  2. export MOONSHOT_API_KEY='your-key'"
echo "  3. ./spawn-agents.sh  # Creates agents"
echo "  4. ./execute-analysis.sh  # Runs analysis"
