# BLOCKBUSTER: DECENTRALIZED STREAMING ON SUI
## Complete Master Plan & Technical Specification

> **"The Blockbuster They Can't Kill" - Built on Sui Blockchain**

**Version:** 1.0
**Created:** 2025-11-13
**Project Duration:** 12-16 weeks
**Budget:** $120,000 - $180,000

---

## EXECUTIVE SUMMARY

### Vision

Blockbuster is a decentralized peer-to-peer movie streaming platform that reimagines the classic video rental experience for the Web3 era. Built on Sui blockchain, it enables content collectors to monetize their personal movie libraries while providing members with access to a global catalog of films through NFT-based membership tiers.

### The Problem

- **Traditional streaming:** Platforms like Netflix keep 90%+ of revenue, creators get pennies
- **Current Web3 solutions:** Complex, poor UX, high gas fees, slow transactions
- **Content ownership:** Centralized platforms control everything, can remove content arbitrarily
- **Fair compensation:** No transparent revenue sharing for content providers

### The Solution

A decentralized streaming platform where:
- **Members** pay monthly subscriptions (Basic, Premium, Collector tiers) in SUI
- **Content creators** earn 70% of revenue based on viewing performance
- **Platform** takes 30% for operations
- **Transparent** all payments and metrics tracked on-chain
- **Censorship-resistant** content stored on Walrus Protocol
- **Fair compensation** weighted scoring rewards quality content (completion bonuses)

### Why Sui?

**Perfect Fit for Streaming:**
1. **Parallel Execution** - 1000+ concurrent streams without bottlenecks
2. **Object-Centric Model** - NFT memberships are native first-class objects
3. **Low Latency** - 2-3 second finality acceptable for streaming
4. **Predictable Gas** - Stable costs for subscription pricing
5. **Move Language** - Resource safety prevents double-spending, reentrancy
6. **Walrus Integration** - Both developed by Mysten Labs, tight ecosystem
7. **Scalability** - Designed for 100k+ TPS (future-proof)

### Core Metrics (12-Month Projections)

- **Users:** 10,000 paid members
- **Creators:** 500 content uploaders
- **Content:** 5,000 movies/shows
- **Monthly Revenue:** 500,000 SUI (~$500k at $1/SUI)
- **Creator Payouts:** 350,000 SUI/month (70%)
- **Platform Revenue:** 150,000 SUI/month (30%)

---

## TABLE OF CONTENTS

