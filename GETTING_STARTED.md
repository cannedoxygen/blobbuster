# 🚀 Getting Started with Blockbuster

Welcome to the Blockbuster decentralized streaming platform! This guide will help you set up your development environment and start building.

## 📋 What's Been Created

Your monorepo now contains:

```
blockbuster-monorepo/
├── contracts/sui-contracts/          ✓ Move smart contracts (3 modules)
├── apps/backend/                     ✓ Node.js REST API
├── apps/frontend/                    ✓ Next.js web application
├── packages/shared-types/            ✓ Shared TypeScript types
├── infrastructure/                   ✓ Docker & K8s configs
├── docs/                             ✓ Architecture & deployment docs
├── docker-compose.yml                ✓ Local development setup
├── .env.example                      ✓ Environment variable template
└── README.md                         ✓ Project overview
```

## 🎯 Prerequisites

Install these tools before proceeding:

### Required
- **Node.js 20+**: [Download](https://nodejs.org/)
- **Sui CLI**: Install via `cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui`
- **Docker & Docker Compose**: [Get Docker](https://docs.docker.com/get-docker/)
- **Git**: [Download](https://git-scm.com/downloads)

### Optional (for production)
- **PostgreSQL 15+**: [Download](https://www.postgresql.org/download/)
- **Redis 7+**: [Download](https://redis.io/download)
- **FFmpeg**: `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Linux)

## 🏁 Quick Start (5 Minutes)

### Step 1: Environment Setup

```bash
# Navigate to project
cd /Users/cannedoxygen/Downloads/buster

# Copy environment template
cp .env.example .env

# Open .env and fill in required values (see below)
nano .env
```

**Minimum required values for local development:**
```env
# Use Sui testnet for development
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_NETWORK=testnet

# Generate a new Sui address for development
# Run: sui client new-address ed25519
# Copy the private key (base64) here
SUI_PRIVATE_KEY=your_base64_private_key_here

# Database (Docker will provide these)
DATABASE_URL=postgresql://blockbuster:password@localhost:5432/blockbuster_db
REDIS_URL=redis://localhost:6379

# JWT secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_generated_secret_here
SESSION_SECRET=your_generated_secret_here

# API settings
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm install --workspaces
```

### Step 3: Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready (10-15 seconds)
docker-compose ps
```

### Step 4: Build & Deploy Smart Contracts

```bash
# Build Move contracts
cd contracts/sui-contracts
sui move build

# Run tests to verify
sui move test

# Deploy to testnet
sui client publish --gas-budget 100000000

# ⚠️ IMPORTANT: Copy the package IDs and object IDs from output
# Update your .env file with:
# MEMBERSHIP_PACKAGE_ID=0x...
# REVENUE_POOL_PACKAGE_ID=0x...
# CONTENT_REGISTRY_PACKAGE_ID=0x...
# MEMBER_REGISTRY_OBJECT_ID=0x...
# REVENUE_POOL_OBJECT_ID=0x...
# CONTENT_REGISTRY_OBJECT_ID=0x...
```

### Step 5: Set Up Database

```bash
# Return to root
cd ../..

# Generate Prisma client
cd apps/backend
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database with test data
npm run db:seed
```

### Step 6: Start Development Servers

```bash
# Return to root
cd ../..

# Start all services (backend + frontend)
npm run dev

# Or start individually:
npm run backend:dev   # Backend API on http://localhost:3001
npm run frontend:dev  # Frontend on http://localhost:3000
```

### Step 7: Verify Installation

Open your browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/health

You should see the Blockbuster homepage with the 80s neon aesthetic! 🎬

## 📚 Next Steps

### For Backend Development

```bash
cd apps/backend

# Watch mode (auto-reload)
npm run dev

# Run tests
npm test

# Check database
npx prisma studio  # Opens GUI at http://localhost:5555
```

**Key files to explore:**
- `src/app.ts` - Express app configuration
- `src/routes/*.routes.ts` - API endpoint handlers
- `src/services/suiBlockchain.service.ts` - Sui integration
- `prisma/schema.prisma` - Database schema

### For Frontend Development

```bash
cd apps/frontend

# Development server
npm run dev

# Build for production
npm run build
```

**Key files to explore:**
- `app/page.tsx` - Homepage
- `app/layout.tsx` - Root layout
- `app/providers.tsx` - Sui wallet setup
- `lib/api.ts` - API client

### For Smart Contract Development

```bash
cd contracts/sui-contracts

# Build contracts
sui move build

# Run tests
sui move test

# Test specific module
sui move test membership

# Deploy to devnet
sui client switch --env devnet
sui client publish --gas-budget 100000000
```

**Key files to explore:**
- `sources/membership.move` - Membership NFTs
- `sources/revenue_pool.move` - Revenue distribution
- `sources/content_registry.move` - Content catalog
- `tests/*.move` - Unit tests

## 🧪 Testing

### Backend Tests
```bash
cd apps/backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
```

### Smart Contract Tests
```bash
cd contracts/sui-contracts
sui move test              # All tests
sui move test -v           # Verbose output
```

### E2E Tests (Coming Soon)
```bash
npm run test:e2e
```

## 🔧 Common Tasks

### Add New API Endpoint

1. Create route handler in `apps/backend/src/routes/`
2. Create service logic in `apps/backend/src/services/`
3. Add API client function in `apps/frontend/lib/api.ts`
4. Use in React components

### Add New Smart Contract Function

1. Add function to relevant `.move` file
2. Write test in `tests/*.move`
3. Run `sui move test`
4. Update `suiBlockchain.service.ts` to call new function
5. Redeploy contract

### Add New Frontend Page

1. Create `app/your-page/page.tsx`
2. Add navigation link in `app/page.tsx`
3. Style with Tailwind classes
4. Connect to API with React Query

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart if needed
docker-compose restart postgres
```

### "Sui CLI command not found"
```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# Verify installation
sui --version
```

### "Port 3000 already in use"
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3002
```

### "FFmpeg not found"
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Verify
ffmpeg -version
```

### "Prisma Client not generated"
```bash
cd apps/backend
npx prisma generate
```

## 📖 Documentation

- **[Master Plan](./BLOCKBUSTER_SUI_MASTER_PLAN.md)** - Full project specification
- **[Architecture](./docs/ARCHITECTURE.md)** - Technical architecture
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment
- **[Backend README](./apps/backend/README.md)** - API documentation
- **[Frontend README](./apps/frontend/README.md)** - UI components
- **[Contracts README](./contracts/sui-contracts/README.md)** - Smart contracts

## 🤝 Development Workflow

### Daily Workflow
```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Run migrations (if schema changed)
cd apps/backend && npx prisma migrate dev

# 4. Start development
cd ../..
npm run dev
```

### Before Committing
```bash
# Format code
npm run format

# Lint
npm run lint

# Run tests
npm run test

# Build (verify no errors)
npm run build
```

### Creating a Feature
```bash
# 1. Create branch
git checkout -b feature/your-feature-name

# 2. Make changes

# 3. Test thoroughly
npm run test

# 4. Commit
git add .
git commit -m "Add: your feature description"

# 5. Push
git push origin feature/your-feature-name

# 6. Create Pull Request on GitHub
```

## 🚀 Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete production deployment guide.

**Quick production build:**
```bash
# Build all packages
npm run build

# Deploy contracts to mainnet
cd contracts/sui-contracts
sui client switch --env mainnet
sui client publish --gas-budget 100000000

# Update .env with mainnet values
# Then deploy backend & frontend (see deployment guide)
```

## 💡 Pro Tips

1. **Use Sui Explorer**: View your transactions at https://suiexplorer.com/
2. **Prisma Studio**: Visual database editor at http://localhost:5555
3. **Hot Reload**: Backend and frontend auto-reload on file changes
4. **TypeScript**: Leverage type safety - fix all TS errors!
5. **Tailwind**: Use `className` for styling - check `tailwind.config.js` for custom classes

## 🔗 Useful Links

- **Sui Documentation**: https://docs.sui.io/
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Wallet Kit**: https://sdk.mystenlabs.com/wallet-kit
- **Tailwind CSS**: https://tailwindcss.com/docs

## 🆘 Getting Help

- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Discord**: Join #blockbuster-dev
- **Sui Discord**: https://discord.gg/sui
- **Stack Overflow**: Tag with `sui` and `blockbuster`

## 🎓 Learning Resources

### Sui Development
- [Move Book](https://move-language.github.io/move/)
- [Sui Move by Example](https://examples.sui.io/)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/)

### Full-Stack Web3
- [Next.js Tutorial](https://nextjs.org/learn)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## ✅ Checklist: First 30 Minutes

- [ ] Install all prerequisites (Node.js, Sui CLI, Docker)
- [ ] Clone/navigate to project
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in environment variables
- [ ] Run `npm install`
- [ ] Start Docker services (`docker-compose up -d postgres redis`)
- [ ] Deploy smart contracts to testnet
- [ ] Update `.env` with contract addresses
- [ ] Run database migrations
- [ ] Start development servers (`npm run dev`)
- [ ] Open http://localhost:3000 in browser
- [ ] See Blockbuster homepage 🎉

---

**You're now ready to build the decentralized streaming platform of the future! 🎬**

Questions? Check the docs or reach out on Discord.

Happy building! 🚀
