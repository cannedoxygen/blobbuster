import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Walrus Storage Service
 * Implements production-ready integration with Walrus decentralized storage
 * Documentation: https://docs.wal.app/usage/web-api.html
 */

export interface WalrusConfig {
  publisherUrl: string;
  aggregatorUrl: string;
  apiKey?: string; // Required for mainnet publishers
  defaultEpochs: number;
  permanent: boolean;
}

export interface WalrusUploadResult {
  blobId: string;
  objectId?: string;
  size: number;
  epochs: number;
  cost: number;
  storageCostSUI: string;
  deletable: boolean;
  encodingType: string;
  createdAt: Date;
}

export interface WalrusRetrievalOptions {
  cacheControl?: string;
  range?: { start: number; end: number };
}

export interface WalrusBlobMetadata {
  blobId: string;
  size: number;
  epochs: number;
  expiresAt: Date;
  isPermanent: boolean;
}

export class WalrusService {
  private publisherClient: AxiosInstance;
  private aggregatorClient: AxiosInstance;
  private config: WalrusConfig;

  constructor(config: WalrusConfig) {
    this.config = config;

    // Publisher client for storing blobs
    this.publisherClient = axios.create({
      baseURL: config.publisherUrl,
      timeout: 900000, // 15 minutes for large uploads (1GB+ files)
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });

    // Aggregator client for reading blobs
    this.aggregatorClient = axios.create({
      baseURL: config.aggregatorUrl,
      timeout: 120000, // 2 minutes for downloads
      headers: {
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });

    logger.info('Walrus service initialized', {
      publisher: config.publisherUrl,
      aggregator: config.aggregatorUrl,
      authenticated: !!config.apiKey,
    });
  }

  /**
   * Upload a file to Walrus storage using CLI (bypasses 10 MB HTTP limit)
   * @param filePath - Local path to file to upload
   * @param options - Storage options (epochs, permanent, destination)
   * @returns Upload result with blob ID and metadata
   */
  async uploadFile(
    filePath: string,
    options?: {
      epochs?: number;
      permanent?: boolean;
      sendObjectTo?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<WalrusUploadResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const stats = await fs.stat(filePath);
        const epochs = options?.epochs || this.config.defaultEpochs;

        logger.info('Uploading file to Walrus via CLI', {
          path: filePath,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          epochs,
          attempt,
          maxRetries,
        });

        // Use Walrus CLI for upload (no file size limit!)
        // IMPORTANT: Always use --permanent flag to ensure blobs are stored (not deletable)
        // Even with --permanent, blobs still expire after the specified epochs
        // Let Walrus auto-calculate gas (removing --gas-budget to avoid issues)
        const permanentFlag = '--permanent'; // Always permanent to prevent deletable status
        const walrusCmd = `${process.env.HOME}/.local/bin/walrus store --epochs ${epochs} ${permanentFlag} --json "${filePath}"`;

        const { stdout, stderr } = await execAsync(walrusCmd, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for output
          timeout: 900000, // 15 minutes timeout
        });

        // Walrus CLI outputs INFO/WARN logs to stderr - only fail on actual errors
        if (stderr) {
          const hasError = stderr.includes('ERROR') || stderr.includes('Error:') || stderr.includes('error:');
          const hasWarning = stderr.includes('WARN') || stderr.includes('warning');
          const hasInfo = stderr.includes('INFO');

          // ALWAYS log stderr for debugging upload issues
          logger.info('Walrus CLI stderr output', {
            level: hasError ? 'error' : hasWarning ? 'warn' : 'info',
            output: stderr.substring(0, 5000),
            filePath,
          });

          if (hasError) {
            // Only throw on actual ERROR level messages
            throw new Error(`Walrus CLI error: ${stderr}`);
          }
        }

        // Parse CLI JSON output
        if (!stdout || stdout.trim().length === 0) {
          logger.error('Walrus CLI returned no output', {
            stderr: stderr?.substring(0, 5000),
            command: walrusCmd,
          });
          throw new Error(`Walrus CLI returned no output. stderr: ${stderr?.substring(0, 1000)}`);
        }

        // Log full stdout for debugging
        logger.info('Walrus CLI stdout output', {
          output: stdout.substring(0, 2000),
          filePath,
        });

        const result = JSON.parse(stdout);

        // Walrus CLI returns an array of results when storing files
        const blobResult = Array.isArray(result) ? result[0] : result;

        // Extract blob ID from CLI response (handle multiple status types)
        let blobId: string | undefined;

        if (blobResult.blobStoreResult) {
          // New format: { blobStoreResult: { newlyCreated/alreadyCertified/... } }
          const storeResult = blobResult.blobStoreResult;
          blobId = storeResult.newlyCreated?.blobObject?.blobId ||
                  storeResult.alreadyCertified?.blobId ||
                  storeResult.deletable?.blobObject?.blobId;
        } else {
          // Old format: direct properties
          blobId = blobResult.blobId ||
                  blobResult.newlyCreated?.blobObject?.blobId ||
                  blobResult.alreadyCertified?.blobId ||
                  blobResult.deletable?.blobObject?.blobId;
        }

        if (!blobId) {
          logger.error('Failed to extract blob ID from Walrus response', {
            result: JSON.stringify(result, null, 2),
            stderr
          });
          throw new Error('Failed to extract blob ID from Walrus CLI response');
        }

        // Extract additional metadata from the blob result
        let objectId: string | undefined;
        let cost = 0;
        let storageCostSUI = '0';
        let encodingType = 'RedStuff';

        if (blobResult.blobStoreResult) {
          const storeResult = blobResult.blobStoreResult;
          objectId = storeResult.newlyCreated?.blobObject?.id ||
                    storeResult.alreadyCertified?.object ||
                    storeResult.deletable?.blobObject?.id;
          cost = storeResult.newlyCreated?.cost || storeResult.deletable?.cost || 0;
          storageCostSUI = storeResult.newlyCreated?.blobObject?.storage?.storageAmount ||
                          storeResult.deletable?.blobObject?.storage?.storageAmount || '0';
          encodingType = storeResult.newlyCreated?.blobObject?.encodingType ||
                        storeResult.deletable?.blobObject?.encodingType || 'RedStuff';
        } else {
          objectId = blobResult.newlyCreated?.blobObject?.id ||
                    blobResult.alreadyCertified?.eventOrObject?.Event?.txDigest ||
                    blobResult.deletable?.blobObject?.id;
          cost = blobResult.newlyCreated?.cost || blobResult.deletable?.cost || 0;
          storageCostSUI = blobResult.newlyCreated?.blobObject?.storage?.storageAmount ||
                          blobResult.deletable?.blobObject?.storage?.storageAmount || '0';
          encodingType = blobResult.newlyCreated?.blobObject?.encodingType ||
                        blobResult.deletable?.blobObject?.encodingType || 'RedStuff';
        }

        const uploadResult: WalrusUploadResult = {
          blobId,
          objectId,
          size: stats.size,
          epochs,
          cost,
          storageCostSUI,
          deletable: !options?.permanent,
          encodingType,
          createdAt: new Date(),
        };

        // CRITICAL: Verify blob actually exists on Walrus
        // If cost=0, it might be "alreadyCertified" but blob doesn't actually exist
        if (cost === 0) {
          logger.warn('Walrus upload returned cost=0, verifying blob exists...', {
            blobId,
            filePath,
            resultType: blobResult.blobStoreResult ?
              Object.keys(blobResult.blobStoreResult)[0] : 'unknown',
          });

          // Try to verify blob exists on aggregator
          try {
            const verifyUrl = `${this.config.aggregatorUrl}/v1/blobs/${blobId}`;
            const verifyResponse = await axios.head(verifyUrl, {
              timeout: 10000,
              validateStatus: (status) => status < 500,
            });

            if (verifyResponse.status === 404) {
              logger.error('CRITICAL: Walrus CLI returned blob ID but blob does NOT exist!', {
                blobId,
                filePath,
                verifyUrl,
                cost,
              });
              throw new Error(`Walrus upload failed: Blob ${blobId} does not exist on aggregator. This may indicate insufficient WAL balance or network issues.`);
            }

            logger.info('Blob verified to exist on Walrus aggregator', {
              blobId,
              status: verifyResponse.status,
              contentLength: verifyResponse.headers['content-length'],
            });
          } catch (error: any) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
              throw new Error(`Walrus upload failed: Blob ${blobId} does not exist on aggregator. Upload may have failed silently.`);
            }
            // Network errors during verification - log but don't fail upload
            logger.warn('Could not verify blob existence (network error), but upload reported success', {
              blobId,
              error: error.message,
            });
          }
        }

