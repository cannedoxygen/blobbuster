import { SuiClient } from '@mysten/sui.js/client';
import { logger } from '../utils/logger';
import { getPriceOracleService } from './priceOracle.service';

/**
 * Walrus Pricing Service
 * Queries real-time storage pricing from the Walrus system object on Sui
 */

// Walrus system object ID
// Mainnet: 0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2
// Testnet: 0x98ebc47370603fe81d9e15491b2f1443d619d1dab720d586e429ed233e1255c1
const WALRUS_SYSTEM_OBJECT_ID_MAINNET = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';
const WALRUS_SYSTEM_OBJECT_ID_TESTNET = '0x98ebc47370603fe81d9e15491b2f1443d619d1dab720d586e429ed233e1255c1';

// FROST is the minimal coin unit in Walrus (like MIST for SUI)
const FROST_PER_WAL = 1_000_000_000; // 1 WAL = 1 billion FROST

export interface WalrusPricingInfo {
  currentEpoch: number;
  storagePrice: {
    perKiBFROST: string; // Price per KiB in FROST
    perKiBWAL: number; // Price per KiB in WAL
    perMBWAL: number; // Price per MB in WAL
    perGBWAL: number; // Price per GB in WAL
  };
  writePrice: {
    perKiBFROST: string; // Upload price per KiB in FROST
    perKiBWAL: number; // Upload price per KiB in WAL
    perMBWAL: number; // Upload price per MB in WAL
    perGBWAL: number; // Upload price per GB in WAL
  };
  capacity: {
    totalBytes: string;
    usedBytes: string;
    availableBytes: string;
    utilizationPercent: number;
  };
  epochDurationDays: number; // Testnet: ~1 day, Mainnet: multiple weeks
  fetchedAt: Date;
}

export interface StorageCostEstimate {
  fileSize: {
    bytes: number;
    mb: number;
    encodedMB: number; // ~5x original + 64MB metadata
  };
  duration: {
    epochs: number;
    days: number;
  };
  costs: {
    storageWAL: number;
    uploadWAL: number;
    totalWAL: number;
    storageSUI: number;
    uploadSUI: number;
    totalSUI: number; // Storage + upload costs in SUI (no gas)
    suiGas: number; // Estimated Sui transaction gas
    totalWithGas: number; // Total SUI including gas (what user actually pays)
  };
  breakdown: string[];
}

export class WalrusPricingService {
  private suiClient: SuiClient;
  private cachedPricing: WalrusPricingInfo | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(suiRpcUrl: string) {
    this.suiClient = new SuiClient({ url: suiRpcUrl });
    logger.info('Walrus pricing service initialized', { rpcUrl: suiRpcUrl });
  }

