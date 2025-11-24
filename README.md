# BlobBuster

> **Decentralized streaming platform built on Sui blockchain and Walrus storage**

A retro-themed, Web3-native video streaming service where creators own their content, users stream with NFT memberships, and revenue flows directly to artists through smart contracts.

[![Sui](https://img.shields.io/badge/Sui-Blockchain-4DA2FF?logo=sui)](https://sui.io)
[![Walrus](https://img.shields.io/badge/Walrus-Storage-00D4AA)](https://walrus.xyz)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Move](https://img.shields.io/badge/Move-Smart_Contracts-orange)](https://docs.sui.io/learn/move)

---

## What is BlobBuster?

BlobBuster reimagines Blockbuster for the Web3 era—a decentralized streaming platform where:

- **Creators upload videos** stored permanently on Walrus (decentralized storage)
- **Users buy NFT memberships** ($5/month) with dynamic visual states (active/expired)
- **70% of revenue flows to creators** based on engagement quality through smart contracts
- **Content lives forever**—no centralized company can delete or censor videos

**The Innovation**: Our weighted scoring algorithm ensures creators earn proportionally to viewer engagement. A video watched to 90% completion earns 1.5x more than one abandoned at 30%—rewarding quality over clickbait.

---

## Architecture

```
┌─────────────────┐
│   Next.js 14   │  Frontend: Video player, membership purchase, creator dashboard
│   + TailwindCSS│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │  Backend: Auth, transcoding orchestration, analytics
│  + TypeScript   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────────┐
│ Postgres│  │ Sui Blockchain│  Smart Contracts: Membership NFTs, revenue pool, content registry
│ + Redis │  │   + Move      │
└─────────┘  └───────┬──────┘
                     │
                     ▼
              ┌──────────────┐
              │Walrus Storage│  Decentralized permanent video storage
              └──────────────┘
```

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 14, React 18, TailwindCSS, HLS.js (video), @mysten/dapp-kit (wallet) |
| **Backend** | Node.js 20, Express, TypeScript, Prisma ORM, Bull (job queues) |
| **Database** | PostgreSQL (relational data), Redis (caching, sessions) |
| **Blockchain** | Sui (mainnet/testnet), Move smart contracts |
| **Storage** | Walrus (decentralized video), IPFS/Pinata (NFT cards) |
| **Video Processing** | FFmpeg (transcoding), Sharp (thumbnails) |
| **External APIs** | TMDB (metadata), CoinGecko (SUI pricing) |

---

## Key Features

### For Viewers
- **NFT Memberships**: $5/month subscription as a Sui NFT with dynamic artwork
- **Adaptive Streaming**: HLS-based player with quality selection
- **Retro UI**: 80s Blockbuster-inspired design with modern UX
- **Content Discovery**: Browse by genre, search, TMDB-enriched metadata

### For Creators
- **Upload Dashboard**: Drag-and-drop video upload with automatic transcoding
- **70% Revenue Share**: Industry-leading creator economics
- **Analytics**: Track views, completion rates, earnings
- **Permanent Storage**: Videos stored on Walrus can't be deleted by platform

### Blockchain Features
- **Weighted Revenue Distribution**:
  - 80-100% completion → 1.5x multiplier
  - 50-79% completion → 1.25x multiplier
  - 0-49% completion → 1.0x multiplier
- **Weekly Automated Payouts**: Smart contract distributes earnings every Sunday
- **Dynamic NFTs**: Membership cards visually change when expired

---

## Project Structure

```
buster/
├── apps/
│   ├── backend/              # Express API server (port 3001)
│   │   ├── src/
│   │   │   ├── routes/       # 13 API routes (auth, content, upload, etc.)
│   │   │   ├── services/     # Business logic (blockchain, walrus, transcoding)
│   │   │   ├── middleware/   # Auth, membership checks
│   │   │   ├── jobs/         # Background tasks (transcoding, revenue distribution)
│   │   │   └── index.ts      # Server entry point
│   │   └── prisma/           # Database schema (11 models)
│   │
│   └── frontend/             # Next.js 14 app (port 3000)
│       ├── app/              # App router pages
│       ├── components/       # React components
│       └── lib/              # API client, hooks, utilities
│
├── contracts/
│   └── sui-contracts/        # Move smart contracts
│       └── sources/
│           ├── membership.move         # NFT membership logic
│           ├── revenue_pool.move       # Revenue distribution
│           └── content_registry.move   # Content catalog
│
├── packages/
│   └── shared-types/         # TypeScript types shared across monorepo
│
├── nft/                      # NFT card image generation
│   └── card.png              # Membership card template
│
└── docs/                     # Architecture documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm 9.8+
- **PostgreSQL** 14+
- **Redis** 6+
- **FFmpeg** (for video transcoding)
- **Sui CLI** (for blockchain interaction)
- **Walrus CLI** (for decentralized storage)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/buster.git
cd buster

# Install dependencies (monorepo)
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Setup below)

# Setup database
cd apps/backend
npx prisma migrate dev
npx prisma db seed  # Optional: load sample data

# Build all workspaces
npm run build
```

### Environment Setup

Create `.env` in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/blobbuster"
REDIS_URL="redis://localhost:6379"

# Sui Blockchain (Testnet example)
SUI_RPC_URL="https://fullnode.testnet.sui.io:443"
SUI_NETWORK="testnet"
SUI_PRIVATE_KEY="base64_encoded_private_key"

# Smart Contract Object IDs (deploy contracts first)
MEMBERSHIP_PACKAGE_ID="0x..."
REVENUE_POOL_PACKAGE_ID="0x..."
CONTENT_REGISTRY_PACKAGE_ID="0x..."
MEMBER_REGISTRY_OBJECT_ID="0x..."
REVENUE_POOL_OBJECT_ID="0x..."

# Walrus Storage
WALRUS_PUBLISHER_URL="https://publisher.walrus-mainnet.walrus.space"
WALRUS_AGGREGATOR_URL="https://aggregator.walrus-mainnet.walrus.space"
WALRUS_DEFAULT_EPOCHS=520  # ~1 year

# Authentication
JWT_SECRET="your_secure_random_string"
JWT_EXPIRES_IN="7d"

# External Services
TMDB_API_KEY="your_tmdb_api_key"
PINATA_API_KEY="your_pinata_api_key"
PINATA_SECRET_KEY="your_pinata_secret"

# Backend
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SUI_NETWORK="testnet"
```

### Deploy Smart Contracts

```bash
cd contracts/sui-contracts

# Build contracts
sui move build

# Deploy to testnet
sui client publish --gas-budget 500000000

# Save the package IDs and object IDs from output to your .env file
```

### Run Development Servers

```bash
# Run all services (frontend + backend)
npm run dev

# Or run individually:
npm run backend:dev   # Backend on http://localhost:3001
npm run frontend:dev  # Frontend on http://localhost:3000
```

Visit `http://localhost:3000` to see the application.

---

## How It Works

### 1. User Purchases Membership

1. User connects Sui wallet on `/membership` page
2. Selects subscription duration (30/90/180/365 days with discounts)
3. Backend generates two NFT card images:
   - **Active card**: Yellow border, member number, expiration date
   - **Expired card**: Grayed out version
4. Cards uploaded to IPFS via Pinata
5. Transaction sent to blockchain: `membership::mint_membership()`
6. NFT minted with dynamic `display` property pointing to active card
7. Membership record created in PostgreSQL

### 2. Creator Uploads Video

1. Creator navigates to `/uploader/upload`
2. Selects video file (max 10GB), enters metadata
3. Backend receives file via multipart upload
4. **Transcoding job** queued in Bull (Redis):
   - FFmpeg transcodes to 720p H.264
   - Generates thumbnail with overlay
   - Extracts duration, resolution
5. Transcoded file uploaded to **Walrus**:
   - CLI command: `walrus store --epochs 520 --permanent <file>`
   - Returns: `blob_id`, storage cost, expiration epoch
6. Content registered on blockchain:
   - `content_registry::register_content()` with Walrus blob IDs
7. Database updated with TMDB enrichment (plot, cast, rating)

### 3. User Streams Video

1. User clicks video thumbnail in `/library`
2. Middleware checks membership validity:
   - Query: `SELECT * FROM memberships WHERE user_id = ? AND is_active = true AND expires_at > NOW()`
3. If valid, backend creates streaming session
4. HLS.js player loads from Walrus aggregator URL
5. **Heartbeat loop** (every 30 seconds):
   - Frontend sends current playback position
   - Backend tracks `watch_duration`, `completion_percentage`
6. On video completion:
   - Calculate completion rate (e.g., 85%)
   - Award weighted points to creator (85% × 1.5x multiplier)
   - Increment content `total_streams` counter

### 4. Weekly Revenue Distribution (Cron Job)

Every **Sunday at 2:00 AM UTC**:

1. Fetch all creators with content streamed in past week
2. Calculate each creator's weighted score:
   ```
   score = Σ (streams × completion_rate × multiplier)
   ```
3. Determine proportion of 70% creator pool:
   ```
   creator_share = weekly_revenue × 0.70 × (creator_score / total_scores)
   ```
4. Execute blockchain transaction:
   - `revenue_pool::distribute_earnings()` sends SUI to creator wallets
5. Record distribution in `distributions` table
6. Update `uploader_profiles.total_earnings`

---

## Smart Contract Architecture

### membership.move

**Purpose**: Manages NFT-based memberships

**Key Structs**:
- `MembershipNFT` - User's membership card (owned object)
- `MemberRegistry` - Global tracker of all memberships (shared object)

**Functions**:
```move
public fun mint_membership(
    registry: &mut MemberRegistry,
    payment: Coin<SUI>,
    duration_days: u64,
    active_card_url: String,
    expired_card_url: String,
    ctx: &mut TxContext
): MembershipNFT

public fun is_active(nft: &MembershipNFT, clock: &Clock): bool

public fun update_nft_display(
    nft: &mut MembershipNFT,
    new_image_url: String
)
```

**Constants**:
- `MEMBERSHIP_PRICE = 2_500_000_000` (2.5 SUI)

---

### content_registry.move

**Purpose**: On-chain catalog of all uploaded content

**Key Structs**:
- `ContentItem` - Individual video/movie
- `ContentRegistry` - Global catalog (shared object)

**Features**:
- Quality levels: SD (480p), HD (720p), FHD (1080p), UHD (4K)
- 10 genres: Action, Comedy, Drama, Horror, SciFi, Romance, Thriller, Documentary, Animation, Family
- Status codes: PENDING, ACTIVE, INACTIVE, REMOVED
- Completion tracking per membership
- Featured content flagging

---

### revenue_pool.move

**Purpose**: Collects subscription fees and distributes to creators

**Key Structs**:
- `RevenuePool` - Central treasury (shared object)
- `UploaderAccount` - Creator earnings tracker (owned object)

**Revenue Split**:
- 30% → Platform operator
- 70% → Content creators (weighted by engagement)

**Weighted Multipliers**:
- 80-100% completion → 1.5x
- 50-79% completion → 1.25x
- 0-49% completion → 1.0x

**Functions**:
```move
public fun distribute_earnings(
    pool: &mut RevenuePool,
    uploader_accounts: vector<&mut UploaderAccount>,
    weighted_scores: vector<u64>,
    admin_cap: &AdminCap,
    ctx: &mut TxContext
)
```

---

## Database Schema (Highlights)

### users
- `wallet_address` (UNIQUE) - Sui wallet
- `username`, `email`, `avatar_url`
- Relations: memberships, streams, uploader_profiles

### memberships
- `nft_object_id` (UNIQUE) - Sui NFT identifier
- `member_number` (UNIQUE) - Sequential number (e.g., #001337)
- `is_active`, `expires_at`
- `active_card_url`, `expired_card_url` - IPFS URLs

### content
- `blockchain_id` (UNIQUE) - Sui ContentItem object ID
- `walrus_blob_ids` (JSON) - Array of Walrus blob IDs (multi-quality support)
- `duration_seconds`, `genre`, `status`
- TMDB fields: `tmdb_id`, `imdb_id`, `plot`, `cast`, `rating`, `poster_url`
- `storage_epochs`, `storage_expires_at` - Walrus metadata

### uploader_profiles
- `blockchain_account_id` (UNIQUE) - Sui UploaderAccount object ID
- `total_earnings`, `pending_earnings` (BigInt - in MIST, 1 SUI = 1B MIST)
- `referral_code` (5-char alphanumeric)
- `total_streams`, `total_content_uploaded`

### distributions (Weekly payouts)
- `uploader_id`, `week_start_date`, `amount`
- `weighted_score`, `total_streams`
- `blockchain_tx_digest` - On-chain verification

---

## API Endpoints (Selection)

### Authentication
- `POST /api/auth/challenge` - Get message to sign
- `POST /api/auth/verify` - Verify signature, get JWT

### Memberships
- `POST /api/membership/purchase` - Buy/renew membership
- `GET /api/membership/status` - Check membership validity
- `GET /api/membership/card/:id` - Get NFT card image

### Content
- `GET /api/content` - Browse all content (with filters)
- `GET /api/content/:id` - Get content details
- `POST /api/content/extend-storage` - Renew Walrus storage

### Streaming
- `POST /api/stream/start` - Initiate streaming session
- `GET /api/stream/hls/:id/playlist.m3u8` - HLS playlist
- `POST /api/stream/heartbeat` - Update watch progress
- `POST /api/stream/end` - End session

### Upload (Creator)
- `POST /api/upload/start` - Begin chunked upload
- `POST /api/upload/chunk` - Upload file chunk
- `POST /api/upload/complete` - Finalize upload, start transcoding
- `GET /api/uploader/analytics` - Creator dashboard stats

### Revenue
- `POST /api/revenue/distribute` - Trigger manual distribution (admin)
- `GET /api/uploader/earnings` - Creator earnings history

---

## Development Commands

```bash
# Monorepo commands
npm run dev              # Start all services
npm run build            # Build all workspaces
npm run clean            # Clean build artifacts

# Backend
npm run backend:dev      # Start with hot reload
npm run backend:test     # Run tests
npm run backend:lint     # Lint code

# Frontend
npm run frontend:dev     # Start dev server
npm run frontend:build   # Production build
npm run frontend:lint    # Lint code

# Database
npx prisma migrate dev   # Create migration
npx prisma studio        # GUI database browser
npx prisma db seed       # Load sample data

# Smart Contracts
sui move build           # Compile contracts
sui move test            # Run Move tests
sui client publish       # Deploy to blockchain
```

---

## Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/frontend
vercel --prod
```

**Environment Variables** (Vercel dashboard):
- `NEXT_PUBLIC_API_URL` - Backend URL (e.g., https://api.blobbu.st)
- `NEXT_PUBLIC_SUI_NETWORK` - `testnet` or `mainnet`

### Backend (Railway)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

**Environment Variables** (Railway dashboard):
- All backend `.env` variables (DATABASE_URL auto-provisioned)
- Enable PostgreSQL and Redis addons

### Smart Contracts (Sui)

```bash
# Deploy to mainnet
sui client publish --gas-budget 500000000 --network mainnet

# Verify deployment
sui client object <PACKAGE_ID>
```

---

## Monitoring & Maintenance

### Background Jobs (Bull Dashboard)

Access Redis job queue UI:
```bash
npm run backend:bull-board
# Visit http://localhost:3001/admin/queues
```

Monitor:
- Transcoding jobs (completed/failed)
- Revenue distribution jobs
- Metadata enrichment jobs

### Database Backups

```bash
# Daily backup (PostgreSQL)
pg_dump -U user blobbuster > backup_$(date +%Y%m%d).sql

# Restore
psql -U user blobbuster < backup_20250324.sql
```

### Logs

- Backend: Winston logs to `apps/backend/logs/` (daily rotation)
- Frontend: Vercel dashboard logs
- Blockchain: Sui Explorer transaction history

---

## Roadmap

### Q1 2025
- [x] MVP launch (testnet)
- [x] Weighted revenue distribution
- [x] Dynamic NFT membership cards
- [ ] Multi-quality transcoding (480p/1080p)
- [ ] Mainnet deployment

### Q2 2025
- [ ] Mobile app (React Native)
- [ ] Subtitle/caption support
- [ ] Enhanced creator analytics
- [ ] Full-text content search

### Q3 2025
- [ ] Tier system (Bronze/Silver/Gold memberships)
- [ ] Social features (comments, likes, playlists)
- [ ] Referral rewards program
- [ ] Live streaming support

### Q4 2025
- [ ] Cross-chain memberships (Ethereum, Solana)
- [ ] DAO governance token
- [ ] Content recommendation engine
- [ ] Regional CDN integration

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Linting**: ESLint + Prettier (auto-format on save)
- **Commits**: Conventional Commits format
- **Tests**: Jest for backend, Move tests for contracts

---

## Security

### Reporting Vulnerabilities

Email security@blobbu.st with:
- Description of vulnerability
- Steps to reproduce
- Potential impact

**Bug Bounty**: Up to $10,000 for critical findings (mainnet only)

### Security Measures

- JWT with 7-day expiry
- Wallet signature verification (Ed25519)
- Rate limiting on API endpoints
- CORS whitelisting
- SQL injection prevention (Prisma parameterized queries)
- Input validation (express-validator)

---

## License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Sui Foundation** - Blockchain infrastructure and Move language
- **Walrus Team** - Decentralized storage layer
- **TMDB** - Movie metadata API
- **Blockbuster LLC** - Inspiration (RIP)

---

## Support

- **Documentation**: [docs.blobbu.st](https://docs.blobbu.st)
- **Discord**: [discord.gg/blobbu](https://discord.gg/blobbu)
- **Twitter**: [@BlobBusterHQ](https://twitter.com/BlobBusterHQ)
- **Email**: support@blobbu.st

---

<p align="center">
  <strong>Built with ❤️ by the BlobBuster Team</strong><br>
  <em>Be kind. Rewind. Decentralize.</em>
</p>
