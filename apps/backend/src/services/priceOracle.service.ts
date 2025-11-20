import { SuiClient } from '@mysten/sui.js/client';
import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * Price Oracle Service
 * Fetches live prices from:
 * - SUI/USD from CoinGecko API
 * - WAL/SUI from Cetus DEX pool on Sui mainnet
 * - Calculates WAL/USD
 */

// Cetus WAL/SUI pool on Sui mainnet
const CETUS_WAL_SUI_POOL = '0x72f5c6eef73d77de271886219a2543e7c29a33de19a6c69c5cf1899f729c3f17';

// CoinGecko free API (no key needed)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface PriceInfo {
  walPerSui: number; // How many WAL per 1 SUI
  suiPerWal: number; // How many SUI per 1 WAL
  suiUsd: number; // SUI price in USD
  walUsd: number; // WAL price in USD (calculated)
  lastUpdated: Date;
  source: string;
}

export class PriceOracleService {
  private suiClient: SuiClient;
  private cachedPrice: PriceInfo | null = null;
  private cacheExpiry = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  constructor() {
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443';
    this.suiClient = new SuiClient({ url: rpcUrl });
    logger.info('Price Oracle service initialized');
  }

  /**
   * Get live SUI/USD price from CoinGecko
   */
  private async getSuiUsdPrice(): Promise<number> {
    try {
      const response = await axios.get(`${COINGECKO_API}/simple/price`, {
        params: {
          ids: 'sui',
          vs_currencies: 'usd',
        },
        timeout: 5000,
      });

      const suiUsd = response.data?.sui?.usd;

      if (!suiUsd || typeof suiUsd !== 'number') {
        throw new Error('Invalid SUI price response from CoinGecko');
      }

      logger.info(`SUI/USD price: $${suiUsd.toFixed(4)}`);
      return suiUsd;
    } catch (error) {
      logger.error('Failed to fetch SUI/USD price from CoinGecko', {
        error: error instanceof Error ? error.message : error,
      });
      // NO FALLBACK! Throw error so we don't show wrong prices
      throw new Error('Failed to fetch live SUI/USD price - refusing to use stale data');
    }
  }

  /**
   * Get current WAL/SUI price from Cetus DEX + SUI/USD from CoinGecko
   */
  async getWalSuiPrice(forceRefresh = false): Promise<PriceInfo> {
    // Return cached price if still valid
    if (!forceRefresh && this.cachedPrice && Date.now() < this.cacheExpiry) {
      logger.debug('Returning cached price data');
      return this.cachedPrice;
    }

    // Get live SUI/USD price first
    const suiUsd = await this.getSuiUsdPrice();

    // For testnet or if mainnet pool fails, use fallback price
    const isMainnet = process.env.SUI_NETWORK === 'mainnet';

    if (!isMainnet) {
      logger.error('Testnet pricing not supported - must use mainnet');
      throw new Error('WAL/SUI pricing only available on mainnet');
    }

    try {
      logger.info('Fetching WAL/SUI price from Cetus DEX', {
        pool: CETUS_WAL_SUI_POOL,
      });

      // Query the Cetus pool object
      const poolObject = await this.suiClient.getObject({
        id: CETUS_WAL_SUI_POOL,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!poolObject.data || poolObject.data.content?.dataType !== 'moveObject') {
        throw new Error('Invalid Cetus pool response');
      }

      const fields = (poolObject.data.content as any).fields;

      // Extract reserves from pool
      // Cetus uses coin_a and coin_b for the two tokens
      const reserveA = BigInt(fields.coin_a || fields.reserve_a || '0');
      const reserveB = BigInt(fields.coin_b || fields.reserve_b || '0');

      if (reserveA === 0n || reserveB === 0n) {
        throw new Error('Pool reserves are zero');
      }

      // Calculate price ratio
      // Assuming coin_a is SUI and coin_b is WAL (or vice versa)
      // We need to determine which is which from the pool type

      const poolType = poolObject.data.type || '';
      const isSuiFirst = poolType.includes('SUI') && poolType.indexOf('SUI') < poolType.indexOf('WAL');

      let suiReserve: bigint;
      let walReserve: bigint;

      if (isSuiFirst) {
        suiReserve = reserveA;
        walReserve = reserveB;
      } else {
        suiReserve = reserveB;
        walReserve = reserveA;
      }

      // Calculate price (accounting for 9 decimals on both tokens)
      const walPerSui = Number(walReserve) / Number(suiReserve);
      const suiPerWal = Number(suiReserve) / Number(walReserve);
      const walUsd = suiPerWal * suiUsd;

      const priceInfo: PriceInfo = {
        walPerSui,
        suiPerWal,
        suiUsd,
        walUsd,
        lastUpdated: new Date(),
        source: 'cetus',
      };

      logger.info('Live prices fetched successfully', {
        suiUsd: `$${suiUsd.toFixed(4)}`,
        walPerSui: walPerSui.toFixed(4),
        suiPerWal: suiPerWal.toFixed(4),
        walUsd: `$${walUsd.toFixed(4)}`,
        source: 'cetus + coingecko',
      });

      this.cachedPrice = priceInfo;
      this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

      return priceInfo;
    } catch (error) {
      logger.error('Failed to fetch WAL/SUI price from Cetus DEX', {
        error: error instanceof Error ? error.message : error,
        pool: CETUS_WAL_SUI_POOL,
      });

      // NO FALLBACK! We must have accurate prices or refuse to show estimates
      throw new Error('Failed to fetch live WAL/SUI exchange rate from Cetus DEX - refusing to use stale/estimated data');
    }
  }

  /**
   * Convert WAL amount to SUI equivalent
   */
  async convertWalToSui(walAmount: number): Promise<number> {
    const price = await this.getWalSuiPrice();
    return walAmount * price.suiPerWal;
  }

  /**
   * Convert SUI amount to WAL equivalent
   */
  async convertSuiToWal(suiAmount: number): Promise<number> {
    const price = await this.getWalSuiPrice();
    return suiAmount * price.walPerSui;
  }
}

// Singleton instance
let priceOracleInstance: PriceOracleService | null = null;

export function getPriceOracleService(): PriceOracleService {
  if (!priceOracleInstance) {
    priceOracleInstance = new PriceOracleService();
  }
  return priceOracleInstance;
}
