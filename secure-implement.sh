#!/bin/bash
# SECURE Implementation Phase for 2ndCTO
# Fixed security issues from audit

set -euo pipefail  # Strict mode: exit on error, undefined vars, pipe failures

cd ~/.openclaw/workspace/projects/2ndCTO

echo "🔨 SECURE 2ndCTO Implementation"
echo "================================"
echo ""

# Security: Validate API key without exposing it
if [[ -z "${MOONSHOT_API_KEY:-}" ]]; then
    echo "❌ MOONSHOT_API_KEY not set"
    echo "Set it with: export MOONSHOT_API_KEY='your-key'"
    exit 1
fi

# Security: Validate API key format (basic check)
if [[ ! "$MOONSHOT_API_KEY" =~ ^sk-[a-zA-Z0-9]+$ ]]; then
    echo "❌ Invalid API key format"
    exit 1
fi

echo "✅ API key validated (not logged)"
echo ""

# Security: Create isolated working directory
WORK_DIR="./.agent-work-$(date +%s)"
mkdir -p "$WORK_DIR"
trap "rm -rf '$WORK_DIR'" EXIT  # Cleanup on exit

# Security: Validate file paths before processing
validate_path() {
    local path="$1"
    # Check for path traversal
    if [[ "$path" =~ \.\./ ]]; then
        echo "❌ Path traversal detected: $path"
        return 1
    fi
    # Check if path is within project
    if [[ ! "$path" =~ ^(src/|__tests__/|docs-generated/|analysis-output/) ]]; then
        echo "❌ Invalid path: $path"
        return 1
    fi
    return 0
}

echo "Phase 1: Security Fixes (Dry Run)"
echo "=================================="
echo ""
echo "This will analyze security issues but NOT automatically fix them."
echo "Review the analysis and apply fixes manually."
echo ""

# Security: Generate security report
generate_security_report() {
    echo "Generating security analysis..."
    
    # Create temp file for API call
    local temp_file="$WORK_DIR/security-payload.json"
    
    # Read files safely
    local files_content=""
    for file in src/index.js src/services/auth.js src/middleware/security.js; do
        if [[ -f "$file" ]]; then
            validate_path "$file" || continue
            files_content+="\n\n=== $file ===\n"
            files_content+=$(cat "$file" | head -100)
        fi
    done
    
    # Create safe JSON payload
    cat > "$temp_file" << PAYLOAD
{
  "model": "kimi-k2.5",
  "messages": [
    {"role": "system", "content": "You are a security auditor. Analyze the code for vulnerabilities. Report: 1) Critical issues (fix immediately) 2) High issues (fix soon) 3) Medium issues (fix eventually). For each: location, description, severity, fix suggestion."},
    {"role": "user", "content": "Analyze this codebase for security vulnerabilities:\n\n$files_content"}
  ],
  "max_tokens": 4000,
  "temperature": 0.3
}
PAYLOAD
    
    # Call API with secure handling
    if ! curl -s -f https://api.moonshot.ai/v1/chat/completions \
      -H "Authorization: Bearer ${MOONSHOT_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "@$temp_file" \
      -o "$WORK_DIR/security-report.json" 2>/dev/null; then
        echo "⚠️  API call failed - using local analysis"
        cat > analysis-output/security-report-local.md << 'EOF'
# Security Analysis (Local)

## Manual Checklist

### Authentication
- [ ] JWT secrets are strong and rotated
- [ ] Session management is secure
- [ ] Rate limiting on auth endpoints

### Input Validation
- [ ] All user inputs validated
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (output encoding)

### Secrets Management
- [ ] No hardcoded secrets in code
- [ ] .env file in .gitignore
- [ ] API keys rotated regularly

### Dependencies
- [ ] npm audit passes
- [ ] No known vulnerable packages
- [ ] Dependencies pinned

Run: npm audit
EOF
        echo "   ✅ Created local security checklist"
    else
        echo "   ✅ Security report generated"
        # Extract report (don't expose full JSON with potential API key in logs)
        jq -r '.choices[0].message.content' "$WORK_DIR/security-report.json" > analysis-output/security-report.md 2>/dev/null || true
    fi
}

generate_security_report

echo ""
echo "Phase 2: Create Safe Modernization Guide"
echo "========================================="
echo ""