1. [Product Specification](#product-specification)
2. [Business Model & Tokenomics](#business-model--tokenomics)
3. [Technical Architecture](#technical-architecture)
4. [Sui Smart Contracts (Move)](#sui-smart-contracts-move)
5. [Backend Infrastructure](#backend-infrastructure)
6. [Frontend Application](#frontend-application)
7. [Walrus Storage Integration](#walrus-storage-integration)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Team & Resources](#team--resources)
10. [Budget & Financials](#budget--financials)
11. [Go-to-Market Strategy](#go-to-market-strategy)
12. [Risk Analysis](#risk-analysis)

---

## PRODUCT SPECIFICATION

### User Personas

**1. The Viewer (Sarah, 28, Netflix refugee)**
- Wants: Ad-free streaming, diverse content, fair pricing
- Pain: Netflix keeps raising prices, removing favorite shows
- Blockbuster Solution: $10-50/month in SUI, access 5000+ movies, vote on content

**2. The Creator (Mike, 35, movie collector)**
- Wants: Monetize 500-movie Plex library gathering dust
- Pain: No way to earn from personal collection
- Blockbuster Solution: Upload library, earn 70% of streaming revenue automatically

**3. The Crypto Native (Alex, 24, Web3 enthusiast)**
- Wants: Own membership NFT, participate in DAO, transparent economics
- Pain: Most Web3 apps are speculation, not utility
- Blockbuster Solution: Real use case, tradeable membership NFTs, on-chain governance

### Feature Set

#### Phase 1: Core Platform (Weeks 1-8)

**For Viewers:**
- ✅ NFT-based membership (Basic, Premium, Collector)
- ✅ Browse 1000+ movies by genre, year, rating
- ✅ HLS adaptive streaming (480p to 4K)
- ✅ Watchlist and favorites
- ✅ Continue watching
- ✅ Content ratings and reviews
- ✅ Search and filters

**For Creators:**
- ✅ Upload movies with metadata
- ✅ Automatic transcoding (multiple qualities)
- ✅ Earnings dashboard
- ✅ Analytics (views, watch time, completion rate)
- ✅ Weekly automated payouts in SUI

**Platform:**
- ✅ Admin content moderation (Pending → Active)
- ✅ Revenue pool management
- ✅ Analytics dashboard
- ✅ User management

#### Phase 2: Advanced Features (Weeks 9-12)

**Social & Community:**
- 🔄 User profiles and avatars
- 🔄 Follow favorite creators
- 🔄 Comments and discussions
- 🔄 Community content curation
- 🔄 Social sharing

**Enhanced Streaming:**
- 🔄 Download for offline (encrypted)
- 🔄 Multiple audio tracks
- 🔄 Subtitles (SRT upload)
- 🔄 Chromecast support
- 🔄 Picture-in-picture

**Monetization 2.0:**
- 🔄 Pay-per-view for new releases
- 🔄 Creator tips/donations
- 🔄 NFT collectibles (movie posters)
- 🔄 Referral rewards

#### Phase 3: DAO & Governance (Weeks 13-16)

**Decentralization:**
- 🔄 DAO voting on platform changes
- 🔄 Community content moderation
- 🔄 Revenue split adjustments via voting
- 🔄 Treasury management
- 🔄 Grant program for creators

### Membership Tiers

| Tier | Price/Month | Benefits |
|------|-------------|----------|
| **Basic** | 100 SUI (~$100) | HD streaming (720p, 1080p), 5 concurrent streams, standard library access |
| **Premium** | 250 SUI (~$250) | 4K streaming, 15 concurrent streams, early access to new content, download for offline |
| **Collector** | 500 SUI (~$500) | 4K HDR, unlimited streams, exclusive content, DAO voting rights, creator workshops, NFT collectibles |

**Annual Plans:** 10% discount (pay 11 months, get 12)

### Content Categories

- **Movies:** Action, Comedy, Drama, Horror, Sci-Fi, Romance, Thriller, Documentary, Animation, Family
- **TV Shows:** Series with episode tracking
- **Shorts:** Independent films under 30 minutes
- **Classics:** Public domain and licensed classics
- **Exclusives:** Blockbuster originals

### User Experience Flow

**New User Journey:**
```
1. Visit blockbuster.app
2. Connect Sui Wallet (or create with Ethos)
3. Browse free preview content
4. Purchase membership NFT (Basic tier)
5. Transaction confirms in ~3 seconds
6. Instant access to full library
7. Watch first movie
8. Rate and review
9. Add to watchlist
10. Week later: continue watching, discover more
```

**Creator Journey:**
```
1. Connect wallet
2. Register as uploader (on-chain)
3. Upload first movie (MP4/MKV)
4. Fill metadata (title, description, genre)
5. Platform transcodes to multiple qualities
6. Uploads to Walrus storage
7. Submit for approval
8. Admin approves → Status: Active
9. Viewers start streaming
10. Weekly automated payout in SUI
11. Dashboard shows earnings, analytics
```

---

## BUSINESS MODEL & TOKENOMICS

### Revenue Model

**Primary Revenue: Membership Subscriptions**

Monthly revenue projection (Year 1):
- 5,000 Basic members × 100 SUI = 500,000 SUI
- 3,000 Premium members × 250 SUI = 750,000 SUI
- 2,000 Collector members × 500 SUI = 1,000,000 SUI
- **Total:** 2,250,000 SUI/month (~$2.25M at $1/SUI)

**70/30 Revenue Split:**
- **70% to Creators:** 1,575,000 SUI/month
- **30% to Platform:** 675,000 SUI/month

**Platform Operating Costs:**
- Walrus storage: ~50,000 SUI/month
- Bandwidth: ~30,000 SUI/month
- Development team: ~200,000 SUI/month
- Marketing: ~100,000 SUI/month
- Operations: ~50,000 SUI/month
- **Total Costs:** ~430,000 SUI/month
- **Net Profit:** ~245,000 SUI/month (~$245k)

### Creator Revenue Distribution

**Weighted Scoring Algorithm:**

Each stream generates a score based on watch completion:
- **80-100% watched:** 1.5x multiplier (50% bonus)
- **50-79% watched:** 1.25x multiplier (25% bonus)
- **0-49% watched:** 1.0x base score (no bonus)

**Formula:**
```
weighted_score = watch_duration_seconds × completion_multiplier

uploader_earnings = (uploader_total_score / platform_total_score) × weekly_creator_pool
```

**Example:**
```
Creator A: 10,000 streams, avg 90% completion
  Score = 10,000 × 5400s × 1.5 = 81,000,000

Creator B: 5,000 streams, avg 40% completion
  Score = 5,000 × 2400s × 1.0 = 12,000,000

Platform Total Score = 500,000,000

Creator A earnings = (81M / 500M) × 1,575,000 SUI = 255,150 SUI/month
Creator B earnings = (12M / 500M) × 1,575,000 SUI = 37,800 SUI/month
```

**Anti-Gaming Measures:**
- Minimum 5-minute watch time to count
- IP address hashing to detect duplicate views
- Gradual completion bonus (not binary)
- Outlier detection (abnormal patterns flagged)

### Token Economics (Future BLOCK Token - Phase 3)

**Total Supply:** 1,000,000,000 BLOCK

**Distribution:**
- 40% - Community rewards and ecosystem growth (vested over 4 years)
- 25% - Development team (4-year vesting, 1-year cliff)
- 20% - Public sale and liquidity (10% TGE, rest over 2 years)
- 10% - Marketing and partnerships (2-year vesting)
- 5% - Reserve fund (DAO controlled)

**Token Utility:**
1. **Subscriptions:** Pay memberships in BLOCK (10% discount)
2. **Governance:** Vote on platform changes (1 BLOCK = 1 vote)
3. **Staking:** Earn rewards for locking BLOCK (5-15% APY)
4. **Creator Boost:** Stake BLOCK to boost content visibility
5. **NFT Minting:** Required for premium NFT collectibles

**Token Launch:** Month 6-9 after platform launch

---

## TECHNICAL ARCHITECTURE

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER LAYER                               │
│  Web App (Next.js) | Mobile App (React Native) | Desktop     │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY (NGINX)                       │
│              Load Balancer | Rate Limiting | SSL            │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│               BACKEND SERVICES (Node.js)                     │
├─────────────────────────────────────────────────────────────┤
│  Auth Service | Content Service | Stream Service            │
│  Revenue Service | Analytics Service | Notification Service │
└─────────────────────────────────────────────────────────────┘
         ↕                    ↕                    ↕
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  SUI BLOCKCHAIN  │  │  POSTGRESQL  │  │ WALRUS STORAGE   │
│                  │  │              │  │                  │
│ • Membership NFT │  │ • Users      │  │ • Video files    │
│ • Revenue Pool   │  │ • Content    │  │ • Thumbnails     │
│ • Content Reg.   │  │ • Streams    │  │ • Metadata       │
│                  │  │ • Analytics  │  │                  │
└──────────────────┘  └──────────────┘  └──────────────────┘
         ↕                    ↕
┌──────────────────┐  ┌──────────────┐
│      REDIS       │  │   EVENTS     │
│  Session Cache   │  │   Message    │
│  Metrics Cache   │  │   Queue      │
└──────────────────┘  └──────────────┘
```

### Technology Stack

**Blockchain Layer:**
- **Sui Blockchain** - Smart contract platform
- **Move Language** - Contract development
- **Sui CLI** - Deployment and testing

**Storage Layer:**
- **Walrus Protocol** - Decentralized video storage
- **PostgreSQL 15** - Relational database (metadata, analytics)
- **Redis 7** - Cache and session management

**Backend:**
- **Node.js 20** - Runtime
- **Express.js** - REST API framework
- **TypeScript** - Type safety
- **@mysten/sui.js** - Sui blockchain SDK
- **FFmpeg** - Video transcoding
- **Bull** - Job queue for async tasks
- **Winston** - Logging
- **Joi** - Validation

**Frontend:**
- **Next.js 14** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling (80s Blockbuster theme)
- **@mysten/wallet-kit** - Sui wallet integration
- **Video.js** - HLS video player
- **Framer Motion** - Animations
- **React Query** - Data fetching
- **Zustand** - State management

**Infrastructure:**
- **Docker** - Containerization
- **Kubernetes** - Orchestration (production)
- **NGINX** - Reverse proxy and load balancing
- **Cloudflare** - CDN and DDoS protection
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards
- **Sentry** - Error tracking

### Data Flow

**Streaming Session:**
```
1. User clicks "Play" on movie
2. Frontend → Backend: POST /api/stream/start
3. Backend verifies:
   - User has active membership NFT (Sui query)
   - Membership tier allows quality (4K vs HD)
   - Concurrent stream limit not exceeded
4. Backend generates time-limited Walrus access token (JWT, 4hr expiry)
5. Backend creates stream session in PostgreSQL
6. Backend → Frontend: { streamUrl, token, manifest }
7. Video.js player loads HLS manifest from Walrus
8. Player fetches video chunks with access token
9. Every 30s: Frontend → Backend: stream progress event
10. Backend updates Redis (real-time metrics)
11. User finishes/stops: Frontend → Backend: POST /api/stream/end
12. Backend calculates completion %, updates:
    - PostgreSQL: stream record
    - Sui: membership usage (on-chain tx)
    - Sui: content metrics (on-chain tx)
    - Sui: uploader weighted score (on-chain tx)
13. Weekly cron job: distribute revenue based on scores
```

**Content Upload:**
```
1. Creator uploads video file (multipart)
2. Backend receives file, stores temp
3. FFprobe analyzes: duration, resolution, codecs
4. Backend queues transcoding job (Bull)
5. Worker picks up job:
   - Transcode to 480p, 720p, 1080p, 4K (based on source)
   - Generate HLS manifests
   - Extract thumbnail at 10s mark
6. Upload all outputs to Walrus:
   - Original: walrus://abc123/original.mp4
   - 480p: walrus://abc123/480p.m3u8
   - 720p: walrus://abc123/720p.m3u8
   - 1080p: walrus://abc123/1080p.m3u8
   - Thumbnail: walrus://abc123/thumb.jpg
7. Store metadata in PostgreSQL
8. Register content on Sui blockchain:
   - Title, description, genre
   - Walrus blob IDs
   - Uploader address
   - Status: Pending
9. Admin reviews, approves → Status: Active
10. Content appears in user library
```

**Revenue Distribution (Weekly Automated):**
```
1. Sunday 2:00 AM UTC: Cron triggers
2. Backend queries PostgreSQL:
   - All streams from past 7 days
   - Group by uploader
   - Calculate weighted scores
3. Backend queries Sui:
   - RevenuePool object (get total collected)
   - Apply 70/30 split
4. For each uploader (parallel):
   - Calculate share: (score / total_score) × creator_pool
   - Backend → Sui: distribute_reward(uploader, amount)
   - Sui transfers SUI coins to uploader wallet
   - Backend logs transaction in PostgreSQL
5. Backend sends notification to creators
6. Dashboard updates with new earnings
```

### Security Architecture

**Authentication:**
- Wallet signature verification (message signing)
- JWT tokens (1-day expiry, HttpOnly cookies)
- Rate limiting (100 req/min per IP)

**Authorization:**
- Role-based access control (viewer, creator, admin)
- Membership tier verification (on-chain check)
- Concurrent stream limits enforced

**Data Protection:**
- TLS 1.3 for all connections
- Video encryption at rest (Walrus)
- Time-limited streaming tokens (4 hours)
- IP hashing for analytics (GDPR compliant)

**Smart Contract Security:**
- Move's resource safety (prevents double-spending)
- Formal verification (Move Prover)
- Third-party audit (post-development)
- Admin multi-sig for critical operations

---

## SUI SMART CONTRACTS (MOVE)

### Package Structure

```
blockbuster-sui/
├── Move.toml
├── sources/
│   ├── membership.move          # NFT membership system
│   ├── revenue_pool.move        # Revenue distribution
│   ├── content_registry.move    # Content catalog
│   └── governance.move          # DAO voting (Phase 3)
└── tests/
    ├── membership_tests.move
    ├── revenue_pool_tests.move
    └── content_registry_tests.move
```

### 1. Membership Package

**Purpose:** NFT-based access control with three tiers

**Objects:**
```move
/// NFT membership card (owned by user)
struct MembershipNFT has key, store {
    id: UID,
    owner: address,
    tier: u8, // 1=Basic, 2=Premium, 3=Collector
    issued_at: u64,
    expires_at: u64,
    streams_used: u64,
    total_watch_time: u64,
    metadata_uri: String,
    is_transferable: bool,
}

/// Global member registry (shared object)
struct MemberRegistry has key {
    id: UID,
    admin: address,
    total_members: u64,
    basic_count: u64,
    premium_count: u64,
    collector_count: u64,
    total_revenue_collected: u64,
    membership_prices: vector<u64>, // [Basic, Premium, Collector]
}

/// Admin capability (owned by platform)
struct AdminCap has key {
    id: UID
}
```

**Key Functions:**
```move
/// Initialize registry (one-time setup)
public entry fun initialize(ctx: &mut TxContext) {
    let admin_cap = AdminCap {
        id: object::new(ctx)
    };

    let registry = MemberRegistry {
        id: object::new(ctx),
        admin: tx_context::sender(ctx),
        total_members: 0,
        basic_count: 0,
        premium_count: 0,
        collector_count: 0,
        total_revenue_collected: 0,
        membership_prices: vector[100_000_000_000, 250_000_000_000, 500_000_000_000], // SUI in MIST
    };

    transfer::transfer(admin_cap, tx_context::sender(ctx));
    transfer::share_object(registry);
}

/// Mint new membership NFT
public entry fun mint_membership(
    registry: &mut MemberRegistry,
    revenue_pool: &mut RevenuePool, // Cross-contract call
    tier: u8,
    duration_days: u64,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // Validate tier
    assert!(tier >= 1 && tier <= 3, EInvalidTier);

    // Get price
    let price_index = (tier - 1) as u64;
    let price = *vector::borrow(&registry.membership_prices, price_index);

    // Verify payment
    assert!(coin::value(&payment) >= price, EInsufficientPayment);

    // Calculate expiry
    let now = tx_context::epoch(ctx);
    let expires_at = now + (duration_days * 86400); // Convert days to seconds

    // Create NFT
    let nft = MembershipNFT {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        tier,
        issued_at: now,
        expires_at,
        streams_used: 0,
        total_watch_time: 0,
        metadata_uri: string::utf8(b"https://blockbuster.app/nft/"),
        is_transferable: true,
    };

    // Update registry stats
    registry.total_members = registry.total_members + 1;
    if (tier == 1) registry.basic_count = registry.basic_count + 1
    else if (tier == 2) registry.premium_count = registry.premium_count + 1
    else registry.collector_count = registry.collector_count + 1;

    registry.total_revenue_collected = registry.total_revenue_collected + price;

    // Transfer payment to revenue pool
    revenue_pool::collect_fees(revenue_pool, payment, ctx);

    // Transfer NFT to buyer
    transfer::transfer(nft, tx_context::sender(ctx));
}

/// Renew membership (extend expiry)
public entry fun renew_membership(
    nft: &mut MembershipNFT,
    registry: &mut MemberRegistry,
    revenue_pool: &mut RevenuePool,
    duration_days: u64,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    // Verify ownership
    assert!(nft.owner == tx_context::sender(ctx), ENotOwner);

    // Get price
    let price_index = (nft.tier - 1) as u64;
    let price = *vector::borrow(&registry.membership_prices, price_index);
    assert!(coin::value(&payment) >= price, EInsufficientPayment);

    // Extend expiry
    nft.expires_at = nft.expires_at + (duration_days * 86400);

    // Update registry
    registry.total_revenue_collected = registry.total_revenue_collected + price;

    // Transfer payment
    revenue_pool::collect_fees(revenue_pool, payment, ctx);
}

/// Verify membership is active (view function)
public fun verify_membership(
    nft: &MembershipNFT,
    ctx: &TxContext
): bool {
    let now = tx_context::epoch(ctx);
    nft.expires_at > now
}

/// Get tier limits (concurrent streams)
public fun get_tier_limits(tier: u8): (u64, bool) {
    if (tier == 1) (5, false)       // Basic: 5 streams, no 4K
    else if (tier == 2) (15, false) // Premium: 15 streams, no 4K
    else (999999, true)             // Collector: unlimited, 4K
}

/// Record stream usage
public entry fun record_stream_usage(
    nft: &mut MembershipNFT,
    watch_duration: u64,
    _ctx: &mut TxContext
) {
    nft.streams_used = nft.streams_used + 1;
    nft.total_watch_time = nft.total_watch_time + watch_duration;
}

/// Update membership prices (admin only)
public entry fun update_prices(
    _admin_cap: &AdminCap,
    registry: &mut MemberRegistry,
    new_prices: vector<u64>,
    _ctx: &mut TxContext
) {
    registry.membership_prices = new_prices;
}
```

**Error Codes:**
```move
const EInvalidTier: u64 = 1;
const EInsufficientPayment: u64 = 2;
const ENotOwner: u64 = 3;
const EMembershipExpired: u64 = 4;
const EStreamLimitExceeded: u64 = 5;
```

### 2. Revenue Pool Package

**Purpose:** 70/30 revenue split with weighted scoring

**Objects:**
```move
/// Global revenue pool (shared object)
struct RevenuePool has key {
    id: UID,
    operator_fee_bps: u64, // 3000 = 30%
    total_collected: u64,
    operator_share: u64,
    creator_pool: u64,
    pending_distribution: u64,
    last_distribution_epoch: u64,
    platform_wallet: address,
}

/// Uploader account (owned by creator)
struct UploaderAccount has key, store {
    id: UID,
    creator: address,
    total_streams: u64,
    total_watch_time: u64,
    weighted_score: u64,
    lifetime_earnings: u64,
    pending_earnings: u64,
    registration_epoch: u64,
    is_active: bool,
}

/// Weekly distribution record
struct DistributionEvent has copy, drop {
    epoch: u64,
    total_distributed: u64,
    recipient_count: u64,
    timestamp: u64,
}
```

**Key Functions:**
```move
/// Initialize revenue pool
public entry fun initialize_pool(ctx: &mut TxContext) {
    let pool = RevenuePool {
        id: object::new(ctx),
        operator_fee_bps: 3000, // 30%
        total_collected: 0,
        operator_share: 0,
        creator_pool: 0,
        pending_distribution: 0,
        last_distribution_epoch: 0,
        platform_wallet: tx_context::sender(ctx),
    };

    transfer::share_object(pool);
}

/// Register as content uploader
public entry fun register_uploader(ctx: &mut TxContext) {
    let account = UploaderAccount {
        id: object::new(ctx),
        creator: tx_context::sender(ctx),
        total_streams: 0,
        total_watch_time: 0,
        weighted_score: 0,
        lifetime_earnings: 0,
        pending_earnings: 0,
        registration_epoch: tx_context::epoch(ctx),
        is_active: true,
    };

    transfer::transfer(account, tx_context::sender(ctx));
}

/// Collect membership fees (called by membership contract)
public fun collect_fees(
    pool: &mut RevenuePool,
    payment: Coin<SUI>,
    _ctx: &mut TxContext
) {
    let amount = coin::value(&payment);

    // Split 70/30
    let operator_amount = (amount * pool.operator_fee_bps) / 10000;
    let creator_amount = amount - operator_amount;

    // Update pool
    pool.total_collected = pool.total_collected + amount;
    pool.operator_share = pool.operator_share + operator_amount;
    pool.creator_pool = pool.creator_pool + creator_amount;
    pool.pending_distribution = pool.pending_distribution + creator_amount;

    // Consume coin (adds to pool balance via dynamic field)
    // In production: use sui::balance to manage pool funds
    coin::destroy_zero(payment); // Simplified for example
}

/// Update stream metrics with weighted scoring
/// completion_rate: 0-100 (percentage)
public entry fun update_stream_metrics(
    pool: &mut RevenuePool,
    uploader: &mut UploaderAccount,
    watch_duration: u64,
    content_duration: u64,
    _ctx: &mut TxContext
) {
    // Calculate completion percentage
    let completion_rate = (watch_duration * 100) / content_duration;

    // Apply weighted multiplier
    let multiplier = if (completion_rate >= 80) 150     // 1.5x
                     else if (completion_rate >= 50) 125 // 1.25x
                     else 100;                           // 1.0x

    // Calculate weighted score
    let base_score = watch_duration;
    let weighted_score = (base_score * multiplier) / 100;

    // Update uploader stats
    uploader.total_streams = uploader.total_streams + 1;
    uploader.total_watch_time = uploader.total_watch_time + watch_duration;
    uploader.weighted_score = uploader.weighted_score + weighted_score;
}

/// Calculate uploader's share of creator pool
public fun calculate_uploader_share(
    pool: &RevenuePool,
    uploader: &UploaderAccount,
    platform_total_score: u64
): u64 {
    if (platform_total_score == 0) return 0;

    let share = (uploader.weighted_score * pool.pending_distribution) / platform_total_score;
    share
}

/// Distribute reward to single uploader (parallel execution friendly)
public entry fun distribute_reward(
    pool: &mut RevenuePool,
    uploader: &mut UploaderAccount,
    amount: u64,
    ctx: &mut TxContext
) {
    // Deduct from pool
    pool.pending_distribution = pool.pending_distribution - amount;

    // Update uploader
    uploader.pending_earnings = uploader.pending_earnings + amount;
    uploader.lifetime_earnings = uploader.lifetime_earnings + amount;

    // Reset weekly score (for next cycle)
    uploader.weighted_score = 0;
}

/// Claim earnings (uploader withdraws)
public entry fun claim_earnings(
    uploader: &mut UploaderAccount,
    ctx: &mut TxContext
) {
    let amount = uploader.pending_earnings;
    assert!(amount > 0, ENoPendingEarnings);

    // Reset pending
    uploader.pending_earnings = 0;

    // Transfer SUI to uploader
    // In production: extract Coin<SUI> from pool balance and transfer
    // let payout = coin::take(&mut pool.balance, amount, ctx);
    // transfer::public_transfer(payout, uploader.creator);
}

/// Emit distribution event (for indexing)
public fun emit_distribution_event(
    epoch: u64,
    total: u64,
    count: u64,
    ctx: &TxContext
) {
    event::emit(DistributionEvent {
        epoch,
        total_distributed: total,
        recipient_count: count,
        timestamp: tx_context::epoch(ctx),
    });
}
```

**Parallel Distribution Architecture:**

Each `distribute_reward()` call operates on a different `UploaderAccount` (owned object). Sui can execute these transactions in parallel since they don't conflict:

```
Transaction 1: distribute_reward(pool, uploader_A, 1000)
Transaction 2: distribute_reward(pool, uploader_B, 500)  // Executes simultaneously!
Transaction 3: distribute_reward(pool, uploader_C, 750)  // Executes simultaneously!
```

Only the `RevenuePool` (shared object) requires consensus, but reads don't block writes to different owned objects.

### 3. Content Registry Package

**Purpose:** Catalog of all movies with streaming metrics

**Objects:**
```move
/// Global content registry (shared object)
struct ContentRegistry has key {
    id: UID,
    admin: address,
    total_content: u64,
    active_content: u64,
    total_streams: u64,
    featured_ids: vector<ID>,
}

/// Individual content item (shared for reads, mutable for uploader)
struct ContentItem has key {
    id: UID,
    content_id: String,
    uploader: address,
    title: String,
    description: String,
    genre: u8, // Action=0, Comedy=1, etc.
    duration_seconds: u64,
    walrus_blob_id: String,
    thumbnail_uri: String,
    status: u8, // Pending=0, Active=1, Inactive=2, Removed=3
    total_streams: u64,
    total_watch_time: u64,
    average_completion_rate: u64,
    rating_sum: u64,
    rating_count: u64,
    upload_timestamp: u64,
}

/// Stream session (owned by viewer)
struct StreamSession has key, store {
    id: UID,
    content_id: ID,
    viewer: address,
    start_time: u64,
    watch_duration: u64,
    completion_percentage: u64,
    quality_level: u8, // SD=0, HD=1, FHD=2, UHD=3
}

/// Content registration event
struct ContentRegisteredEvent has copy, drop {
    content_id: ID,
    title: String,
    uploader: address,
    walrus_blob_id: String,
    timestamp: u64,
}
```

**Key Functions:**
```move
/// Initialize registry
public entry fun initialize_registry(ctx: &mut TxContext) {
    let registry = ContentRegistry {
        id: object::new(ctx),
        admin: tx_context::sender(ctx),
        total_content: 0,
        active_content: 0,
        total_streams: 0,
        featured_ids: vector::empty(),
    };

    transfer::share_object(registry);
}

/// Register new content
public entry fun register_content(
    registry: &mut ContentRegistry,
    title: String,
    description: String,
    genre: u8,
    duration_seconds: u64,
    walrus_blob_id: String,
    thumbnail_uri: String,
    ctx: &mut TxContext
) {
    let content_id_obj = object::new(ctx);
    let content_id_inner = object::uid_to_inner(&content_id_obj);

    let content = ContentItem {
        id: content_id_obj,
        content_id: object::id_to_string(&content_id_inner),
        uploader: tx_context::sender(ctx),
        title: title.clone(),
        description,
        genre,
        duration_seconds,
        walrus_blob_id: walrus_blob_id.clone(),
        thumbnail_uri,
        status: 0, // Pending
        total_streams: 0,
        total_watch_time: 0,
        average_completion_rate: 0,
        rating_sum: 0,
        rating_count: 0,
        upload_timestamp: tx_context::epoch(ctx),
    };

    // Update registry
    registry.total_content = registry.total_content + 1;

    // Emit event for indexing
    event::emit(ContentRegisteredEvent {
        content_id: content_id_inner,
        title,
        uploader: tx_context::sender(ctx),
        walrus_blob_id,
        timestamp: tx_context::epoch(ctx),
    });

    // Share content (anyone can read, only uploader can modify)
    transfer::share_object(content);
}

/// Update content status (admin only)
public entry fun update_content_status(
    _admin_cap: &AdminCap,
    registry: &mut ContentRegistry,
    content: &mut ContentItem,
    new_status: u8,
    _ctx: &mut TxContext
) {
    let old_status = content.status;
    content.status = new_status;

    // Update active count
    if (old_status != 1 && new_status == 1) {
        registry.active_content = registry.active_content + 1;
    } else if (old_status == 1 && new_status != 1) {
        registry.active_content = registry.active_content - 1;
    }
}

/// Track stream session
public entry fun track_stream(
    content: &mut ContentItem,
    membership: &MembershipNFT,
    watch_duration: u64,
    quality_level: u8,
    ctx: &mut TxContext
) {
    // Verify membership is active
    assert!(verify_membership(membership, ctx), EMembershipExpired);

    // Calculate completion
    let completion = (watch_duration * 100) / content.duration_seconds;

    // Update content metrics
    content.total_streams = content.total_streams + 1;
    content.total_watch_time = content.total_watch_time + watch_duration;

    // Update average completion rate
    let total_completions = content.total_streams * content.average_completion_rate;
    content.average_completion_rate = (total_completions + completion) / content.total_streams;

    // Create session record
    let session = StreamSession {
        id: object::new(ctx),
        content_id: object::uid_to_inner(&content.id),
        viewer: tx_context::sender(ctx),
        start_time: tx_context::epoch(ctx),
        watch_duration,
        completion_percentage: completion,
        quality_level,
    };

    // Transfer session to viewer (for history)
    transfer::transfer(session, tx_context::sender(ctx));
}

/// Rate content (1-5 stars)
public entry fun rate_content(
    content: &mut ContentItem,
    rating: u64,
    _ctx: &mut TxContext
) {
    assert!(rating >= 1 && rating <= 5, EInvalidRating);

    content.rating_sum = content.rating_sum + rating;
    content.rating_count = content.rating_count + 1;
}

/// Get average rating
public fun get_average_rating(content: &ContentItem): u64 {
    if (content.rating_count == 0) return 0;
    content.rating_sum / content.rating_count
}
```

**Dynamic Fields for Scalability:**

For large metadata (cast, crew, tags), use dynamic fields:

```move
use sui::dynamic_field;

// Add cast list without bloating main object
public entry fun add_cast_list(
    content: &mut ContentItem,
    cast: vector<String>,
    _ctx: &mut TxContext
) {
    dynamic_field::add(&mut content.id, b"cast", cast);
}

// Retrieve cast
public fun get_cast(content: &ContentItem): &vector<String> {
    dynamic_field::borrow(&content.id, b"cast")
}
```

### Move.toml Configuration

```toml
[package]
name = "blockbuster"
version = "1.0.0"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }

[addresses]
blockbuster = "0x0"
```

### Deployment Commands

```bash
# Build packages
sui move build

# Run tests
sui move test

# Deploy to testnet
sui client publish --gas-budget 100000000

# Initialize contracts
sui client call \
  --package $PACKAGE_ID \
  --module membership \
  --function initialize \
  --gas-budget 10000000

# Save important addresses
export MEMBERSHIP_PACKAGE_ID=0x...
export REVENUE_POOL_PACKAGE_ID=0x...
export CONTENT_REGISTRY_PACKAGE_ID=0x...
```

---

## BACKEND INFRASTRUCTURE

### Service Architecture

**Microservices (Node.js/Express):**

1. **Auth Service** - Wallet authentication, JWT management
2. **Content Service** - Movie catalog, search, recommendations
3. **Stream Service** - Session management, metrics tracking
4. **Upload Service** - Video transcoding, Walrus storage
5. **Revenue Service** - Distribution automation, analytics
6. **Notification Service** - Push notifications, emails
7. **Analytics Service** - Platform metrics, dashboards
8. **Blockchain Service** - Sui interaction layer

### Core Services Implementation

#### Blockchain Service (`services/suiBlockchainService.ts`)

```typescript
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

export class SuiBlockchainService {
  private client: SuiClient;
  private platformKeypair: Ed25519Keypair;

  // Package IDs (from deployment)
  private MEMBERSHIP_PACKAGE = process.env.MEMBERSHIP_PACKAGE_ID!;
  private REVENUE_POOL_PACKAGE = process.env.REVENUE_POOL_PACKAGE_ID!;
  private CONTENT_PACKAGE = process.env.CONTENT_REGISTRY_PACKAGE_ID!;

  // Shared object IDs
  private MEMBER_REGISTRY = process.env.MEMBER_REGISTRY_OBJECT_ID!;
  private REVENUE_POOL = process.env.REVENUE_POOL_OBJECT_ID!;
  private CONTENT_REGISTRY = process.env.CONTENT_REGISTRY_OBJECT_ID!;

  constructor() {
    this.client = new SuiClient({
      url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
    });

    this.platformKeypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(process.env.SUI_PRIVATE_KEY!, 'base64')
    );
  }

  /**
   * Mint membership NFT
   */
  async mintMembership(
    userAddress: string,
    tier: 1 | 2 | 3,
    durationDays: number
  ): Promise<{ nftId: string; txDigest: string }> {
    const prices = { 1: 100, 2: 250, 3: 500 };
    const price = prices[tier] * 1_000_000_000; // SUI to MIST

    const tx = new TransactionBlock();

    // Split coins for payment
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(price)]);

    // Call mint_membership
    tx.moveCall({
      target: `${this.MEMBERSHIP_PACKAGE}::membership::mint_membership`,
      arguments: [
        tx.object(this.MEMBER_REGISTRY),
        tx.object(this.REVENUE_POOL),
        tx.pure(tier),
        tx.pure(durationDays),
        coin,
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.platformKeypair,
      options: { showEffects: true, showObjectChanges: true },
    });

    const nftId = result.objectChanges?.find(
      c => c.type === 'created' && c.objectType.includes('MembershipNFT')
    )?.objectId || '';

    return { nftId, txDigest: result.digest };
  }

  /**
   * Verify membership is active
   */
  async verifyMembership(nftId: string): Promise<{
    isActive: boolean;
    tier: number;
    expiresAt: number;
  }> {
    const obj = await this.client.getObject({
      id: nftId,
      options: { showContent: true },
    });

    const fields = (obj.data?.content as any)?.fields;
    const expiresAt = parseInt(fields.expires_at);

    return {
      isActive: expiresAt > Date.now(),
      tier: parseInt(fields.tier),
      expiresAt,
    };
  }

  /**
   * Register content uploader
   */
  async registerUploader(address: string): Promise<string> {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${this.REVENUE_POOL_PACKAGE}::revenue_pool::register_uploader`,
      arguments: [],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.platformKeypair,
      options: { showObjectChanges: true },
    });

    const accountId = result.objectChanges?.find(
      c => c.type === 'created' && c.objectType.includes('UploaderAccount')
    )?.objectId || '';

    return accountId;
  }

  /**
   * Record stream metrics on-chain
   */
  async recordStreamMetrics(
    membershipNftId: string,
    contentId: string,
    uploaderAccountId: string,
    watchDuration: number,
    contentDuration: number
  ): Promise<string> {
    const tx = new TransactionBlock();

    // Update membership usage
    tx.moveCall({
      target: `${this.MEMBERSHIP_PACKAGE}::membership::record_stream_usage`,
      arguments: [tx.object(membershipNftId), tx.pure(watchDuration)],
    });

    // Update uploader metrics
    tx.moveCall({
      target: `${this.REVENUE_POOL_PACKAGE}::revenue_pool::update_stream_metrics`,
      arguments: [
        tx.object(this.REVENUE_POOL),
        tx.object(uploaderAccountId),
        tx.pure(watchDuration),
        tx.pure(contentDuration),
      ],
    });

    // Track content metrics
    tx.moveCall({
      target: `${this.CONTENT_PACKAGE}::content_registry::track_stream`,
      arguments: [
        tx.object(contentId),
        tx.object(membershipNftId),
        tx.pure(watchDuration),
        tx.pure(1), // quality level
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.platformKeypair,
    });

    return result.digest;
  }

  /**
   * Distribute revenue to uploaders (weekly cron)
   */
  async distributeRevenue(
    distributions: Array<{ uploaderAccountId: string; amount: number }>
  ): Promise<string[]> {
    // Parallel execution: each distribution is independent
    const txPromises = distributions.map(async ({ uploaderAccountId, amount }) => {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${this.REVENUE_POOL_PACKAGE}::revenue_pool::distribute_reward`,
        arguments: [
          tx.object(this.REVENUE_POOL),
          tx.object(uploaderAccountId),
          tx.pure(amount),
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: this.platformKeypair,
      });

      return result.digest;
    });

    return Promise.all(txPromises);
  }
}
```

#### Content Upload Service (`services/uploadService.ts`)

```typescript
import { spawn } from 'child_process';
import { WalrusClient } from './walrusClient';
import { db } from '../database';

export class UploadService {
  private walrus: WalrusClient;

  constructor() {
    this.walrus = new WalrusClient();
  }

  /**
   * Process uploaded video file
   */
  async processVideo(
    filePath: string,
    metadata: {
      title: string;
      description: string;
      genre: number;
      uploaderAddress: string;
    }
  ): Promise<string> {
    // 1. Analyze video
    const info = await this.analyzeVideo(filePath);

    // 2. Transcode to multiple qualities
    const qualities = await this.transcodeVideo(filePath, info);

    // 3. Upload to Walrus
    const blobIds = await this.uploadToWalrus(qualities);

    // 4. Register on-chain
    const contentId = await this.registerOnChain(metadata, blobIds, info.duration);

    return contentId;
  }

  /**
   * Analyze video with FFprobe
   */
  private async analyzeVideo(filePath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
  }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => output += data);
      ffprobe.on('close', (code) => {
        if (code !== 0) return reject(new Error('FFprobe failed'));

        const info = JSON.parse(output);
        const videoStream = info.streams.find((s: any) => s.codec_type === 'video');

        resolve({
          duration: Math.floor(parseFloat(info.format.duration)),
          width: videoStream.width,
          height: videoStream.height,
          codec: videoStream.codec_name,
        });
      });
    });
  }

  /**
   * Transcode to multiple qualities
   */
  private async transcodeVideo(
    filePath: string,
    info: { width: number; height: number }
  ): Promise<{
    original: string;
    qualities: Array<{ resolution: string; path: string }>;
  }> {
    const outputs: Array<{ resolution: string; path: string }> = [];

    // Determine available qualities based on source
    const resolutions = [
      { name: '480p', width: 854, height: 480 },
      { name: '720p', width: 1280, height: 720 },
      { name: '1080p', width: 1920, height: 1080 },
      { name: '4K', width: 3840, height: 2160 },
    ].filter(r => r.height <= info.height);

    // Transcode each quality
    for (const res of resolutions) {
      const outputPath = `/tmp/output_${res.name}.mp4`;

      await this.ffmpegTranscode(filePath, outputPath, res.width, res.height);

      outputs.push({
        resolution: res.name,
        path: outputPath,
      });
    }

    return { original: filePath, qualities: outputs };
  }

  /**
   * FFmpeg transcoding
   */
  private ffmpegTranscode(
    input: string,
    output: string,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', input,
        '-vf', `scale=${width}:${height}`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        output
      ]);

      ffmpeg.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error('FFmpeg failed'));
      });
    });
  }

  /**
   * Upload files to Walrus
   */
  private async uploadToWalrus(files: {
    original: string;
    qualities: Array<{ resolution: string; path: string }>;
  }): Promise<{ [key: string]: string }> {
    const blobIds: { [key: string]: string } = {};

    // Upload original
    blobIds.original = await this.walrus.upload(files.original);

    // Upload each quality
    for (const quality of files.qualities) {
      blobIds[quality.resolution] = await this.walrus.upload(quality.path);
    }

    return blobIds;
  }

  /**
   * Register content on Sui blockchain
   */
  private async registerOnChain(
    metadata: any,
    blobIds: any,
    duration: number
  ): Promise<string> {
    const blockchain = new SuiBlockchainService();

    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${process.env.CONTENT_PACKAGE}::content_registry::register_content`,
      arguments: [
        tx.object(process.env.CONTENT_REGISTRY_OBJECT_ID!),
        tx.pure(metadata.title),
        tx.pure(metadata.description),
        tx.pure(metadata.genre),
        tx.pure(duration),
        tx.pure(JSON.stringify(blobIds)), // Store all blob IDs
        tx.pure(''), // thumbnail URI
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.platformKeypair,
    });

    return result.digest;
  }
}
```

### Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    username VARCHAR(50),
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Memberships (mirror on-chain data for quick access)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    nft_object_id TEXT NOT NULL UNIQUE,
    tier INTEGER NOT NULL,
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Content (mirror on-chain data + off-chain metadata)
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blockchain_id TEXT NOT NULL UNIQUE,
    uploader_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    genre INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    walrus_blob_ids JSONB NOT NULL,
    thumbnail_url TEXT,
    status INTEGER DEFAULT 0, -- 0=Pending, 1=Active
    total_streams BIGINT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Streams (off-chain logging for analytics)
CREATE TABLE streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    content_id UUID REFERENCES content(id),
    session_id TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    watch_duration INTEGER, -- seconds
    completion_percentage INTEGER,
    quality_level INTEGER,
    blockchain_tx_digest TEXT, -- Sui transaction
    created_at TIMESTAMP DEFAULT NOW()
);

