# Blockbuster Architecture

Comprehensive technical architecture documentation.

## System Overview

Blockbuster is a decentralized streaming platform built on three core layers:

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Web App    │  │  Mobile App  │  │  Desktop App │ │
│  │  (Next.js)   │  │(React Native)│  │   (Electron) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │          REST API (Node.js/Express)                │ │
│  │                                                    │ │
│  │  • Auth Service      • Stream Service            │ │
│  │  • Content Service   • Upload Service            │ │
│  │  • Revenue Service   • Analytics Service         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                 ↕                  ↕                  ↕
┌────────────────────┐  ┌────────────────┐  ┌────────────────┐
│  BLOCKCHAIN LAYER  │  │   DATA LAYER   │  │ STORAGE LAYER  │
│                    │  │                │  │                │
│  Sui Blockchain    │  │  PostgreSQL    │  │ Walrus         │
│  • Memberships     │  │  • Users       │  │ • Video files  │
│  • Revenue Pool    │  │  • Content     │  │ • Thumbnails   │
│  • Content Reg.    │  │  • Streams     │  │ • Metadata     │
│                    │  │  • Analytics   │  │                │
│                    │  │                │  │                │
│                    │  │  Redis         │  │                │
│                    │  │  • Cache       │  │                │
│                    │  │  • Sessions    │  │                │
└────────────────────┘  └────────────────┘  └────────────────┘
```

## Core Components

### 1. Sui Smart Contracts

**Three main packages:**

#### Membership Package
- **Purpose**: NFT-based access control
- **Key Objects**:
  - `MembershipNFT` (owned): User's membership card
  - `MemberRegistry` (shared): Global member tracking
  - `AdminCap` (owned): Platform admin privileges

#### Revenue Pool Package
- **Purpose**: 70/30 revenue distribution
- **Key Objects**:
  - `RevenuePool` (shared): Collects all subscription fees
  - `UploaderAccount` (owned): Creator earnings tracker
- **Features**:
  - Weighted scoring algorithm
  - Parallel distribution execution
  - Automatic weekly payouts

#### Content Registry Package
- **Purpose**: Global content catalog
- **Key Objects**:
  - `ContentRegistry` (shared): Platform-wide catalog
  - `ContentItem` (shared): Individual movie/show
  - `StreamSession` (owned): Viewing history
- **Features**:
  - Content moderation workflow
  - Rating system
  - Streaming metrics

### 2. Backend API Services

**Microservices architecture:**

#### Auth Service
- Wallet signature verification
- JWT token management
- Session handling

#### Content Service
- Browse/search content
- Content metadata retrieval
- Recommendations engine

#### Stream Service
- Session management
- Membership verification
- Progress tracking
- Walrus URL generation

#### Upload Service
- Video validation (FFprobe)
- Multi-quality transcoding (FFmpeg)
- Walrus storage orchestration
- Blockchain registration

#### Revenue Service
- Weekly distribution cron
- Weighted score calculation
- Parallel Sui transactions
- Payout notifications

#### Analytics Service
- Platform metrics aggregation
- Creator dashboards
- Real-time statistics

### 3. Frontend Application

**Next.js 14 App Router:**

#### Key Pages
- `/` - Homepage with hero, stats, membership tiers
- `/library` - Browse content with filters
- `/watch/[id]` - Video player with HLS streaming
- `/membership` - Purchase/manage membership
- `/uploader` - Creator dashboard

#### State Management
- **Zustand**: Client state (UI, user preferences)
- **React Query**: Server state (API data, caching)
- **Wallet Kit**: Sui wallet connection

#### Design System
- **Theme**: 80s Blockbuster aesthetic
- **Colors**: Neon pink, cyan, gold, navy
- **Typography**: Archivo Black (headings), Inter (body)
- **Animations**: Framer Motion for transitions

### 4. Data Storage

#### PostgreSQL (Relational Data)
- **Users**: Wallet addresses, profiles
- **Memberships**: NFT ownership tracking
- **Content**: Movie catalog (mirrors blockchain)
- **Streams**: Session logs for analytics
- **Uploaders**: Creator accounts
- **Distributions**: Payout history

#### Redis (Cache & Sessions)
- **Cache Keys**:
  - `content:{id}` - Content metadata
  - `membership:{nftId}` - Membership status
  - `stream:active:{userId}` - Active streams
- **Session Store**: JWT tokens, user sessions
- **Real-time Metrics**: Stream counts, concurrent viewers

#### Walrus (Decentralized Storage)
- **Video Files**: Original + transcoded versions
- **Thumbnails**: Poster images
- **Metadata**: Subtitles, audio tracks

## Data Flow Diagrams

### Streaming Session Flow

```
┌──────┐                                                    ┌──────────┐
│User  │                                                    │ Backend  │
└──┬───┘                                                    └────┬─────┘
   │                                                             │
   │  1. Click "Play" on movie                                  │
   ├────────────────────────────────────────────────────────────>
   │                                                             │
   │                 2. Verify membership NFT (Sui)             │
   │                    ┌──────────────────────┐                │
   │                    │  Sui Blockchain      │                │
   │                    │  • Check NFT exists  │<───────────────┤
   │                    │  • Check not expired │                │
   │                    │  • Check tier limits │────────────────>
   │                    └──────────────────────┘                │
   │                                                             │
   │         3. Generate Walrus streaming URL (JWT, 4hr)        │
   │<────────────────────────────────────────────────────────────┤
   │                                                             │
   │  4. Fetch HLS manifest                                     │
   ├─────────────────────────>┌──────────┐                      │
   │                          │ Walrus   │                      │
   │  5. Stream video chunks  │ Storage  │                      │
   │<─────────────────────────┤          │                      │
   │                          └──────────┘                      │
   │                                                             │
   │  6. Progress heartbeat (every 30s)                         │
   ├────────────────────────────────────────────────────────────>
   │                          7. Update Redis cache             │
   │                                                             │
   │  8. "End Stream"                                           │
   ├────────────────────────────────────────────────────────────>
   │                                                             │
   │           9. Record metrics on-chain (Sui)                 │
   │                    ┌──────────────────────┐                │
   │                    │  • Update membership │<───────────────┤
   │                    │  • Update content    │                │
   │                    │  • Update uploader   │                │
   │                    └──────────────────────┘                │
   │                                                             │
   │  10. Confirmation                                          │
   │<────────────────────────────────────────────────────────────┤
   │                                                             │
