# 🎬 BLOCKBUSTER - Decentralized Streaming on Sui

> **"The Blockbuster They Can't Kill" - Built on Sui Blockchain**

A decentralized peer-to-peer movie streaming platform that reimagines the classic video rental experience for the Web3 era. Built on Sui blockchain with Walrus storage integration.

## 🌟 Features

- **NFT-Based Memberships**: Three tiers (Basic, Premium, Collector) with tradeable NFTs
- **Fair Creator Revenue**: 70% of subscription fees go directly to content creators
- **Decentralized Storage**: Content stored on Walrus Protocol (censorship-resistant)
- **Weighted Scoring**: Creators earn more for high-completion content
- **Transparent Economics**: All payments and metrics tracked on-chain
- **Fast Transactions**: Sui's 2-3 second finality for instant streaming access

## 📦 Monorepo Structure

```
blockbuster-monorepo/
├── contracts/                    # Sui Move smart contracts
│   └── sui-contracts/           # Membership, Revenue, Content contracts
├── apps/                        # Applications
│   ├── backend/                 # Node.js REST API
│   └── frontend/                # Next.js web application
├── packages/                    # Shared libraries
│   ├── sui-sdk/                # Sui blockchain SDK
│   ├── shared-types/           # TypeScript types
│   └── ui-components/          # Shared UI components
├── infrastructure/              # DevOps and infrastructure
│   ├── docker/                 # Docker configurations
│   └── k8s/                    # Kubernetes manifests
└── docs/                       # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Sui CLI ([installation guide](https://docs.sui.io/build/install))
- PostgreSQL 15+
- Redis 7+
- FFmpeg
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd buster
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
# Start PostgreSQL and Redis (if using Docker)
docker-compose up -d postgres redis

# Run migrations
npm run db:migrate
```

5. **Deploy Sui contracts**
```bash
# Build contracts
npm run contracts:build

# Run tests
npm run contracts:test

# Deploy to devnet
npm run contracts:deploy

# Update .env with deployed package IDs
```

6. **Start development servers**
```bash
# Start all services
npm run dev

# Or start individually:
npm run backend:dev   # Backend API (port 3001)
npm run frontend:dev  # Frontend app (port 3000)
```

## 📖 Documentation

- **[Master Plan](./BLOCKBUSTER_SUI_MASTER_PLAN.md)** - Complete project specification
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture overview
- **[Smart Contracts](./contracts/sui-contracts/README.md)** - Move contracts documentation
- **[API Reference](./apps/backend/README.md)** - Backend API documentation
- **[Frontend Guide](./apps/frontend/README.md)** - Frontend development guide
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment guide

## 🏗️ Development Workflow

### Smart Contracts

```bash
# Build contracts
cd contracts/sui-contracts
sui move build

# Run tests
sui move test

# Deploy to testnet
sui client publish --gas-budget 100000000
```

### Backend

```bash
cd apps/backend
npm run dev          # Start dev server
npm run test         # Run tests
npm run lint         # Lint code
```

### Frontend

```bash
cd apps/frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific package tests
npm run test --filter=@blockbuster/backend
npm run test --filter=@blockbuster/frontend
```

## 🚢 Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

```bash
# Build all packages
npm run build

# Deploy contracts to mainnet
npm run contracts:deploy

# Deploy backend and frontend
# (see deployment guide for specific platform instructions)
```

## 📊 Project Status

- [x] Project planning and architecture
- [ ] Smart contract development (Week 1-2)
- [ ] Backend API development (Week 3-4)
- [ ] Frontend development (Week 5-6)
- [ ] Video processing pipeline (Week 4)
- [ ] Integration testing (Week 7-8)
- [ ] Beta launch (Week 11)
- [ ] Mainnet launch (Week 12)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- **Website**: [blockbuster.app](https://blockbuster.app)
- **Discord**: [Join our community](https://discord.gg/blockbuster)
- **Twitter**: [@BlockbusterSui](https://twitter.com/BlockbusterSui)
- **Docs**: [docs.blockbuster.app](https://docs.blockbuster.app)

## 💰 Economics

### Membership Tiers

| Tier | Price/Month | Benefits |
|------|-------------|----------|
| Basic | 100 SUI | HD streaming, 5 concurrent streams |
| Premium | 250 SUI | 4K streaming, 15 concurrent streams |
| Collector | 500 SUI | 4K HDR, unlimited streams, DAO voting |

### Revenue Split

- **70%** to content creators (weighted by watch completion)
- **30%** to platform operations

## 🛠️ Tech Stack

- **Blockchain**: Sui (Move language)
- **Storage**: Walrus Protocol
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: PostgreSQL, Redis
- **Video**: FFmpeg, Video.js

## 📞 Support

For questions and support:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Discord: [#support channel](https://discord.gg/blockbuster)
- Email: support@blockbuster.app

---

**Built with ❤️ by the Blockbuster team**

*The Blockbuster they tried to kill is back — decentralized, unstoppable, and built on Sui.*