-- Uploader accounts
CREATE TABLE uploaders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    blockchain_account_id TEXT NOT NULL UNIQUE,
    total_earnings BIGINT DEFAULT 0,
    pending_earnings BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Revenue distributions
CREATE TABLE distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL,
    total_distributed BIGINT NOT NULL,
    recipient_count INTEGER NOT NULL,
    blockchain_tx_digests TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics (pre-aggregated for dashboard)
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    new_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    total_streams INTEGER DEFAULT 0,
    total_watch_hours INTEGER DEFAULT 0,
    revenue_collected BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_genre ON content(genre);
CREATE INDEX idx_streams_user ON streams(user_id);
CREATE INDEX idx_streams_content ON streams(content_id);
CREATE INDEX idx_streams_created ON streams(created_at);
```

### API Routes

**Core Endpoints:**

```
POST   /api/auth/connect           - Wallet authentication
POST   /api/auth/verify             - Verify JWT token

GET    /api/membership/tiers        - Get tier info & pricing
POST   /api/membership/purchase     - Mint membership NFT
GET    /api/membership/:nftId       - Get membership details

GET    /api/content                 - Browse content (paginated)
GET    /api/content/:id             - Get content details
GET    /api/content/search          - Search content
GET    /api/content/featured        - Get featured content

