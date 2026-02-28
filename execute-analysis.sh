#!/bin/bash
# Execute 2ndCTO analysis using Kimi-powered agents
# This runs the actual analysis tasks

set -e

cd ~/.openclaw/workspace/projects/2ndCTO

echo "🚀 Executing 2ndCTO Analysis with Kimi Agents"
echo "==============================================="
echo ""

# Check for API key
if [ -z "$MOONSHOT_API_KEY" ]; then
    echo "❌ MOONSHOT_API_KEY not set"
    echo "Set it with: export MOONSHOT_API_KEY='your-key'"
    exit 1
fi

echo "✅ Using Moonshot (Kimi) API"
echo ""

# Create output directories
mkdir -p analysis-output
mkdir -p modernized-code
mkdir -p docs-generated
mkdir -p tests-generated

echo "📊 Starting 5-Way Parallel Analysis..."
echo ""

# Function to run analysis with Kimi
run_kimi_analysis() {
    local task_name=$1
    local task_file=$2
    local output_file=$3
    
    echo "🔍 $task_name..."
    
    # Read the codebase
    local codebase=$(find src -name "*.js" -type f | head -20 | xargs cat 2>/dev/null | head -5000)
    
    # Read task description
    local task_desc=$(cat "$task_file")
    
    # Call Kimi API
    curl -s https://api.moonshot.ai/v1/chat/completions \
      -H "Authorization: Bearer $MOONSHOT_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"kimi-k2.5\",
        \"messages\": [
          {\"role\": \"system\", \"content\": \"You are a senior software engineer analyzing codebases. Provide detailed, actionable recommendations with code examples.\"},
          {\"role\": \"user\", \"content\": \"Task: $task_desc\\n\\nCodebase: $codebase\\n\\nPlease provide your analysis and recommendations.\"}
        ],
        \"max_tokens\": 8000,
        \"temperature\": 0.7
      }" > "$output_file"
    
    echo "  ✅ Results saved to $output_file"
}

# Run all 5 analyses in parallel
echo "Starting parallel analysis..."
echo ""

# Architecture Review
run_kimi_analysis \
    "Architecture Review" \
    "tasks/architecture-review.md" \
    "analysis-output/architecture-analysis.json" &
ARCH_PID=$!

# Security Audit  
run_kimi_analysis \
    "Security Audit" \
    "tasks/security-audit.md" \
    "analysis-output/security-audit.json" &
SEC_PID=$!

# Code Modernization
run_kimi_analysis \
    "Code Modernization" \
    "tasks/code-modernization.md" \
    "modernized-code/modernization-plan.json" &
MOD_PID=$!

# Documentation
run_kimi_analysis \
    "Documentation Generation" \
    "tasks/documentation.md" \
    "docs-generated/documentation-plan.json" &
DOC_PID=$!

# Testing
run_kimi_analysis \
    "Test Suite Generation" \
    "tasks/testing.md" \
    "tests-generated/test-plan.json" &
TEST_PID=$!

echo "All 5 analyses running in parallel..."
echo "PIDs: $ARCH_PID $SEC_PID $MOD_PID $DOC_PID $TEST_PID"
echo ""

# Wait for all to complete
echo "Waiting for analyses to complete..."
wait $ARCH_PID
echo "  ✅ Architecture review complete"

wait $SEC_PID
echo "  ✅ Security audit complete"

wait $MOD_PID
echo "  ✅ Code modernization complete"

wait $DOC_PID
echo "  ✅ Documentation generation complete"

wait $TEST_PID
echo "  ✅ Test generation complete"

echo ""
echo "==============================================="
echo "✅ ALL ANALYSES COMPLETE!"
echo "==============================================="
echo ""
echo "Results saved:"
echo "  📐 analysis-output/architecture-analysis.json"
echo "  🔒 analysis-output/security-audit.json"
echo "  🚀 modernized-code/modernization-plan.json"
echo "  📝 docs-generated/documentation-plan.json"
echo "  🧪 tests-generated/test-plan.json"
echo ""
echo "Next step: Process and apply the recommendations"
echo "Run: ./apply-recommendations.sh"
