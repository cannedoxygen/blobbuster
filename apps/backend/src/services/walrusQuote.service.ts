import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Walrus Quote Service
 * Gets REAL cost quotes directly from Walrus CLI using --dry-run
 * This is far more accurate than estimating with formulas!
 */

export interface WalrusQuote {
  filePath: string;
  blobId: string;
  unencodedSize: number; // Original file size in bytes
  encodedSize: number; // Size after erasure coding
  storageCostMIST: number; // Actual cost in MIST (from Walrus)
  storageCostSUI: number; // Converted to SUI (MIST / 1B)
  encodingType: string; // e.g., "RS2"
  epochs: number;
}

export class WalrusQuoteService {
  /**
   * Get a real cost quote from Walrus based on file size
   * Creates a temporary dummy file, gets quote, deletes it
   * Uses --dry-run so no actual transaction is made
   * @throws Error if Walrus CLI fails or returns invalid data
   */
  async getQuoteBySize(fileSizeBytes: number, epochs: number): Promise<Omit<WalrusQuote, 'filePath' | 'blobId'>> {
    const tempFile = `/tmp/walrus-quote-${Date.now()}.dat`;

    try {
      logger.info('Creating dummy file for Walrus quote', {
        sizeBytes: fileSizeBytes,
        sizeMB: (fileSizeBytes / (1024 * 1024)).toFixed(2),
        epochs,
      });

      // Create dummy file of exact size (truncate is instant, dd is slow)
      // Note: truncate creates a sparse file, but Walrus dry-run still calculates correct encoding
      const createCmd = `truncate -s ${fileSizeBytes} "${tempFile}"`;
      await execAsync(createCmd, { timeout: 10000 });

      // Get quote from Walrus
      const quote = await this.getQuote(tempFile, epochs);

      // Clean up dummy file
      await execAsync(`rm "${tempFile}"`);

      // Return quote without filePath and blobId (they're for dummy file)
      const { filePath, blobId, ...quoteData } = quote;
      return quoteData;
    } catch (error) {
      // Clean up dummy file if it exists
      try {
        await execAsync(`rm "${tempFile}"`);
      } catch {}

      throw error;
    }
  }

  /**
   * Get a real cost quote from Walrus for an existing file
   * Uses --dry-run so no actual transaction is made
   * @throws Error if Walrus CLI fails or returns invalid data
   */
  async getQuote(filePath: string, epochs: number): Promise<WalrusQuote> {
    try {
      logger.info('Getting real Walrus quote', {
        filePath,
        epochs,
      });

      // Run Walrus with --dry-run to get cost without uploading
      const walrusCmd = `${process.env.HOME}/.local/bin/walrus store --epochs ${epochs} --permanent --dry-run --json "${filePath}"`;

      const { stdout, stderr } = await execAsync(walrusCmd, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 60000, // 60 seconds for dry-run
      });

      // Parse the JSON output
      const result = JSON.parse(stdout);

      // Dry-run returns an array of file results
      const quoteData = Array.isArray(result) ? result[0] : result;

      if (!quoteData || typeof quoteData.storageCost !== 'number') {
        logger.error('Invalid Walrus quote response', {
          result: JSON.stringify(result, null, 2),
        });
        throw new Error('Walrus dry-run returned invalid data');
      }

      const storageCostMIST = quoteData.storageCost;
      const storageCostSUI = storageCostMIST / 1_000_000_000;

      const quote: WalrusQuote = {
        filePath,
        blobId: quoteData.blobId,
        unencodedSize: quoteData.unencodedSize,
        encodedSize: quoteData.encodedSize,
        storageCostMIST,
        storageCostSUI,
        encodingType: quoteData.encodingType || 'RS2',
        epochs,
      };

      logger.info('Real Walrus quote received', {
        fileSizeMB: (quote.unencodedSize / (1024 * 1024)).toFixed(2),
        encodedSizeMB: (quote.encodedSize / (1024 * 1024)).toFixed(2),
        encodingRatio: (quote.encodedSize / quote.unencodedSize).toFixed(2),
        costSUI: quote.storageCostSUI.toFixed(6),
        costMIST: quote.storageCostMIST,
        epochs,
      });

      return quote;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get Walrus quote', {
        filePath,
        epochs,
        error: errorMessage,
      });

      // NO FALLBACK! Fail loudly if we can't get a real quote
      throw new Error(`Failed to get Walrus storage quote: ${errorMessage}`);
    }
  }

  /**
   * Estimate gas fees for the Walrus storage transaction
   * This is separate from storage cost
   */
  estimateGasCost(fileSizeMB: number): number {
    // Gas fees scale slightly with file size but are relatively small
    // Based on actual mainnet transactions:
    // - Small files (<100MB): ~0.01-0.02 SUI
    // - Medium files (100MB-1GB): ~0.02-0.05 SUI
    // - Large files (>1GB): ~0.05-0.1 SUI

    if (fileSizeMB < 100) {
      return 0.02; // 0.02 SUI for small files
    } else if (fileSizeMB < 1000) {
      return 0.05; // 0.05 SUI for medium files
    } else {
      return 0.1; // 0.1 SUI for large files
    }
  }
}

// Singleton instance
let walrusQuoteServiceInstance: WalrusQuoteService | null = null;

export function getWalrusQuoteService(): WalrusQuoteService {
  if (!walrusQuoteServiceInstance) {
    walrusQuoteServiceInstance = new WalrusQuoteService();
  }
  return walrusQuoteServiceInstance;
}

export default WalrusQuoteService;
