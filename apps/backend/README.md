# Blockbuster Backend API

REST API server for the Blockbuster decentralized streaming platform.

## Architecture

```
apps/backend/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── app.ts                   # Express app configuration
│   ├── routes/                  # API route handlers
│   │   ├── auth.routes.ts      # Authentication endpoints
│   │   ├── membership.routes.ts # Membership management
│   │   ├── content.routes.ts   # Content catalog
│   │   ├── stream.routes.ts    # Streaming sessions
│   │   ├── upload.routes.ts    # Content upload
│   │   ├── revenue.routes.ts   # Revenue & earnings
│   │   └── analytics.routes.ts # Platform analytics
│   ├── services/               # Business logic layer
│   │   ├── suiBlockchain.service.ts  # Sui blockchain interactions
│   │   ├── walrus.service.ts         # Walrus storage client
│   │   ├── auth.service.ts           # Authentication
│   │   ├── content.service.ts        # Content management
│   │   ├── stream.service.ts         # Stream sessions
│   │   ├── upload.service.ts         # Video processing
│   │   ├── revenue.service.ts        # Revenue distribution
│   │   └── analytics.service.ts      # Analytics aggregation
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.ts  # JWT verification
│   │   ├── validation.middleware.ts # Request validation
│   │   ├── error.middleware.ts # Error handling
│   │   └── rateLimit.middleware.ts # Rate limiting
│   ├── models/                 # Database models (Prisma)
│   ├── utils/                  # Utility functions
│   │   ├── logger.ts          # Winston logger
│   │   ├── redis.ts           # Redis client
│   │   └── helpers.ts         # Common helpers
│   ├── config/                 # Configuration
│   │   ├── database.ts        # Database config
│   │   └── constants.ts       # App constants
│   ├── types/                  # TypeScript types
│   └── jobs/                   # Background jobs (Bull)
│       ├── transcoding.job.ts # Video transcoding
│       └── distribution.job.ts # Weekly revenue distribution
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts                # Database seeding
└── tests/                      # Unit and integration tests
```

## Services

### 1. Sui Blockchain Service
Handles all interactions with Sui blockchain:
- Mint/renew memberships
- Verify NFT ownership
- Register uploaders
- Record stream metrics on-chain
- Distribute revenue to creators

### 2. Walrus Storage Service
Manages decentralized file storage:
- Upload video files
- Generate streaming URLs
- Retrieve blob metadata
- Time-limited access tokens

### 3. Upload Service
Processes uploaded content:
- Video validation (FFprobe)
- Multi-quality transcoding (FFmpeg)
- Thumbnail extraction
- Walrus upload orchestration

### 4. Stream Service
Manages streaming sessions:
- Verify membership before streaming
- Generate time-limited URLs
- Track watch progress (heartbeats)
- Calculate completion rates

### 5. Revenue Service
Automates creator payouts:
- Weekly distribution cron job
- Weighted score calculation
- Parallel Sui transactions
- Payout notifications

## API Endpoints

### Authentication
```
POST   /api/auth/connect          - Wallet signature authentication
POST   /api/auth/verify            - Verify JWT token
POST   /api/auth/refresh           - Refresh access token
```

### Membership
```
GET    /api/membership/tiers       - Get tier info & pricing
POST   /api/membership/purchase    - Purchase membership NFT
GET    /api/membership/:nftId      - Get membership details
POST   /api/membership/renew       - Renew membership
GET    /api/membership/verify      - Verify membership status
```

### Content
```
GET    /api/content                - Browse content (paginated, filtered)
GET    /api/content/:id            - Get content details
GET    /api/content/search?q=      - Search content
GET    /api/content/featured       - Get featured content
GET    /api/content/genre/:genre   - Get content by genre
POST   /api/content/:id/rate       - Rate content (1-5 stars)
```

### Streaming
```
POST   /api/stream/start           - Start streaming session
POST   /api/stream/heartbeat       - Update watch progress (every 30s)
POST   /api/stream/end             - End streaming session
GET    /api/stream/history         - Get watch history
```

### Upload (Creator)
```
POST   /api/upload/register        - Register as uploader
POST   /api/upload/content         - Upload new content
GET    /api/upload/content/:id     - Get upload status
GET    /api/upload/analytics       - Creator dashboard metrics
```

### Revenue
```
GET    /api/revenue/pool           - Revenue pool statistics
GET    /api/revenue/earnings       - Creator earnings (lifetime & pending)
POST   /api/revenue/claim          - Claim pending earnings
GET    /api/revenue/distributions  - Distribution history
```

### Analytics (Admin)
```
GET    /api/analytics/platform     - Platform-wide metrics
GET    /api/analytics/content/:id  - Content-specific metrics
GET    /api/analytics/users        - User growth metrics
```

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- FFmpeg
- Sui CLI

### Installation

```bash
cd apps/backend
npm install

# Set up environment variables
cp ../../.env.example ../../.env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

### Running

```bash
# Development mode (hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## Database Schema

See `prisma/schema.prisma` for complete schema.

### Key Models

- **User**: Wallet addresses, profile info
- **Membership**: NFT ownership tracking
- **Content**: Movie catalog & metadata
- **Stream**: Session records for analytics
- **Uploader**: Creator accounts
- **Distribution**: Weekly payout history

## Background Jobs

### Video Transcoding Queue

Processes uploaded videos:
1. Validate source file
2. Transcode to multiple qualities (480p, 720p, 1080p, 4K)
3. Generate HLS manifests
4. Extract thumbnail
5. Upload to Walrus
6. Register on blockchain

### Revenue Distribution Cron

Runs weekly (Sunday 2:00 AM UTC):
1. Query all streams from past week
2. Calculate weighted scores per uploader
3. Distribute creator pool (70% of revenue)
4. Execute parallel Sui transactions
5. Send notification emails
6. Log distribution event

## Environment Variables

See `../../.env.example` for all required variables.

Key variables:
- `SUI_RPC_URL`: Sui blockchain endpoint
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `WALRUS_NODE_URL`: Walrus storage endpoint
- `JWT_SECRET`: JWT signing secret
- `PORT`: API server port (default 3001)

## Monitoring & Logging

### Logging
Uses Winston for structured logging:
- Console output (development)
- File rotation (production)
- Error tracking (Sentry)

### Metrics
- Request duration
- Database query time
- External API latency
- Queue job status

### Health Checks
```
GET /health         - Basic health check
GET /health/ready   - Readiness probe (DB, Redis, Sui)
GET /health/live    - Liveness probe
```

## Security

- **Helmet**: Security headers
- **CORS**: Configured origins only
- **Rate Limiting**: 100 req/min per IP
- **JWT**: 1-day expiry
- **Input Validation**: Joi schemas
- **SQL Injection**: Prisma ORM prevents
- **XSS**: Input sanitization

## Deployment

See `../../docs/DEPLOYMENT.md` for production deployment guide.

### Quick Deploy

```bash
# Build
npm run build

# Run migrations
npm run db:migrate

# Start server
npm start
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping

# Test connection
redis-cli -u $REDIS_URL ping
```

### FFmpeg Not Found
```bash
# Install FFmpeg (macOS)
brew install ffmpeg

# Install FFmpeg (Ubuntu)
sudo apt-get install ffmpeg
```

## API Documentation

Full API documentation available at:
- Development: http://localhost:3001/api-docs
- Production: https://api.blockbuster.app/api-docs

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Discord: [#backend channel](https://discord.gg/blockbuster)
