#!/bin/bash
# Start 2ndCTO services

cd /Users/ares/.openclaw/workspace/projects/2ndCTO

# Kill existing
pkill -f "nodemon\|node src/index.js\|node src/queue/worker" 2>/dev/null
sleep 2

# Start API on port 3001
PORT=3001 npm run dev > /tmp/2ndcto-api.log 2>&1 &
echo "API started on port 3001 (PID: $!)"

sleep 3

# Start Worker
npm run worker > /tmp/2ndcto-worker.log 2>&1 &
echo "Worker started (PID: $!)"

sleep 2

# Test
curl -s http://localhost:3001/api/health