  /**
   * Get current Walrus pricing
   * Note: Testnet pricing is arbitrary. These are reasonable estimates based on expected mainnet economics.
   * Mainnet pricing (March 2025+) will be queried from the Walrus system object.
   */
  async getCurrentPricing(forceRefresh = false): Promise<WalrusPricingInfo> {
    // Return cached pricing if still valid
    if (!forceRefresh && this.cachedPricing && Date.now() < this.cacheExpiry) {
      logger.debug('Returning cached Walrus pricing');
      return this.cachedPricing;
    }

    // Query actual pricing from Walrus system object on mainnet
    // For testnet, use estimated pricing

    const isMainnet = process.env.SUI_NETWORK === 'mainnet';

    if (isMainnet) {
      logger.info('Using Walrus mainnet pricing (hardcoded from walrus info)');

      // Real mainnet pricing from `walrus info` command (Nov 2025):
      // - Marginal price per MiB unencoded: 66,000 FROST = 0.000066 WAL per epoch
      // - Metadata cost: 0.0007 WAL (included in first MiB)
      // - Upload/write: 20,000 FROST = 0.00002 WAL (one-time)
      // - Epoch duration: 14 days (exactly)
      // Based on walrus info examples:
      // - 512 MiB: 0.026 WAL/epoch → ~0.00005 WAL/MiB/epoch
      // - 13.6 GiB: 0.689 WAL/epoch → ~0.00005 WAL/MiB/epoch
      const storagePricePerMiBPerEpoch = 0.00005; // WAL/MiB/epoch (simplified from examples)
      const uploadPricePerBlob = 0.00002; // WAL per blob (one-time)

      // Convert to per-KiB for the pricing structure
      const storagePricePerKiBPerEpoch = storagePricePerMiBPerEpoch / 1024; // MiB to KiB
      const uploadPricePerKiB = uploadPricePerBlob / (1024 * 1024); // Per blob to per KiB estimate

      // Calculate FROST values (1 WAL = 1 billion FROST)
      const storagePriceFROST = Math.floor(storagePricePerKiBPerEpoch * FROST_PER_WAL);
      const uploadPriceFROST = Math.floor(uploadPricePerKiB * FROST_PER_WAL);

      const pricingInfo: WalrusPricingInfo = {
        currentEpoch: Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)), // 14-day epochs
        storagePrice: {
          perKiBFROST: storagePriceFROST.toString(),
          perKiBWAL: storagePricePerKiBPerEpoch,
          perMBWAL: storagePricePerMiBPerEpoch,
          perGBWAL: storagePricePerMiBPerEpoch * 1024,
        },
        writePrice: {
          perKiBFROST: uploadPriceFROST.toString(),
          perKiBWAL: uploadPricePerKiB,
          perMBWAL: uploadPricePerKiB * 1024,
          perGBWAL: uploadPricePerKiB * 1024 * 1024,
        },
        capacity: {
          totalBytes: '0',
          usedBytes: '0',
          availableBytes: '0',
          utilizationPercent: 0,
        },
        epochDurationDays: 14, // Mainnet: 14 days
        fetchedAt: new Date(),
      };

      this.cachedPricing = pricingInfo;
      this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