POST   /api/upload/register         - Register as uploader
POST   /api/upload/content          - Upload new content
GET    /api/upload/analytics        - Creator dashboard

POST   /api/stream/start            - Start streaming session
POST   /api/stream/heartbeat        - Update watch progress
POST   /api/stream/end              - End streaming session

GET    /api/revenue/pool            - Revenue pool stats
GET    /api/revenue/earnings        - Creator earnings
GET    /api/revenue/distributions   - Distribution history

GET    /api/analytics/platform      - Platform-wide metrics
GET    /api/analytics/content/:id   - Content-specific metrics
```

---

## FRONTEND APPLICATION

### Technology Stack

- **Next.js 14** - App Router, Server Components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with 80s Blockbuster theme
- **@mysten/wallet-kit** - Sui wallet integration
- **@mysten/dapp-kit** - Sui blockchain hooks
- **Video.js** - HLS video player
- **Framer Motion** - Animations
- **React Query** - Server state management
- **Zustand** - Client state management

### Design System (80s Blockbuster Aesthetic)

**Color Palette:**
```css
:root {
  --blockbuster-blue: #002D72;
  --blockbuster-gold: #FFD700;
  --blockbuster-navy: #001144;
  --neon-pink: #FF1493;
  --neon-cyan: #00FFFF;
  --grid-bg: #0a0a1a;
}
```

**Typography:**
- Headlines: "Archivo Black" (bold, blocky)
- Body: "Inter" (clean, readable)
- Accent: Neon glow effects

**Components:**
- VHS-style video borders
- Grid backgrounds (Tron aesthetic)
- Neon button hover effects
- Retro loading animations (cassette tape)

### Key Pages

#### 1. Homepage (`app/page.tsx`)

**Sections:**
- Hero with animated background grid
- Membership tier cards (3D hover effects)
- Featured content carousel
- Platform stats (members, content, earnings distributed)
- Creator spotlight
- CTA: "Connect Wallet & Start Streaming"

#### 2. Library (`app/library/page.tsx`)

**Features:**
- Grid/list view toggle
- Genre filters (dropdown)
- Search bar (real-time)
- Sort by: Popular, Recent, Rating, Duration
- Infinite scroll pagination
- Movie cards with:
  - Poster thumbnail
  - Title, year, duration
  - Rating (stars)
  - Watch progress bar (if started)

#### 3. Movie Player (`app/watch/[id]/page.tsx`)

**Layout:**
- Full-screen video player (Video.js)
- Quality selector (480p, 720p, 1080p, 4K)
- Playback controls
- Volume slider
- Fullscreen toggle
- Picture-in-picture
- Next episode (for series)
- Related content sidebar

**Player Implementation:**
```typescript
'use client';

