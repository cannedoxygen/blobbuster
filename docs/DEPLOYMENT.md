# Blockbuster Deployment Guide

Complete guide for deploying Blockbuster to production.

## Prerequisites

- Sui CLI installed and configured
- Docker and Docker Compose
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Domain name configured

## Step 1: Deploy Smart Contracts

### 1.1 Build Contracts

```bash
cd contracts/sui-contracts
sui move build
```

### 1.2 Run Tests

```bash
sui move test
```

### 1.3 Deploy to Mainnet

```bash
# Switch to mainnet
sui client switch --env mainnet

# Verify your address has sufficient SUI
sui client gas

# Deploy contracts
sui client publish --gas-budget 100000000

# Save the package IDs from output
export MEMBERSHIP_PACKAGE_ID=0x...
export REVENUE_POOL_PACKAGE_ID=0x...
export CONTENT_REGISTRY_PACKAGE_ID=0x...
```

### 1.4 Initialize Contracts

```bash
# Initialize Membership Registry
sui client call \
  --package $MEMBERSHIP_PACKAGE_ID \
  --module membership \
  --function initialize \
  --gas-budget 10000000

# Initialize Revenue Pool
sui client call \
  --package $REVENUE_POOL_PACKAGE_ID \
  --module revenue_pool \
  --function initialize_pool \
  --gas-budget 10000000

# Initialize Content Registry
sui client call \
  --package $CONTENT_REGISTRY_PACKAGE_ID \
  --module content_registry \
  --function initialize_registry \
  --gas-budget 10000000
```

### 1.5 Save Object IDs

From the transaction outputs, save:
- `MEMBER_REGISTRY_OBJECT_ID`
- `REVENUE_POOL_OBJECT_ID`
- `CONTENT_REGISTRY_OBJECT_ID`
- `ADMIN_CAP_OBJECT_ID`

## Step 2: Set Up Infrastructure

### 2.1 Provision Servers

**Option A: AWS**
- EC2 instance: t3.large (2 vCPU, 8GB RAM)
- RDS PostgreSQL: db.t3.medium
- ElastiCache Redis: cache.t3.micro
- S3 bucket for backups

**Option B: DigitalOcean**
- Droplet: 4GB RAM, 2 vCPUs
- Managed PostgreSQL: 4GB
- Managed Redis: 1GB