```

### Weekly Revenue Distribution

```
┌──────────┐                                        ┌──────────┐
│  Cron    │                                        │ Backend  │
│  Job     │                                        │ Service  │
└────┬─────┘                                        └────┬─────┘
     │                                                   │
     │  Sunday 2:00 AM UTC                              │
     ├───────────────────────────────────────────────────>
     │                                                   │
     │           1. Query last week's streams           │
     │              (PostgreSQL)                         │
     │              ┌────────────────┐                   │
     │              │ SELECT          │<──────────────────┤
     │              │  uploader_id,   │                   │
     │              │  content_id,    │                   │
     │              │  watch_duration,│                   │
     │              │  completion_%   │                   │
     │              │ FROM streams    │                   │
     │              │ WHERE created > │                   │
     │              │   7 days ago    │                   │
     │              └────────────────┘                   │
     │                                                   │
     │      2. Calculate weighted scores per uploader   │
     │         score = duration × completion_multiplier │
     │                                                   │
     │      3. Get creator pool (70% of weekly revenue) │
     │              ┌────────────────┐                   │
     │              │ Sui Blockchain │<──────────────────┤
     │              │ RevenuePool    │                   │
     │              │  .creator_pool │                   │
     │              └────────────────┘                   │
     │                                                   │
     │      4. Calculate each uploader's share          │
     │         share = (score/total_score) × pool       │
     │                                                   │
     │      5. Execute parallel Sui transactions        │
     │              ┌────────────────┐                   │
     │              │ Tx1: Uploader A│<──────────────────┤
     │              │ Tx2: Uploader B│<──────────────────┤
     │              │ Tx3: Uploader C│<──────────────────┤
     │              │ ... (parallel) │<──────────────────┤
     │              └────────────────┘                   │
     │                                                   │
     │      6. Log distributions (PostgreSQL)           │
     │                                                   │
     │      7. Send email notifications                 │
     │                                                   │
