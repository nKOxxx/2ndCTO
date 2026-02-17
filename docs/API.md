# API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
Currently no authentication required for public repos. Private repo access via GitHub OAuth (coming soon).

---

## Repositories

### Add Repository
```http
POST /repos
```

**Request Body:**
```json
{
  "owner": "facebook",
  "name": "react"
}
```

**Response:**
```json
{
  "success": true,
  "repo": {
    "id": "uuid",
    "owner": "facebook",
    "name": "react",
    "status": "queued"
  }
}
```

### List Repositories
```http
GET /repos
```

**Response:**
```json
{
  "repos": [
    {
      "id": "uuid",
      "owner": "facebook",
      "name": "react",
      "status": "completed",
      "risk_score": 45
    }
  ]
}
```

### Get Repository Status
```http
GET /repos/:id/status
```

**Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "risk_score": 45,
  "last_analyzed": "2026-02-17T12:00:00Z"
}
```

### Get Full Report
```http
GET /repos/:id/report
```

**Response:**
```json
{
  "repo": {
    "id": "uuid",
    "owner": "facebook",
    "name": "react",
    "language": "JavaScript",
    "stars": 220000
  },
  "analysis": {
    "status": "completed",
    "risk_score": 45,
    "last_analyzed": "2026-02-17T12:00:00Z"
  },
  "security": {
    "summary": {
      "critical": 0,
      "high": 3,
      "medium": 12,
      "low": 5,
      "total": 20
    },
    "top_findings": [...]
  },
  "entities": {
    "total": 5000,
    "functions": 3500,
    "classes": 1500
  }
}
```

---

## Bus Factor

### Get Bus Factor
```http
GET /repos/:id/bus-factor
```

**Response:**
```json
{
  "repo_id": "uuid",
  "owner": "facebook",
  "name": "react",
  "bus_factor": 4.2,
  "measured_at": "2026-02-17T12:00:00Z",
  "status": "calculated"
}
```

---

## AI Insights

### Get AI Insights
```http
GET /repos/:id/insights
```

**Response:**
```json
{
  "summary": {
    "grade": { "letter": "B", "label": "Good", "color": "good" },
    "score": 45,
    "text": "Good codebase with minor improvements needed.",
    "tone": "positive"
  },
  "priorities": [
    {
      "rank": 1,
      "title": "Fix 3 high security issues",
      "impact": "Reduces risk by ~15 points",
      "effort": "1-2 days",
      "type": "security"
    }
  ],
  "recommendations": [
    {
      "title": "Implement Code Review Automation",
      "description": "Add security scanning to CI/CD",
      "timeline": "1 week",
      "impact": "Prevents 80% of issues"
    }
  ]
}
```

---

## Trends

### Get Repository Trends
```http
GET /repos/:id/trends?days=30
```

**Response:**
```json
{
  "repo_id": "uuid",
  "period_days": 30,
  "data_points": 5,
  "latest": {
    "bus_factor": 4.2,
    "risk_score": 45,
    "total_findings": 20
  },
  "trends": {
    "bus_factor": { "change": 0.5, "direction": "improving" },
    "risk_score": { "change": -10, "direction": "improving" }
  },
  "history": [...]
}
```

### Get Global Trends
```http
GET /trends
```

**Response:**
```json
{
  "repos_analyzed": 10,
  "summary": {
    "avg_bus_factor": 2.8,
    "avg_risk_score": 55,
    "critical_bus_factor_repos": 2,
    "total_findings": 350
  }
}
```

---

## Code Modernization

### Start Modernization
```http
POST /repos/:id/modernize
```

**Request Body:**
```json
{
  "target_language": "es2022",
  "transformations": ["callbacks", "vars", "functions", "modules"],
  "files": ["src/utils.js", "src/api.js"]
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "uuid",
  "message": "Modernization job queued",
  "files_to_process": 2,
  "estimated_time": "1 minutes"
}
```

### Get Modernization Status
```http
GET /modernize/:jobId
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "progress": 100,
  "files_processed": 2,
  "files_total": 2,
  "results": {...}
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Description of what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `404` - Repository not found
- `500` - Server error

---

## Rate Limits

- Public repos: 60 requests/minute
- Analysis jobs: 5 concurrent per IP

## WebSocket Events

Connect to `ws://localhost:3001` for real-time updates:

```javascript
const socket = io();
socket.emit('subscribe', 'repo-id');
socket.on('analysis:progress', (data) => {
  console.log(data.progress + '%');
});
```