import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { useEffect, useRef } from 'use';

export function VideoPlayer({ streamUrl, onProgress }: {
  streamUrl: string;
  onProgress: (progress: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      sources: [{ src: streamUrl, type: 'application/x-mpegURL' }],
    });

    // Track progress every 30 seconds
    const interval = setInterval(() => {
      const currentTime = player.currentTime();
      const duration = player.duration();
      const progress = (currentTime / duration) * 100;

      onProgress(progress);
    }, 30000);

    playerRef.current = player;

    return () => {
      clearInterval(interval);
      player.dispose();
    };
  }, [streamUrl]);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js vjs-big-play-centered" />
    </div>
  );
}
```

#### 4. Uploader Dashboard (`app/uploader/page.tsx`)

**Metrics:**
- Total earnings (lifetime + pending)
- This week's earnings
- Total streams
- Average completion rate
- Top performing content

**Actions:**
- Upload new content button
- View detailed analytics
- Claim pending earnings

**Content List:**
- All uploaded content
- Status badges (Pending, Active, Inactive)
- Quick stats per content

#### 5. Membership Page (`app/membership/page.tsx`)

**Features:**
- Tier comparison table
- Purchase flow:
  1. Select tier
  2. Choose duration (1, 3, 6, 12 months)
  3. Connect wallet (if not connected)
  4. Approve transaction
  5. Receive NFT confirmation
- Display current membership (if any)
- Renewal option
- Transfer NFT option

### Wallet Integration

```typescript
// app/providers.tsx