### 2.2 Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2.3 Configure Firewall

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (be careful!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Step 3: Configure Environment

### 3.1 Create Production .env

```bash
# On your server
nano .env.production
```

```env
NODE_ENV=production

# Sui Blockchain
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
SUI_NETWORK=mainnet
SUI_PRIVATE_KEY=your_base64_private_key

# Deployed Contracts
MEMBERSHIP_PACKAGE_ID=0x...
REVENUE_POOL_PACKAGE_ID=0x...
CONTENT_REGISTRY_PACKAGE_ID=0x...
MEMBER_REGISTRY_OBJECT_ID=0x...
REVENUE_POOL_OBJECT_ID=0x...
CONTENT_REGISTRY_OBJECT_ID=0x...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379

# Walrus
WALRUS_NODE_URL=https://walrus.example.com

# Security
JWT_SECRET=<generate_strong_secret>
SESSION_SECRET=<generate_strong_secret>

# API
PORT=3001
CORS_ORIGIN=https://blockbuster.app

# Frontend
NEXT_PUBLIC_API_URL=https://api.blockbuster.app
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
```

## Step 4: Deploy Application

### 4.1 Clone Repository

```bash
git clone <repository-url>
cd buster
```

### 4.2 Build with Docker Compose

```bash
# Copy production env
cp .env.production .env

# Build and start services
docker-compose up -d --build
```

### 4.3 Run Database Migrations

```bash
docker-compose exec backend npm run db:migrate
```

### 4.4 Verify Deployment

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Health check
curl http://localhost:3001/health
curl http://localhost:3000
```

## Step 5: Configure Reverse Proxy (Nginx)

### 5.1 Install Nginx

```bash
sudo apt install nginx
```

### 5.2 Configure Sites

```nginx
# /etc/nginx/sites-available/blockbuster

# API Server
server {
    listen 80;
    server_name api.blockbuster.app;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name blockbuster.app www.blockbuster.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.3 Enable Sites

```bash
sudo ln -s /etc/nginx/sites-available/blockbuster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: Configure SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d blockbuster.app -d www.blockbuster.app
sudo certbot --nginx -d api.blockbuster.app

# Auto-renewal (cron will be configured automatically)
sudo certbot renew --dry-run
```

## Step 7: Set Up Monitoring

### 7.1 Install Prometheus

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/infrastructure/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 7.2 Install Grafana

```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

### 7.3 Configure Alerting

Set up alerts for:
- High error rates
- Database connection issues
- Sui RPC failures
- Disk space warnings

## Step 8: Backup Strategy

### 8.1 Database Backups

```bash
# Daily backups (cron)
0 2 * * * docker-compose exec -T postgres pg_dump -U blockbuster blockbuster_db | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Retention: Keep last 30 days
find /backups -name "db-*.sql.gz" -mtime +30 -delete
```

### 8.2 Environment Backups

```bash
# Backup .env and docker-compose.yml
cp .env /backups/env-$(date +%Y%m%d)
cp docker-compose.yml /backups/compose-$(date +%Y%m%d).yml
```

## Step 9: Monitoring & Maintenance

### 9.1 Log Management

```bash
# View logs
docker-compose logs -f --tail=100 backend

# Rotate logs (configure logrotate)
sudo nano /etc/logrotate.d/docker-containers
```

### 9.2 Health Checks

Set up uptime monitoring:
- UptimeRobot
- Pingdom
- StatusCake

Monitor:
- API endpoint: `https://api.blockbuster.app/health`
- Frontend: `https://blockbuster.app`

### 9.3 Performance Monitoring

Tools:
- Sentry (error tracking)
- Datadog (APM)
- New Relic (performance)

## Step 10: Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3

frontend:
  deploy:
    replicas: 2
```

### Load Balancer

Use Nginx load balancing:

```nginx
upstream backend_servers {
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

server {
    location / {
        proxy_pass http://backend_servers;
    }
}
```

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database connection failed
# - Missing environment variables
# - Port already in use
```

### Database Migration Failed

```bash
# Reset migrations
docker-compose exec backend npx prisma migrate reset

# Re-run migrations
docker-compose exec backend npx prisma migrate deploy
```

### High Memory Usage

```bash
# Check memory
docker stats

# Increase container limits
# In docker-compose.yml:
services:
  backend:
    mem_limit: 2g
```

## Security Checklist

- [ ] SSL certificates configured
- [ ] Firewall rules configured
- [ ] Database backups automated
- [ ] Environment variables secured
- [ ] Admin capabilities secured (multi-sig)
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] SSH key-only authentication
- [ ] Regular security updates scheduled

## Post-Deployment

### 1. Verify All Systems

```bash
# Check all services
./scripts/health-check.sh

# Run integration tests
npm run test:e2e
```

### 2. Monitor for 48 Hours

Watch for:
- Error rates
- Response times
- Database performance
- Memory/CPU usage

### 3. Marketing Launch

Once stable:
- Announce on social media
- Update documentation
- Notify beta users
- Press release

## Rollback Procedure

If deployment fails:

```bash
# Stop current version
docker-compose down

# Checkout previous version
git checkout <previous-tag>

# Rebuild and restart
docker-compose up -d --build

# Restore database if needed
gunzip < /backups/db-latest.sql.gz | docker-compose exec -T postgres psql -U blockbuster blockbuster_db
```

## Support

For deployment issues:
- GitHub Issues: [Create issue](https://github.com/your-repo/issues)
- Discord: #deployment channel
- Email: devops@blockbuster.app
