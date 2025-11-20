# Blockbuster Sui Smart Contracts

Move smart contracts for the Blockbuster decentralized streaming platform.

## Packages

### 1. Membership (`membership.move`)
- **Purpose**: NFT-based membership system with three tiers
- **Key Objects**:
  - `MembershipNFT`: User-owned membership card
  - `MemberRegistry`: Global registry tracking all members
  - `AdminCap`: Admin capability for platform operations
- **Functions**:
  - `initialize()`: Set up membership registry (one-time)
  - `mint_membership()`: Purchase new membership NFT
  - `renew_membership()`: Extend membership expiry
  - `verify_membership()`: Check if membership is active
  - `record_stream_usage()`: Update usage metrics

### 2. Revenue Pool (`revenue_pool.move`)
- **Purpose**: 70/30 revenue distribution with weighted scoring
- **Key Objects**:
  - `RevenuePool`: Shared pool collecting all subscription fees
  - `UploaderAccount`: Creator account tracking earnings
- **Functions**:
  - `initialize_pool()`: Set up revenue pool
  - `register_uploader()`: Register as content creator
  - `collect_fees()`: Receive membership payments
  - `update_stream_metrics()`: Record weighted watch scores
  - `distribute_reward()`: Pay creators (parallel execution)
  - `claim_earnings()`: Withdraw earnings to wallet

### 3. Content Registry (`content_registry.move`)
- **Purpose**: Catalog of all movies with streaming metrics
- **Key Objects**:
  - `ContentRegistry`: Global content catalog
  - `ContentItem`: Individual movie/show metadata
  - `StreamSession`: Viewing session record
- **Functions**:
  - `initialize_registry()`: Set up content registry
  - `register_content()`: Upload new content
  - `update_content_status()`: Approve/reject content (admin)
  - `track_stream()`: Record streaming session
  - `rate_content()`: Submit ratings (1-5 stars)

## Deployment

### Prerequisites

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

### Build

```bash
sui move build
```

### Test

```bash
sui move test
```

### Deploy to Devnet

```bash
# Switch to devnet
sui client switch --env devnet

# Check active address
sui client active-address

# Deploy
sui client publish --gas-budget 100000000
```

### Initialize Contracts

After deployment, initialize each contract:

```bash
# 1. Initialize Membership Registry
sui client call \
  --package $MEMBERSHIP_PACKAGE_ID \
  --module membership \
  --function initialize \
  --gas-budget 10000000

# 2. Initialize Revenue Pool
sui client call \
  --package $REVENUE_POOL_PACKAGE_ID \
  --module revenue_pool \
  --function initialize_pool \
  --gas-budget 10000000

# 3. Initialize Content Registry
sui client call \
  --package $CONTENT_REGISTRY_PACKAGE_ID \
  --module content_registry \
  --function initialize_registry \
  --gas-budget 10000000
```

### Save Configuration

After deployment, update `.env`:

```bash
MEMBERSHIP_PACKAGE_ID=0x...
REVENUE_POOL_PACKAGE_ID=0x...
CONTENT_REGISTRY_PACKAGE_ID=0x...
MEMBER_REGISTRY_OBJECT_ID=0x...
REVENUE_POOL_OBJECT_ID=0x...
CONTENT_REGISTRY_OBJECT_ID=0x...
ADMIN_CAP_OBJECT_ID=0x...
```

## Architecture

### Object Ownership Model

```
Owned Objects (user-controlled):
├── MembershipNFT (owned by member)
├── UploaderAccount (owned by creator)
└── StreamSession (owned by viewer)

Shared Objects (consensus required):
├── MemberRegistry (global state)
├── RevenuePool (payment collection)
└── ContentRegistry (content catalog)
```

### Transaction Flow

#### Purchase Membership
```
User → mint_membership(tier, duration, payment)
  ↓
1. Verify payment amount
2. Create MembershipNFT
3. Update MemberRegistry stats
4. Transfer fees to RevenuePool (70/30 split)
5. Transfer NFT to user
```

#### Stream Content
```
User → track_stream(content_id, membership_nft, watch_duration)
  ↓
1. Verify membership is active
2. Update ContentItem metrics
3. Update UploaderAccount weighted score
4. Update MembershipNFT usage
5. Create StreamSession record
```

#### Weekly Revenue Distribution
```
Backend → distribute_reward(uploader, amount) [parallel × N creators]
  ↓
1. Deduct from RevenuePool.pending_distribution
2. Add to UploaderAccount.pending_earnings
3. Reset weekly weighted scores
```

## Security

### Key Security Features

1. **Resource Safety**: Move's type system prevents:
   - Double-spending
   - Reentrancy attacks
   - Unauthorized access

2. **Capability Pattern**: `AdminCap` ensures only platform can:
   - Approve/reject content
   - Update pricing
   - Modify system parameters

3. **Ownership Verification**: All mutations verify:
   ```move
   assert!(nft.owner == tx_context::sender(ctx), ENotOwner);
   ```

4. **Timestamp Validation**: Expiry checks prevent:
   ```move
   assert!(nft.expires_at > tx_context::epoch(ctx), EMembershipExpired);
   ```

### Testing

Run comprehensive tests:

```bash
# All tests
sui move test

# Specific module
sui move test membership

# Verbose output
sui move test -v
```

### Gas Optimization

- Use `vector` for fixed-size lists (membership prices)
- Batch operations where possible
- Leverage parallel execution (owned objects)
- Dynamic fields for large metadata

## Error Codes

### Membership Errors
```move
const EInvalidTier: u64 = 1;
const EInsufficientPayment: u64 = 2;
const ENotOwner: u64 = 3;
const EMembershipExpired: u64 = 4;
const EStreamLimitExceeded: u64 = 5;
```

### Revenue Pool Errors
```move
const ENoPendingEarnings: u64 = 100;
const EInvalidDistribution: u64 = 101;
const EInsufficientPoolBalance: u64 = 102;
```

### Content Registry Errors
```move
const EInvalidRating: u64 = 200;
const EContentNotActive: u64 = 201;
const EUnauthorized: u64 = 202;
```

## Upgradeability

Contracts can be upgraded using Sui's upgrade mechanism:

```bash
sui client upgrade --upgrade-capability $CAP_ID
```

**Note**: Always test upgrades on devnet first!

## Indexing Events

The contracts emit events for off-chain indexing:

```move
struct ContentRegisteredEvent has copy, drop {
    content_id: ID,
    title: String,
    uploader: address,
    timestamp: u64,
}

struct DistributionEvent has copy, drop {
    epoch: u64,
    total_distributed: u64,
    recipient_count: u64,
}
```

Backend listens to these events to sync off-chain database.

## Resources

- [Sui Move Documentation](https://docs.sui.io/build/move)
- [Move Book](https://move-language.github.io/move/)
- [Sui Examples](https://github.com/MystenLabs/sui/tree/main/sui_programmability/examples)