        logger.info('File uploaded to Walrus successfully via CLI', {
          blobId: uploadResult.blobId,
          size: uploadResult.size,
          cost: uploadResult.cost,
        });

        return uploadResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn(`Upload attempt ${attempt}/${maxRetries} failed`, {
          filePath,
          error: lastError.message,
          willRetry: attempt < maxRetries,
        });

        if (attempt < maxRetries) {
          // Exponential backoff: 5s, 10s, 20s
          const delay = 5000 * Math.pow(2, attempt - 1);
          logger.info(`Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('Failed to upload file to Walrus after all retries', {
      filePath,
      attempts: maxRetries,
      error: lastError?.message,
    });
    throw new Error(`Walrus upload failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Upload a buffer to Walrus storage
   * @param buffer - Data to upload
   * @param options - Storage options
   * @returns Upload result with blob ID and metadata
   */
  async uploadBuffer(
    buffer: Buffer,
    options?: {
      epochs?: number;
      permanent?: boolean;
      sendObjectTo?: string;
      originalSize?: number;
    }
  ): Promise<WalrusUploadResult> {
    try {
      const epochs = options?.epochs || this.config.defaultEpochs;
      const permanent = options?.permanent ?? this.config.permanent;

      const queryParams = new URLSearchParams({
        epochs: epochs.toString(),
        ...(permanent ? { permanent: 'true' } : { deletable: 'true' }),
        ...(options?.sendObjectTo && { send_object_to: options.sendObjectTo }),
      });

      const response = await this.publisherClient.put(
        `/v1/blobs?${queryParams.toString()}`,
        buffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.length.toString(),
          },
        }
      );

      // Handle response - can be "newlyCreated" or "alreadyCertified"
      const data = response.data;

      if (data.newlyCreated) {
        const created = data.newlyCreated;
        const result: WalrusUploadResult = {
          blobId: created.blobObject.blobId,
          objectId: created.blobObject.id,
          size: buffer.length,
          epochs: epochs,
          cost: created.cost || 0,
          storageCostSUI: created.blobObject.storage?.storageAmount || '0',
          deletable: !permanent,
          encodingType: created.blobObject.encodingType || 'RedStuff',
          createdAt: new Date(),
        };

        logger.info('File uploaded to Walrus successfully', {
          blobId: result.blobId,
          size: result.size,
          cost: result.cost,
        });

        return result;
      } else if (data.alreadyCertified) {
        const certified = data.alreadyCertified;
        const result: WalrusUploadResult = {
          blobId: certified.blobId,
          objectId: certified.eventOrObject?.Event?.txDigest,
          size: buffer.length,
          epochs: epochs,
          cost: 0, // No cost for already certified blob
          storageCostSUI: '0',
          deletable: !permanent,
          encodingType: 'RedStuff',
          createdAt: new Date(),
        };

        logger.info('Blob already certified in Walrus', {
          blobId: result.blobId,
          eventId: certified.eventOrObject?.Event?.eventSeq,
        });

        return result;
      }

      throw new Error('Unexpected Walrus response format');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code,
          address: error.config?.url,
          timeout: error.config?.timeout,
        };

        logger.error('Walrus API error', errorDetails);

        // Specific error messages for common issues
        if (error.code === 'ECONNRESET') {
          throw new Error('Connection reset by Walrus - network unstable or file too large');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          throw new Error(`Upload timeout - file may be too large (timeout: ${error.config?.timeout}ms)`);
        } else if (error.response?.status) {
          throw new Error(
            `Walrus API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else {
          throw new Error(`Network error uploading to Walrus: ${error.message} (code: ${error.code})`);
        }
      }
      throw error;
    }
  }

  /**
   * Retrieve a blob from Walrus by blob ID
   * @param blobId - The blob ID to retrieve
   * @param options - Retrieval options (caching, range)
   * @returns Buffer containing the blob data
   */
  async retrieveBlob(blobId: string, options?: WalrusRetrievalOptions): Promise<Buffer> {
    try {
      logger.info('Retrieving blob from Walrus', { blobId });

      const headers: Record<string, string> = {};
      if (options?.range) {
        headers.Range = `bytes=${options.range.start}-${options.range.end}`;
      }
      if (options?.cacheControl) {
        headers['Cache-Control'] = options.cacheControl;
      }

      const response = await this.aggregatorClient.get(`/v1/blobs/${blobId}`, {
        headers,
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data);

      logger.info('Blob retrieved successfully', {
        blobId,
        size: buffer.length,
        etag: response.headers.etag,
      });

      return buffer;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Blob not found: ${blobId}`);
        }
        logger.error('Walrus retrieval error', {
          blobId,
          status: error.response?.status,
          message: error.message,
        });
        throw new Error(`Failed to retrieve blob: ${error.response?.status}`);
      }
      throw error;
    }
  }

  /**
   * Retrieve a blob by Sui object ID
   * @param objectId - The Sui object ID
   * @returns Buffer containing the blob data
   */
  async retrieveBlobByObjectId(objectId: string): Promise<Buffer> {
    try {
      logger.info('Retrieving blob by object ID', { objectId });

      const response = await this.aggregatorClient.get(`/v1/blobs/by-object-id/${objectId}`, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`Blob not found for object ID: ${objectId}`);
      }
      throw error;
    }
  }

  /**
   * Get streaming URL for a blob (for video playback)
   * @param blobId - The blob ID
   * @returns Public URL for streaming the blob
   */
  getStreamingUrl(blobId: string): string {
    return `${this.config.aggregatorUrl}/v1/blobs/${blobId}`;
  }

  /**
   * Upload multiple quality versions of a video
   * Used for adaptive bitrate streaming (HLS/DASH)
   * @param qualityFiles - Map of quality -> file path
   * @returns Map of quality -> blob ID
   */
  async uploadMultiQuality(
    qualityFiles: Record<string, string>,
    options?: { epochs?: number; permanent?: boolean }
  ): Promise<Record<string, WalrusUploadResult>> {
    const results: Record<string, WalrusUploadResult> = {};

    logger.info('Uploading multi-quality video set', {
      qualities: Object.keys(qualityFiles),
    });

    // Upload all qualities in parallel
    const uploads = Object.entries(qualityFiles).map(async ([quality, filePath]) => {
      try {
        const result = await this.uploadFile(filePath, options);
        return { quality, result };
      } catch (error) {
        logger.error(`Failed to upload ${quality} quality`, {
          filePath,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });

    const uploadResults = await Promise.all(uploads);

    for (const { quality, result } of uploadResults) {
      results[quality] = result;
    }

    logger.info('Multi-quality upload complete', {
      qualities: Object.keys(results),
      totalSize: Object.values(results).reduce((sum, r) => sum + r.size, 0),
      totalCost: Object.values(results).reduce((sum, r) => sum + r.cost, 0),
    });

    return results;
  }

  /**
   * Check if Walrus service is healthy
   * @returns True if service is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to access the API spec endpoint
      await this.publisherClient.get('/v1/api');
      await this.aggregatorClient.get('/v1/api');
      return true;
    } catch (error) {
      logger.error('Walrus health check failed', {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Get estimated storage cost in SUI
   * @param sizeBytes - File size in bytes
   * @param epochs - Number of epochs to store
   * @returns Estimated cost in SUI
   */
  estimateStorageCost(sizeBytes: number, epochs: number): number {
    // Approximate cost calculation based on Walrus economics
    // 1 epoch ≈ 30 days, cost scales with size and duration
    // Real cost is determined by network at upload time
    const costPerMBPerEpoch = 0.001; // Approximate 0.001 SUI per MB per epoch
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB * epochs * costPerMBPerEpoch;
  }
}

// Singleton instance
let walrusServiceInstance: WalrusService | null = null;

/**
 * Get or create the Walrus service instance
 */
export function getWalrusService(): WalrusService {
  if (!walrusServiceInstance) {
    const config: WalrusConfig = {
      publisherUrl:
        process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
      aggregatorUrl:
        process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
      apiKey: process.env.WALRUS_API_KEY,
      defaultEpochs: parseInt(process.env.WALRUS_DEFAULT_EPOCHS || '12', 10), // 12 epochs ≈ 1 year
      permanent: process.env.WALRUS_PERMANENT_STORAGE === 'true',
    };

    walrusServiceInstance = new WalrusService(config);
  }

  return walrusServiceInstance;
}

export default WalrusService;
