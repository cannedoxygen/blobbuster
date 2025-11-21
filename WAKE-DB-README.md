# Database Wake-Up Guide

Your database goes to sleep after periods of inactivity. Use these methods to wake it up:

## Quick Methods

### Option 1: NPM Command (Easiest)
```bash
npm run wake-db
```

### Option 2: Bash Script
```bash
./wake-db.sh
```

### Option 3: Node.js Script
```bash
node wake-db.js
```

### Option 4: Direct cURL
```bash
curl https://bedding-mega-zen-perl.trycloudflare.com/health
```

## What It Does

The wake-up scripts ping the `/health` endpoint which:
- Executes `SELECT 1` query on the database
- Wakes up sleeping database connections
- Returns status confirmation

## Expected Output

When successful, you'll see:
```
✅ Database is awake and connected!

Status: ok
Database: connected
Timestamp: 2025-11-21T03:56:37.680Z
Uptime: 87 seconds
```

## Automation (Optional)

To keep the database always awake, set up a cron job or scheduled task:

### macOS/Linux Cron
```bash
# Edit crontab
crontab -e

# Add this line to ping every 5 minutes
*/5 * * * * curl -s https://bedding-mega-zen-perl.trycloudflare.com/health > /dev/null
```

### GitHub Actions (Free)
Create `.github/workflows/wake-db.yml`:
```yaml
name: Keep Database Awake
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  wake:
    runs-on: ubuntu-latest
    steps:
      - name: Ping database
        run: curl -s ${{ secrets.BACKEND_URL }}/health
```

### UptimeRobot (Free Service)
1. Go to https://uptimerobot.com
2. Add new monitor
3. URL: `https://bedding-mega-zen-perl.trycloudflare.com/health`
4. Interval: 5 minutes
5. Free tier keeps your database awake 24/7