```

## Security Architecture

### Authentication Flow

```
User → Connect Wallet
     ↓
Backend verifies signature
     ↓
Generate JWT (1 day expiry)
     ↓
Store session in Redis
     ↓
Return token to frontend
     ↓
Frontend stores in localStorage
     ↓
Include in Authorization header
```

### Authorization Checks

**For streaming:**
1. JWT token valid?
2. Membership NFT exists?
3. Membership not expired?
4. Tier allows requested quality?
5. Concurrent stream limit not exceeded?

### Data Protection

- **TLS 1.3**: All client-server communication
- **Encrypted at Rest**: Walrus storage
- **Time-limited Tokens**: 4-hour streaming URLs
- **IP Hashing**: GDPR-compliant analytics
- **Rate Limiting**: 100 req/min per IP

## Scalability

### Horizontal Scaling

**Stateless Services:**
- Backend API: Scale to N replicas
- Frontend: CDN + multiple origins
- Load balancer distributes traffic

**Stateful Services:**
- PostgreSQL: Read replicas
- Redis: Redis Cluster (sharding)

### Sui Parallel Execution

**Key Advantage:**
```
Sequential (traditional):
Tx1 → Tx2 → Tx3 → ... → TxN
Time: N × tx_time

Parallel (Sui):
Tx1 ↘
Tx2 → Process → Result
Tx3 ↗
Time: ~tx_time (if no conflicts)
```

**Revenue distribution:**
- 500 uploaders
- Traditional: 500 × 3s = 25 minutes
- Sui parallel: ~3 seconds (owned objects)

### Caching Strategy

**Redis Cache:**
- Content metadata: 1 hour TTL
- Membership status: 5 minutes TTL
- Stream sessions: 4 hours TTL

**CDN Cache:**
- Static assets: 1 year
- API responses: No cache (dynamic)
- Video chunks: 7 days

## Monitoring & Observability

### Metrics

**Application Metrics:**
- Request rate, duration, error rate
- Active streams
- Database query time
- Cache hit rate

**Business Metrics:**
- New memberships/day
- Total streams/day
- Revenue collected
- Creator payouts

**Infrastructure Metrics:**
- CPU/memory usage
- Disk I/O
- Network bandwidth
- Container health

### Logging

**Structured Logs (Winston):**
```json
{
  "timestamp": "2025-01-12T10:30:00Z",
  "level": "info",
  "service": "stream-service",
  "event": "stream_started",
  "userId": "0x...",
  "contentId": "abc123",
  "tier": 2
}
```

**Log Aggregation:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Or: Datadog, New Relic, Grafana Loki

## Disaster Recovery

### Backup Strategy

**PostgreSQL:**
- Daily full backups
- Continuous WAL archiving
- 30-day retention
- Restore time: < 1 hour

**Redis:**
- RDB snapshots every 6 hours
- AOF (append-only file) for durability

**Blockchain:**
- No backup needed (immutable)
- Node sync from network

### Failover

**Database Failover:**
1. Detect primary failure (health check)
2. Promote read replica to primary
3. Update application config
4. Resume operations

**Application Failover:**
1. Load balancer detects unhealthy instance
2. Route traffic to healthy instances
3. Auto-scaling launches replacement
4. System self-heals

## Future Enhancements

### Phase 2 (Q2 2025)
- Mobile apps (iOS, Android)
- Offline viewing (encrypted downloads)
- Multi-language subtitles
- Chromecast/AirPlay support

### Phase 3 (Q3 2025)
- DAO governance
- Community moderation
- BLOCK token launch
- Staking rewards

### Phase 4 (Q4 2025)
- Creator workshops/events
- NFT collectibles marketplace
- Live streaming support
- Social features (comments, reviews)

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [API Reference](../apps/backend/README.md)
- [Smart Contracts](../contracts/sui-contracts/README.md)
- [Frontend Guide](../apps/frontend/README.md)