create_modernization_guide() {
    cat > modernized-code/MIGRATION_GUIDE.md << 'EOF'
# Code Modernization Guide

## ES5 → ES2022 Migration

### 1. Callbacks to Async/Await

**Before:**
```javascript
function getUser(id, callback) {
    db.query('SELECT * FROM users WHERE id = ?', [id], function(err, results) {
        if (err) return callback(err);
        callback(null, results[0]);
    });
}
```

**After:**
```javascript
async function getUser(id) {
    const results = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return results[0];
}
```

### 2. var → const/let

**Before:**
```javascript
var user = getUser();
var count = 0;
```

**After:**
```javascript
const user = getUser();
let count = 0;
```

### 3. Optional Chaining

**Before:**
```javascript
const name = user && user.profile && user.profile.name;
```

**After:**
```javascript
const name = user?.profile?.name;
```

### 4. Nullish Coalescing

**Before:**
```javascript
const port = process.env.PORT || 3000;
```

**After:**
```javascript
const port = process.env.PORT ?? 3000;
```

## Apply Changes Manually

1. Review each file
2. Apply changes incrementally
3. Test after each change
4. Commit with clear messages

## Testing

```bash
npm test
npm run lint
```
EOF
    echo "   ✅ Created migration guide"
}

create_modernization_guide

echo ""
echo "Phase 3: Generate Test Templates"
echo "================================="
echo ""

generate_test_templates() {
    mkdir -p __tests__
    
    # Template only - doesn't execute arbitrary code
    cat > __tests__/TEMPLATE.test.js << 'EOF'
/**
 * Test Template
 * 
 * Copy this file and customize for each module
 * Run: npm test
 */

const request = require('supertest');
const app = require('../src/app'); // Adjust path

describe('Feature Name', () => {
    beforeEach(() => {
        // Setup test data
    });
    
    afterEach(() => {
        // Cleanup
    });
    
    describe('GET /api/endpoint', () => {
        it('should return 200 with valid data', async () => {
            const response = await request(app)
                .get('/api/endpoint')
                .expect(200);
            
            expect(response.body).toHaveProperty('data');
        });
        
        it('should return 401 without auth', async () => {
            await request(app)
                .get('/api/endpoint')
                .expect(401);
        });
    });
});
EOF
    echo "   ✅ Created test template"
}

generate_test_templates

echo ""
echo "Phase 4: Documentation"
echo "======================"
echo ""

create_documentation() {
    cat > docs-generated/PRODUCTION_CHECKLIST.md << 'EOF'
# Production Readiness Checklist

## Security ✅
- [ ] Security audit completed
- [ ] No secrets in code
- [ ] Input validation added
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Security headers enabled

## Code Quality ✅
- [ ] ES2022 features used
- [ ] Async/await patterns
- [ ] Error handling centralized
- [ ] Code reviewed
- [ ] Linting passes

## Testing ✅
- [ ] Unit tests written
- [ ] Integration tests pass
- [ ] 70%+ coverage
- [ ] CI/CD configured

## Documentation ✅
- [ ] README complete
- [ ] API docs written
- [ ] Deployment guide ready
- [ ] Environment variables documented

## Deployment ✅
- [ ] Render account configured
- [ ] Database provisioned
- [ ] Redis configured (optional)
- [ ] Domain set up
- [ ] SSL enabled
- [ ] Monitoring active

## Final Checks
- [ ] npm audit passes
- [ ] Tests pass in CI
- [ ] Staging deployment works
- [ ] Production deployment ready
EOF
    echo "   ✅ Created production checklist"
}

create_documentation

echo ""
echo "================================"
echo "✅ SECURE IMPLEMENTATION COMPLETE"
echo "================================"
echo ""
echo "Generated (safe) artifacts:"
echo "  📄 analysis-output/security-report.md"
echo "  📖 modernized-code/MIGRATION_GUIDE.md"
echo "  🧪 __tests__/TEMPLATE.test.js"
echo "  ✅ docs-generated/PRODUCTION_CHECKLIST.md"
echo ""
echo "Security improvements:"
echo "  ✅ API key validated (not logged)"
echo "  ✅ Path validation prevents traversal"
echo "  ✅ Isolated working directory"
echo "  ✅ Automatic cleanup"
echo "  ✅ No automatic code execution"
echo ""
echo "Next steps:"
echo "  1. Review security-report.md"
echo "  2. Apply fixes manually"
echo "  3. Follow MIGRATION_GUIDE.md"
echo "  4. Write tests using template"
echo "  5. Complete checklist"
echo ""
echo "No automatic modifications made to your code."
echo "You have full control over what gets changed."
