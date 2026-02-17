# Deployment Guide

## Render.com (Recommended)

### 1. Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (nKOxxx/2ndCTO)
4. Configure:
   - **Name**: `2ndcto-api`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2. Environment Variables

Add these in Render dashboard:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_key
REDIS_URL=your_redis_url
GITHUB_TOKEN=your_github_token
```

### 3. Deploy

Click "Create Web Service". Render will:
- Build your app
- Deploy to `<service-name>.onrender.com`
- Provide SSL automatically

### 4. Free Tier Notes

- Service sleeps after 15 min inactivity
- Wakes on next request (~30s cold start)
- Set up cron job to keep alive (see below)

---

## Railway

1. Go to [Railway](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Add PostgreSQL and Redis plugins
4. Deploy automatically

---

## VPS (DigitalOcean, AWS, etc.)

### 1. Server Setup

```bash
# Ubuntu 22.04
sudo apt update
sudo apt install -y nodejs npm nginx redis-server

# Clone repo
git clone https://github.com/nKOxxx/2ndCTO.git
cd 2ndCTO
npm install --production

# Set up environment
sudo nano .env

# Start with PM2
npm install -g pm2
pm2 start src/index.js --name 2ndcto
pm2 startup
pm2 save
```

### 2. Nginx Config

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Docker

### Build and Run

```bash
# Build image
docker build -t 2ndcto:latest .

# Run container
docker run -d \
  -p 3001:3001 \
  --env-file .env \
  --name 2ndcto \
  2ndcto:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

---

## Keep-Alive (For Free Tiers)

Create a cron job to ping your service every 10 minutes:

```bash
# Edit crontab
crontab -e

# Add line:
*/10 * * * * curl -s https://your-service.onrender.com/api/health > /dev/null
```

Or use a service like [UptimeRobot](https://uptimerobot.com) (free).

---

## Database Setup

### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run scripts from `scripts/` folder:
   - `init-schema.sql`
   - `week2_redis_and_jobs.sql`
   - `week3-modernization-schema.sql`
4. Copy Project URL and Service Role Key to env vars

### Self-Hosted PostgreSQL

```bash
# Create database
createdb 2ndcto

# Run migrations
psql -d 2ndcto -f scripts/init-schema.sql
psql -d 2ndcto -f scripts/week2_redis_and_jobs.sql
psql -d 2ndcto -f scripts/week3-modernization-schema.sql
```

---

## Monitoring

### Logs

```bash
# View logs
pm2 logs 2ndcto

# Or with Docker
docker logs -f 2ndcto
```

### Health Check

```bash
curl https://your-domain.com/api/health
```

Should return:
```json
{"status":"ok","service":"2ndCTO","version":"0.2.0"}
```

---

## Troubleshooting

### Build Failures

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Issues

1. Check environment variables are set
2. Verify Supabase IP allowlist includes your server
3. Test connection: `psql $SUPABASE_URL`

### Redis Connection Issues

1. For Upstash: Ensure TLS is enabled in connection URL
2. Check firewall rules allow outbound connections
3. Test: `redis-cli -u $REDIS_URL ping`

### High Memory Usage

- Reduce `MAX_REPO_SIZE_MB` in env
- Limit concurrent jobs in worker
- Enable Redis key expiration

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis connected
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Keep-alive ping set up
- [ ] Error tracking (Sentry recommended)
- [ ] Analytics (optional)
- [ ] Backup strategy for database