'use client';

import { WalletKitProvider } from '@mysten/wallet-kit';
import { SuiClientProvider, createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletKitProvider>
          {children}
        </WalletKitProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

### Custom Hooks

```typescript
// hooks/useMembership.ts

import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';

export function useMembership() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const purchaseMembership = async (tier: 1 | 2 | 3, durationDays: number) => {
    if (!account) throw new Error('Wallet not connected');

    const prices = { 1: 100, 2: 250, 3: 500 };
    const amount = prices[tier] * 1_000_000_000;

    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);

    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_MEMBERSHIP_PACKAGE}::membership::mint_membership`,
      arguments: [
        tx.object(process.env.NEXT_PUBLIC_MEMBER_REGISTRY!),
        tx.object(process.env.NEXT_PUBLIC_REVENUE_POOL!),
        tx.pure(tier),
        tx.pure(durationDays),
        coin,
      ],
    });

    return new Promise((resolve, reject) => {
      signAndExecute(
        { transactionBlock: tx },
        {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        }
      );
    });
  };

  return { purchaseMembership, account };
}
```

---

## WALRUS STORAGE INTEGRATION

### Walrus Overview

**Walrus** is a decentralized storage network developed by Mysten Labs (creators of Sui). It uses erasure coding to store large files across a distributed network of nodes.

**Key Features:**
- Decentralized and censorship-resistant
- Erasure coding (data redundancy)
- Native integration with Sui
- Cost-effective for large files (video)
- Content addressing (immutable blob IDs)

### Walrus Client (Node.js)

```typescript
// services/walrusClient.ts

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export class WalrusClient {
  private walrusNodeUrl: string;

  constructor() {
    this.walrusNodeUrl = process.env.WALRUS_NODE_URL || 'http://localhost:8080';
  }

  /**
   * Upload file to Walrus
   */
  async upload(filePath: string): Promise<string> {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(`${this.walrusNodeUrl}/v1/store`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Walrus returns blob ID
    const blobId = response.data.blob_id;
    return blobId;
  }

  /**
   * Get file metadata
   */
  async getMetadata(blobId: string): Promise<{
    size: number;
    stored_at: number;
    encoding: string;
  }> {
    const response = await axios.get(`${this.walrusNodeUrl}/v1/blob/${blobId}/metadata`);
    return response.data;
  }

  /**
   * Generate streaming URL with time-limited token
   */
  generateStreamUrl(blobId: string, expiresIn: number = 14400): string {
    // Generate JWT token
    const token = jwt.sign(
      { blobId, exp: Math.floor(Date.now() / 1000) + expiresIn },
      process.env.JWT_SECRET!
    );

    return `${this.walrusNodeUrl}/v1/blob/${blobId}?token=${token}`;
  }

  /**
   * Delete blob (if needed)
   */
  async delete(blobId: string): Promise<void> {
    await axios.delete(`${this.walrusNodeUrl}/v1/blob/${blobId}`);
  }
}
```

### Walrus Storage Costs

**Pricing Model:**
- Storage: ~$0.01/GB/month
- Bandwidth: ~$0.05/GB
- Retrieval: Free (P2P)

**Example Costs (1000 movies, avg 5GB each):**
- Storage: 5000 GB × $0.01 = $50/month
- Bandwidth (1M streams/month, avg 2GB watched): 2M GB × $0.05 = $100k/month

**Optimization:**
- Cache popular content on CDN
- Encourage P2P sharing (reduce bandwidth)
- Compress videos aggressively

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-4)

#### Week 1: Project Setup & Smart Contracts
**Goal:** Development environment + Move contracts

- [ ] Set up monorepo (Turborepo)
- [ ] Initialize Move packages
- [ ] Implement Membership contract
- [ ] Write unit tests
- [ ] Deploy to Sui devnet
- [ ] **Deliverable:** Working membership minting on devnet

#### Week 2: Revenue & Content Contracts
**Goal:** Complete blockchain layer

- [ ] Implement Revenue Pool contract
- [ ] Implement Content Registry contract
- [ ] Write integration tests
- [ ] Gas optimization
- [ ] Deploy all contracts to devnet
- [ ] **Deliverable:** Full on-chain infrastructure

#### Week 3: Backend Foundation
**Goal:** API server + database

- [ ] Set up Express server
- [ ] PostgreSQL schema
- [ ] Sui blockchain service
- [ ] Auth service (wallet verification)
- [ ] Content service (CRUD)
- [ ] **Deliverable:** Working REST API

#### Week 4: Video Pipeline
**Goal:** Upload + transcoding + storage

- [ ] Upload service
- [ ] FFmpeg transcoding
- [ ] Walrus client integration
- [ ] Job queue (Bull)
- [ ] **Deliverable:** Video upload to streaming pipeline

### Phase 2: Core Features (Weeks 5-8)

#### Week 5: Frontend Foundation
**Goal:** UI framework + wallet

- [ ] Next.js app setup
- [ ] Tailwind + 80s theme
- [ ] Sui wallet integration
- [ ] Homepage + navigation
- [ ] **Deliverable:** Basic UI with wallet connect

#### Week 6: Streaming Experience
**Goal:** Watch movies end-to-end

- [ ] Library browsing page
- [ ] Movie player page
- [ ] Video.js integration
- [ ] Streaming session tracking
- [ ] **Deliverable:** Full streaming UX

#### Week 7: Creator Features
**Goal:** Upload + earnings

- [ ] Uploader registration
- [ ] Content upload UI
- [ ] Dashboard (analytics)
- [ ] **Deliverable:** Creator portal

#### Week 8: Membership & Payments
**Goal:** Purchase tiers + renewals

- [ ] Membership page
- [ ] Purchase flow (UI)
- [ ] NFT display
- [ ] Renewal flow
- [ ] **Deliverable:** Full membership system

### Phase 3: Launch Prep (Weeks 9-12)

#### Week 9: Testing & Polish
**Goal:** Production-ready quality

- [ ] E2E tests (Playwright)
- [ ] Load testing (K6)
- [ ] Bug fixes
- [ ] UI polish
- [ ] **Deliverable:** Stable beta

#### Week 10: Revenue Automation
**Goal:** Weekly distributions

- [ ] Distribution scheduler (cron)
- [ ] Parallel payout execution
- [ ] Analytics dashboard
- [ ] Notification system
- [ ] **Deliverable:** Automated payouts

#### Week 11: Testnet Launch
**Goal:** Public beta

- [ ] Deploy to Sui testnet
- [ ] Beta user onboarding
- [ ] Feedback collection
- [ ] Performance monitoring
- [ ] **Deliverable:** 100 beta users

#### Week 12: Mainnet Preparation
**Goal:** Production deployment

- [ ] Security audit
- [ ] Deploy to Sui mainnet
- [ ] Production infrastructure
- [ ] Launch marketing
- [ ] **Deliverable:** Public launch

### Phase 4: Growth (Weeks 13-16) - Optional

#### Week 13-14: Social Features
- [ ] User profiles
- [ ] Comments & reviews
- [ ] Follow creators
- [ ] Social sharing

#### Week 15-16: DAO Governance
- [ ] Governance contract
- [ ] Voting UI
- [ ] Treasury management
- [ ] Community moderation

---

## TEAM & RESOURCES

### Core Team (Recommended)

**1. Senior Blockchain Engineer** (Full-time, 16 weeks)
- Move smart contract development
- Sui infrastructure
- Security best practices
- **Rate:** $150/hour
- **Total:** $96,000 (16 weeks × 40 hours × $150)

**2. Full-Stack Engineer** (Full-time, 16 weeks)
- Node.js backend
- Next.js frontend
- API development
- **Rate:** $100/hour
- **Total:** $64,000 (16 weeks × 40 hours × $100)

**3. DevOps Engineer** (Part-time, 8 weeks)
- Infrastructure setup
- CI/CD pipeline
- Monitoring
- **Rate:** $120/hour
- **Total:** $19,200 (8 weeks × 20 hours × $120)

**4. UI/UX Designer** (Part-time, 6 weeks)
- 80s Blockbuster aesthetic
- Component library
- User flows
- **Rate:** $80/hour
- **Total:** $9,600 (6 weeks × 20 hours × $80)

**5. Product Manager** (Part-time, 16 weeks)
- Roadmap management
- User testing
- Launch coordination
- **Rate:** $100/hour
- **Total:** $16,000 (16 weeks × 10 hours × $100)

**6. QA/Tester** (Part-time, 8 weeks)
- Manual testing
- Bug reporting
- User acceptance testing
- **Rate:** $60/hour
- **Total:** $9,600 (8 weeks × 20 hours × $60)

**Total Team Cost:** $214,400

### External Services

**Security Audit:** $20,000 - $40,000 (third-party Move audit)
**Legal:** $10,000 (terms of service, privacy policy, entity formation)
**Marketing:** $15,000 (launch campaign, community building)

### Infrastructure Costs (Monthly)

- **Sui RPC:** $200/month (QuickNode or similar)
- **Walrus Storage:** $500/month (5TB)
- **PostgreSQL:** $100/month (managed instance)
- **Redis:** $50/month
- **CDN:** $300/month (Cloudflare)
- **Monitoring:** $100/month (Datadog/Grafana Cloud)
- **Hosting:** $200/month (Vercel + AWS)
- **TOTAL:** ~$1,450/month

---

## BUDGET & FINANCIALS

### Total Development Budget

| Category | Amount |
|----------|--------|
| **Team Salaries** | $214,400 |
| **Security Audit** | $30,000 |
| **Legal** | $10,000 |
| **Marketing** | $15,000 |
| **Infrastructure (4 months)** | $5,800 |
| **Contingency (15%)** | $41,130 |
| **TOTAL** | **$316,330** |

**Recommended Budget Range:** $300,000 - $350,000

### Revenue Projections (Year 1)

**Month 1-3 (Beta):**
- Members: 100 → 500 → 1,000
- Revenue: 50,000 SUI → 150,000 SUI → 300,000 SUI
- Platform share (30%): 15k → 45k → 90k SUI/month

**Month 4-6 (Growth):**
- Members: 2,000 → 4,000 → 6,000
- Revenue: 600k → 1.2M → 1.8M SUI/month
- Platform share: 180k → 360k → 540k SUI/month

**Month 7-12 (Scale):**
- Members: 8,000 → 10,000
- Revenue: 2.4M → 3M SUI/month
- Platform share: 720k → 900k SUI/month

**Year 1 Total Revenue (Platform 30%):**
- ~5M SUI (~$5M at $1/SUI)
- Operating costs: ~$500k
- **Net Profit:** ~$4.5M

**Break-even:** Month 2-3

### Funding Strategy

**Option A: Self-Funded**
- Use personal savings or angel investment
- Retain 100% equity
- Higher risk, higher reward

**Option B: Seed Round**
- Raise $500k at $5M valuation (10% dilution)
- 12-month runway
- Strategic investors (crypto VCs)

**Option C: Grants**
- Apply for Sui Foundation grant ($50k-250k)
- Mysten Labs ecosystem fund
- Web3 Foundation grants

**Recommendation:** Option B (Seed Round) for fastest growth

---

## GO-TO-MARKET STRATEGY

### Pre-Launch (Weeks 9-11)

**Community Building:**
- Create Discord server (target 1,000 members)
- Twitter account (daily updates)
- Mirror blog (technical deep dives)
- Partnerships with Sui projects

**Content Strategy:**
- "Building Blockbuster" video series
- Weekly dev updates
- AMAs with team

**Beta Program:**
- 100 whitelisted users
- Free 3-month memberships
- Incentivize content uploads (bounties)

### Launch (Week 12)

**Launch Day:**
- Product Hunt launch
- Twitter Spaces AMA
- Press release (CoinDesk, Decrypt, The Block)
- Sui ecosystem announcement

**Incentives:**
- First 1,000 members: 50% discount
- Early uploaders: 80% revenue share (first month)
- Referral program: 1 free month per referral

### Post-Launch (Weeks 13-16)

**Growth Tactics:**
- Influencer partnerships (crypto YouTubers)
- Content creator outreach
- Cross-promotions with other platforms
- Hackathon sponsorships

**Metrics to Track:**
- Daily Active Users (DAU)
- Member acquisition cost (CAC)
- Lifetime value (LTV)
- Retention rate (Day 7, Day 30)
- Creator earnings (showcase success stories)

### Target Markets

**Primary:**
1. **Crypto natives** (Web3 enthusiasts, NFT collectors)
2. **Content creators** (YouTubers, indie filmmakers)
3. **Cord-cutters** (Netflix refugees, privacy advocates)

**Secondary:**
4. **Film students** (educational use case)
5. **International users** (censorship-resistant access)

---

## RISK ANALYSIS

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Smart contract bug** | Medium | Critical | Third-party audit, formal verification, bug bounty |
| **Walrus reliability** | Medium | High | Cache popular content on CDN, fallback storage |
| **Sui network downtime** | Low | High | Monitor status, implement retries, status page |
| **Scalability issues** | Medium | Medium | Load testing, auto-scaling, database optimization |
| **Gas price spikes** | Low | Medium | Conservative gas budgets, batch operations |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Low user adoption** | Medium | Critical | Beta testing, product-market fit iteration |
| **Copyright issues** | High | Critical | DMCA procedures, content moderation, legal counsel |
| **Regulatory crackdown** | Medium | High | Legal compliance, geographic restrictions if needed |
| **Competitor launch** | Low | Medium | First-mover advantage, superior UX |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Team turnover** | Low | High | Competitive comp, vesting schedules, documentation |
| **Budget overrun** | Medium | Medium | 15% contingency, phased funding |
| **Timeline delays** | Medium | Low | Agile methodology, buffer weeks |

### Legal Risks

**Copyright Infringement:**
- **Risk:** Users upload copyrighted content
- **Mitigation:**
  - DMCA compliance
  - Content moderation (manual + AI)
  - Takedown procedures
  - User agreements (liability waiver)

**Securities Regulation:**
- **Risk:** BLOCK token classified as security
- **Mitigation:**
  - Utility-first design
  - Legal counsel (Cooley, Orrick)
  - Consider SAFT for token sale

**Data Privacy:**
- **Risk:** GDPR/CCPA violations
- **Mitigation:**
  - IP hashing (not storage)
  - Data export/deletion tools
  - Privacy policy

---

## SUCCESS METRICS

### North Star Metric
**Total Creator Earnings Distributed** (indicates platform value creation)

### Key Performance Indicators (KPIs)

**User Metrics:**
- Monthly Active Users (MAU): Target 10,000 by Month 12
- Paid Members: Target 5,000 by Month 12
- Retention Rate: Target 70% (Month-over-Month)

**Content Metrics:**
- Total Content Library: Target 5,000 movies by Month 12
- Active Creators: Target 500 by Month 12
- Avg Streams per Content: Target 50/month

**Financial Metrics:**
- Monthly Revenue: Target $500k by Month 12
- Creator Payouts: Target $350k/month by Month 12
- Burn Rate: <$50k/month (post-launch)

**Engagement Metrics:**
- Avg Watch Time: Target 60 minutes/session
- Completion Rate: Target 70%
- Weekly Active Users / MAU: Target 50%

### Success Criteria (12-Month Milestones)

**Must Have:**
- ✅ 5,000+ paid members
- ✅ $2M+ total creator earnings distributed
- ✅ 70%+ member retention
- ✅ Zero critical security incidents
- ✅ Profitable operations (revenue > costs)

**Nice to Have:**
- ✅ 10,000+ MAU
- ✅ Featured in major crypto publications
- ✅ Partnerships with film studios/creators
- ✅ Mobile app launched
- ✅ DAO governance live

---

## CONCLUSION

### Why Blockbuster Will Succeed

**1. Unique Value Proposition**
- Only decentralized streaming platform with transparent creator payouts
- NFT memberships are tradeable assets
- 70% revenue share beats all competitors

**2. Technical Excellence**
- Sui blockchain enables parallel execution (1000x scalability)
- Walrus provides censorship-resistant storage
- Clean architecture, modern tech stack

**3. Market Timing**
- Streaming fatigue (Netflix price hikes)
- Creator economy boom ($104B market)
- Web3 adoption accelerating

**4. Sustainable Economics**
- 30% platform fee covers operations + profit
- Creators earn 3-5x more than YouTube
- Predictable gas costs (Sui)

### Next Steps

**Immediate (Week 1):**
1. Assemble core team (blockchain engineer, full-stack engineer)
2. Set up development environment
3. Begin Move contract development
4. Create project GitHub repository

**Short-term (Month 1):**
1. Complete all smart contracts
2. Deploy to Sui devnet
3. Begin backend API development
4. Design UI/UX mockups

**Medium-term (Month 3):**
1. Beta testing with 100 users
2. Security audit
3. Launch marketing campaign
4. Deploy to Sui mainnet

**Long-term (Month 6-12):**
1. Scale to 10,000 members
2. Launch BLOCK token
3. Implement DAO governance
4. Expand to mobile apps

### Final Recommendation

**BUILD IT.**

Blockbuster on Sui represents a genuine Web3 use case with clear product-market fit. The technology is mature (Sui mainnet is live), the market is ready (streaming fatigue), and the economics work (70/30 split is sustainable).

With a focused team, $300k budget, and 12-week timeline, you can launch a functional platform and achieve profitability within 6 months.

**The Blockbuster they tried to kill is coming back — decentralized, unstoppable, and built on Sui.**

---

**Document prepared by:** Claude AI (Senior Product Architect)
**Contact:** Review this plan and let's start building!
**Next Action:** Approve budget → Hire team → Week 1 kickoff

🎬 **Let's bring Blockbuster back to life!**