      return pricingInfo;
    }

    // TESTNET: Use estimated pricing
    logger.info('Using Walrus testnet pricing (estimated)');

    // Testnet uses lower, arbitrary pricing
    const storagePricePerMiBPerEpoch = 0.00001; // WAL/MiB/epoch (slightly lower than mainnet)
    const uploadPricePerBlob = 0.00001; // WAL per blob

    const storagePricePerKiBPerEpoch = storagePricePerMiBPerEpoch / 1024;
    const uploadPricePerKiB = uploadPricePerBlob / (1024 * 1024);

    const storagePriceFROST = Math.floor(storagePricePerKiBPerEpoch * FROST_PER_WAL);
    const uploadPriceFROST = Math.floor(uploadPricePerKiB * FROST_PER_WAL);

    const pricingInfo: WalrusPricingInfo = {
      currentEpoch: Math.floor(Date.now() / (24 * 60 * 60 * 1000)), // 1-day epochs
      storagePrice: {
        perKiBFROST: storagePriceFROST.toString(),
        perKiBWAL: storagePricePerKiBPerEpoch,
        perMBWAL: storagePricePerMiBPerEpoch,
        perGBWAL: storagePricePerMiBPerEpoch * 1024,
      },
      writePrice: {
        perKiBFROST: uploadPriceFROST.toString(),
        perKiBWAL: uploadPricePerKiB,
        perMBWAL: uploadPricePerKiB * 1024,
        perGBWAL: uploadPricePerKiB * 1024 * 1024,
      },
      capacity: {
        totalBytes: '0',
        usedBytes: '0',
        availableBytes: '0',
        utilizationPercent: 0,
      },
      epochDurationDays: 1, // Testnet: ~1 day
      fetchedAt: new Date(),
    };

    this.cachedPricing = pricingInfo;
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

    return pricingInfo;
  }

  /**
   * Estimate storage cost for a file
   * WAL token pricing based on walrus info (Nov 2025)
   * @param fileSizeBytes - Original file size in bytes
   * @param epochs - Number of epochs to store
   * @returns Detailed cost estimate
   */
  async estimateStorageCost(
    fileSizeBytes: number,
    epochs: number
  ): Promise<StorageCostEstimate> {
    const pricing = await this.getCurrentPricing();

    // File size in MiB (unencoded)
    const fileSizeMiB = fileSizeBytes / (1024 * 1024);

    // Walrus pricing formula (based on walrus info):
    // - Storage cost per epoch: ~0.00005 WAL per MiB unencoded
    // - Metadata included in marginal price
    // - Write cost (one-time): 0.00002 WAL
    const WAL_PER_MIB_PER_EPOCH = pricing.storagePrice.perMBWAL; // 0.00005 WAL/MiB/epoch
    const WRITE_COST_WAL = 0.00002; // One-time write fee

    // Calculate storage cost in WAL
    const storageCostWAL = fileSizeMiB * WAL_PER_MIB_PER_EPOCH * epochs;

    // Upload cost (flat one-time fee)
    const uploadCostWAL = WRITE_COST_WAL;

    // Total in WAL
    const totalWAL = storageCostWAL + uploadCostWAL;

    // Convert to SUI for display (get current WAL/SUI rate from oracle)
    const priceOracle = getPriceOracleService();
    const priceInfo = await priceOracle.getWalSuiPrice();
    const walToSuiRate = priceInfo.suiPerWal;

    const storageCostSUI = storageCostWAL * walToSuiRate;
    const uploadCostSUI = uploadCostWAL * walToSuiRate;
    const totalCostSUI = totalWAL * walToSuiRate;

    // Estimate Sui gas for transactions (~0.01-0.02 SUI for register_blob + certify_blob)
    const suiGas = 0.015;

    // Platform revenue multiplier (3x the actual costs)
    const PLATFORM_MULTIPLIER = 3.0;

    // Calculate what user actually pays (3x the costs + gas)
    const totalWithGas = (totalCostSUI + suiGas) * PLATFORM_MULTIPLIER;

    const durationDays = epochs * pricing.epochDurationDays;

    // Calculate approximate encoded size for display (4.5x ratio for large files)
    const encodedSizeMB = fileSizeMiB * 4.5; // Approximate RedStuff encoding

    const breakdown = [
      `Original file size: ${fileSizeMiB.toFixed(2)} MiB`,
      `Estimated encoded size (~4.5x): ${encodedSizeMB.toFixed(2)} MiB`,
      `Walrus storage cost: ${storageCostWAL.toFixed(4)} WAL for ${epochs} epochs (${durationDays} days)`,
      `Walrus write fee: ${uploadCostWAL.toFixed(6)} WAL`,
      `Total Walrus cost: ${totalWAL.toFixed(4)} WAL`,
      `---`,
      `Base payment (SUI equivalent): ${totalCostSUI.toFixed(4)} SUI`,
      `Platform gas fee: ${suiGas.toFixed(4)} SUI`,
      `Platform multiplier: ${PLATFORM_MULTIPLIER}x`,
      `User pays total: ${totalWithGas.toFixed(4)} SUI`,
      `---`,
      `Platform pays Walrus: ${totalWAL.toFixed(4)} WAL (from platform wallet)`,
    ];

    return {
      fileSize: {
        bytes: fileSizeBytes,
        mb: fileSizeMiB,
        encodedMB: encodedSizeMB,
      },
      duration: {
        epochs,
        days: durationDays,
      },
      costs: {
        storageWAL: parseFloat(storageCostWAL.toFixed(6)),
        uploadWAL: parseFloat(uploadCostWAL.toFixed(6)),
        totalWAL: parseFloat(totalWAL.toFixed(6)),
        storageSUI: parseFloat(storageCostSUI.toFixed(6)),
        uploadSUI: parseFloat(uploadCostSUI.toFixed(6)),
        totalSUI: parseFloat(totalCostSUI.toFixed(6)),
        suiGas,
        totalWithGas: parseFloat(totalWithGas.toFixed(6)),
      },
      breakdown,
    };
  }

  /**
   * Clear cached pricing (force refresh on next request)
   */
  clearCache(): void {
    this.cachedPricing = null;
    this.cacheExpiry = 0;
    logger.debug('Walrus pricing cache cleared');
  }
}

// Singleton instance
let walrusPricingServiceInstance: WalrusPricingService | null = null;

export function getWalrusPricingService(): WalrusPricingService {
  if (!walrusPricingServiceInstance) {
    const suiRpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
    walrusPricingServiceInstance = new WalrusPricingService(suiRpcUrl);
  }
  return walrusPricingServiceInstance;
}

export default WalrusPricingService;
