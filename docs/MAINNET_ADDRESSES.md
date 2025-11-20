# Blockbuster Mainnet Deployment

## Deployment Date
November 14, 2025

## Network
- **Sui Mainnet**: https://fullnode.mainnet.sui.io:443
- **Walrus Mainnet**: https://aggregator.walrus.space

## Smart Contract Addresses

### Package
```
PACKAGE_ID=0x41a661459697449b2716a697266e181ca4e359050eeeec791760f31af179b82a
```

### Shared Objects
```
MEMBER_REGISTRY=0xdb3ef26391dddb2696485b274994b37a1f9378d54f645c479ec91086a3dfbf71
CONTENT_REGISTRY=0xbd97c7c1c02ee1d73d99c4e9977d2edb7177f4812ba26f2c49ba48695a837bb3
REVENUE_POOL=0x5169b44147ee810c43c8f830c8e0840ded99c3c43abffc83b64417487d221954
```

### Admin Capabilities (Keep Private!)
```
MEMBERSHIP_ADMIN_CAP=0x08f001ed2e1e3040f5a2f35a8b987d68c9d9c37d15e90d5e938b9ecdca498d0b
CONTENT_ADMIN_CAP=0x72396d6856087aa9339620f901bf28ebc08fef1bb3076afa5edd3da27e023e6a
```

## Transaction Details
- **Transaction Digest**: F34RuAQy6y7HuFvBsmaJJanXQ6GsUHYA3yRKSPAMgf4F
- **Gas Used**: 0.0845 SUI
- **Epoch**: 948

## Explorer Links
- **Package**: https://suiscan.xyz/mainnet/object/0x41a661459697449b2716a697266e181ca4e359050eeeec791760f31af179b82a
- **Transaction**: https://suiscan.xyz/mainnet/tx/F34RuAQy6y7HuFvBsmaJJanXQ6GsUHYA3yRKSPAMgf4F

## Wallet Balance After Deployment
- **SUI**: 3.91 SUI
- **WAL**: 34.84 WAL

## Next Steps
1. Create fresh production database
2. Run Prisma migrations
3. Update backend `.env` with these addresses
4. Update frontend `.env` with mainnet URLs
5. Test upload/streaming flow
