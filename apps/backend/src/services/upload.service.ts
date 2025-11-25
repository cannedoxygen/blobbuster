import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getWalrusService } from './walrus.service';
import { getTranscodingService } from './transcoding.service';
import { getSuiBlockchainService } from './suiBlockchain.service';
import { getMetadataService } from './metadata.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { WalrusUploadResult, ContentGenre, WalrusQualitySet } from '@blobbuster/shared-types';

/**
 * Upload Service
 * Orchestrates the complete content upload pipeline:
 * 1. Receive video file
 * 2. Transcode to multiple qualities
 * 3. Upload all versions to Walrus
 * 4. Register content on Sui blockchain
 * 5. Store metadata in database
 */

export interface UploadRequest {
  userId: string;
  walletAddress: string;
  title: string;
  description: string;
  genre: ContentGenre;
  filePath: string;
  originalFileName: string;
  epochs?: number; // User-selected storage duration (defaults to config if not provided)
  paymentDigest?: string; // Payment transaction digest (for verification)
}

export interface UploadProgress {
  contentId: string;
  status: 'uploading' | 'transcoding' | 'uploading_walrus' | 'registering' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
  blobIds?: WalrusQualitySet;
  blockchainTxDigest?: string;
  estimatedTimeRemaining?: number; // seconds
  startedAt?: number; // timestamp
  fileSize?: number; // bytes
  videoDuration?: number; // seconds
}

export interface UploadResult {
  contentId: string;
  blockchainContentId: string;
  title: string;
  walrusBlobIds: WalrusQualitySet;
  thumbnailUrl: string;
  duration: number;
  totalCost: number;
  txDigest: string;
}

export class UploadService {
  private uploadDir: string;
  private transcodeDir: string;
  private walrusService = getWalrusService();
  private transcodingService = getTranscodingService();
  private suiService = getSuiBlockchainService();
  private metadataService = getMetadataService();

  // Track upload progress for multiple concurrent uploads
  private uploadProgress = new Map<string, UploadProgress>();

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
    this.transcodeDir = process.env.TRANSCODE_DIR || '/tmp/transcoded';
  }

  /**
   * Process a complete video upload
   */
  async processUpload(request: UploadRequest): Promise<UploadResult> {
    const contentId = uuidv4();
    return this.processUploadWithId(contentId, request);
  }

  /**
   * Process a complete video upload with pre-generated ID
   */
  async processUploadWithId(contentId: string, request: UploadRequest): Promise<UploadResult> {
    const workDir = path.join(this.transcodeDir, contentId);
    const startTime = Date.now();
    let stats: any = null;
    let metadata: any = null;

    try {
      // Get file size and video metadata first for time estimation
      stats = await fs.stat(request.filePath);
      metadata = await this.transcodingService.getVideoMetadata(request.filePath);

      // Initialize progress tracking with file info
      this.updateProgress(contentId, {
        contentId,
        status: 'transcoding',
        progress: 10,
        currentStep: 'Analyzing video and starting transcoding...',
        startedAt: startTime,
        fileSize: stats.size,
        videoDuration: metadata.duration,
      });

      // Ensure work directory exists
      await fs.mkdir(workDir, { recursive: true });

      logger.info('Starting upload process', {
        contentId,
        userId: request.userId,
        title: request.title,
        originalFile: request.originalFileName,
        fileSize: stats.size,
        duration: metadata.duration,
      });

      // Generate thumbnail
      this.updateProgress(contentId, {
        contentId,
        status: 'transcoding',
        progress: 20,
        currentStep: 'Generating thumbnail...',
        startedAt: startTime,
        fileSize: stats.size,
        videoDuration: metadata.duration,
      });

      const thumbnailPath = await this.transcodingService.generateThumbnail(request.filePath, workDir);

      logger.info('Thumbnail generation completed', {
        contentId,
      });

      // Step 2: Generate HLS segments for seamless streaming
      this.updateProgress(contentId, {
        contentId,
        status: 'transcoding',
        progress: 30,
        currentStep: 'Generating HLS segments for streaming...',
        startedAt: startTime,
        fileSize: stats.size,
        videoDuration: metadata.duration,
      });

      const hlsResult = await this.transcodingService.generateHLSSegments(request.filePath, workDir);

      logger.info('HLS segmentation completed', {
        contentId,
        totalSegments: hlsResult.segments.length,
        totalDuration: hlsResult.segments.reduce((sum, s) => sum + s.duration, 0),
      });

      // Step 3: Upload HLS segments to Walrus
      this.updateProgress(contentId, {
        contentId,
        status: 'uploading_walrus',
        progress: 50,
        currentStep: `Uploading ${hlsResult.segments.length} HLS segments to Walrus...`,
        startedAt: startTime,
        fileSize: stats.size,
        videoDuration: metadata.duration,
      });

      const storageEpochs = request.epochs || 12;

      // Upload all HLS segments + thumbnail to Walrus
      const walrusUploadResult = await this.uploadHLSToWalrus(
        hlsResult.segments,
        thumbnailPath,
        storageEpochs
      );

      const thumbnailBlobId = walrusUploadResult.thumbnailBlobId;
      const totalStorageCost = walrusUploadResult.totalCost;

      logger.info('Walrus HLS upload completed', {
        contentId,
        totalSegments: walrusUploadResult.segments.length,
        thumbnailBlobId,
        totalCost: totalStorageCost,
      });

      // Step 3: Register content on Sui blockchain
      this.updateProgress(contentId, {
        contentId,
        status: 'registering',
        progress: 80,
        currentStep: 'Registering content on blockchain...',
        startedAt: startTime,
        fileSize: stats.size,
        videoDuration: metadata.duration,
      });

      // Create blob IDs structure for HLS streaming
      const blobIdsData = {
        type: 'hls',
        segments: walrusUploadResult.segments,
        thumbnail: thumbnailBlobId || '',
      };

      const blobIdsString = JSON.stringify(blobIdsData);

      const blockchainResult = await this.suiService.registerContent(
        request.title,
        request.description,
        request.genre,
        Math.floor(metadata.duration),
        blobIdsString,
        thumbnailBlobId || ''
      );

      logger.info('Blockchain registration completed', {
        contentId,
        blockchainContentId: blockchainResult.contentId,
        txDigest: blockchainResult.txDigest,
      });

      // Step 4: Fetch TMDB metadata (optional, non-blocking)
      this.updateProgress(contentId, {
        contentId,
        status: 'registering',
        progress: 85,
        currentStep: 'Enriching metadata from TMDB...',
        blockchainTxDigest: blockchainResult.txDigest,
        startedAt: startTime,
        fileSize: stats.size,
        videoDuration: metadata.duration,
      });

      let tmdbMetadata: any = null;
      if (this.metadataService.isEnabled()) {
        try {
          logger.info('Fetching TMDB metadata', {
            contentId,
            filename: request.originalFileName,
          });

          tmdbMetadata = await this.metadataService.searchMovieWithFallbacks(request.originalFileName);

          if (tmdbMetadata) {
            logger.info('TMDB metadata found!', {
              contentId,
              tmdbTitle: tmdbMetadata.title,
              year: tmdbMetadata.year,
              tmdbId: tmdbMetadata.tmdbId,
              rating: tmdbMetadata.rating,
            });
          } else {
            logger.info('No TMDB metadata found for filename', {
              contentId,
              filename: request.originalFileName,
            });
          }
        } catch (error) {
          // Non-blocking - continue even if TMDB fails
          logger.warn('Failed to fetch TMDB metadata (non-critical)', {
            contentId,
            error: error instanceof Error ? error.message : error,
          });
        }
      } else {
        logger.debug('TMDB metadata service not enabled, skipping enrichment');
      }

      // Step 5: Save to database (with enriched metadata if available)
      // Get uploader profile
      const uploaderProfile = await prisma.uploader_profiles.findUnique({
        where: { user_id: request.userId },
      });

      if (!uploaderProfile) {
        throw new Error('Uploader profile not found');
      }

      // Create content record with enriched metadata
      await prisma.content.create({
        data: {
          id: contentId,
          blockchain_id: blockchainResult.contentId,
          payment_tx_digest: request.paymentDigest, // Store payment digest (for replay protection)
          uploader_id: uploaderProfile.id,

          // Use TMDB title if found, otherwise use uploaded title
          title: tmdbMetadata?.title || request.title,
          description: tmdbMetadata?.plot || request.description,
          genre: request.genre,
          duration_seconds: Math.floor(metadata.duration),

          // TMDB metadata fields
          tmdb_id: tmdbMetadata?.tmdbId,
          imdb_id: tmdbMetadata?.imdbId,
          original_title: tmdbMetadata?.originalTitle,
          year: tmdbMetadata?.year,
          plot: tmdbMetadata?.plot,
          runtime: tmdbMetadata?.runtime,
          tagline: tmdbMetadata?.tagline,
          poster_url: tmdbMetadata?.posterUrl,
          backdrop_url: tmdbMetadata?.backdropUrl,
          genres_list: tmdbMetadata?.genres ? JSON.stringify(tmdbMetadata.genres) : null,
          cast: tmdbMetadata?.cast ? JSON.stringify(tmdbMetadata.cast) : null,
          director: tmdbMetadata?.director,
          external_rating: tmdbMetadata?.rating,
          language: tmdbMetadata?.language,
          country: tmdbMetadata?.country,

          // Storage
          walrus_blob_ids: blobIdsString,
          thumbnail_url: tmdbMetadata?.posterUrl || this.walrusService.getStreamingUrl(thumbnailBlobId || ''),

          // Storage expiration (Walrus epochs)
          storage_epochs: request.epochs || 12,
          storage_expires_at: new Date(Date.now() + ((request.epochs || 12) * 14 * 24 * 60 * 60 * 1000)),

          status: 1, // Active
          updated_at: new Date(),
        },
      });

      logger.info('Content saved to database', {
        contentId,
        hasTMDBData: !!tmdbMetadata,
      });

      // Step 6: Clean up temporary files (configurable)
      const skipCleanup = process.env.SKIP_UPLOAD_CLEANUP === 'true';
      if (skipCleanup) {
        logger.info('⚠️  Skipping cleanup - files kept in temp folders for reuse', {
          originalFile: request.filePath,
          workDir
        });
      } else {
        await this.cleanup(request.filePath, workDir);
      }

      // Step 7: Mark as completed
      this.updateProgress(contentId, {
        contentId,
        status: 'completed',
        progress: 100,
        currentStep: 'Upload completed successfully!',
        blockchainTxDigest: blockchainResult.txDigest,
        startedAt: startTime,
        fileSize: stats.size,
        videoDuration: metadata.duration,
        estimatedTimeRemaining: 0,
      });

      logger.info('Upload process completed', {
        contentId,
        blockchainContentId: blockchainResult.contentId,
      });

      return {
        contentId,
        blockchainContentId: blockchainResult.contentId,
        title: request.title,
        walrusBlobIds: { type: 'hls', segments: walrusUploadResult.segments, thumbnailBlobId } as any,
        thumbnailUrl: this.walrusService.getStreamingUrl(thumbnailBlobId || ''),
        duration: Math.floor(metadata.duration),
        totalCost: totalStorageCost,
        txDigest: blockchainResult.txDigest,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Upload process failed', {
        contentId,
        userId: request.userId,
        error: errorMessage,
      });

      this.updateProgress(contentId, {
        contentId,
        status: 'failed',
        progress: 0,
        currentStep: 'Upload failed',
        error: errorMessage,
        startedAt: startTime,
        fileSize: stats?.size,
        videoDuration: metadata?.duration,
        estimatedTimeRemaining: 0,
      });

      // Attempt cleanup even on failure (unless configured to skip)
      const skipCleanup = process.env.SKIP_UPLOAD_CLEANUP === 'true';
      if (!skipCleanup) {
        try {
          await this.cleanup(request.filePath, workDir);
        } catch (cleanupError) {
          logger.error('Cleanup failed after upload error', {
            contentId,
            error: cleanupError instanceof Error ? cleanupError.message : cleanupError,
          });
        }
      } else {
        logger.info('Skipping cleanup after error (SKIP_UPLOAD_CLEANUP=true)');
      }

      throw error;
    }
  }

  /**
   * Upload HLS segments to Walrus
   */
  private async uploadHLSToWalrus(
    segments: { index: number; filePath: string; duration: number }[],
    thumbnailPath?: string,
    epochs?: number
  ): Promise<{
    segments: { index: number; blobId: string; duration: number }[];
    thumbnailBlobId?: string;
    totalCost: number;
  }> {
    // Use provided epochs or fall back to default (12 epochs = ~1 year on mainnet)
    const storageEpochs = epochs || 12;

    logger.info('Uploading HLS segments to Walrus', {
      totalSegments: segments.length,
      hasThumbnail: !!thumbnailPath,
      epochs: storageEpochs,
      estimatedDuration: `${storageEpochs * 14} days`,
    });

    let totalCost = 0;

    // Upload all segments in parallel
    const segmentUploads = segments.map(async (segment) => {
      try {
        const result = await this.walrusService.uploadFile(segment.filePath, {
          epochs: storageEpochs,
          permanent: false,
        });
        totalCost += result.cost;
        return {
          index: segment.index,
          blobId: result.blobId,
          duration: segment.duration,
        };
      } catch (error) {
        logger.error('Failed to upload HLS segment', {
          segment: segment.index,
          filePath: segment.filePath,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });

    // Use Promise.allSettled to wait for ALL uploads to complete before throwing
    const uploadResults = await Promise.allSettled(segmentUploads);

    // Check if any uploads failed
    const failed = uploadResults.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      throw new Error(`Failed to upload ${failed.length}/${segments.length} segments. First error: ${(failed[0] as PromiseRejectedResult).reason}`);
    }

    // Extract successful results
    const uploadedSegments = uploadResults
      .filter((r): r is PromiseFulfilledResult<{index: number; blobId: string; duration: number}> => r.status === 'fulfilled')
      .map(r => r.value);

    // Upload thumbnail if exists
    let thumbnailBlobId: string | undefined;
    if (thumbnailPath) {
      const thumbnailResult = await this.walrusService.uploadFile(thumbnailPath, {
        epochs: storageEpochs,
        permanent: false,
      });
      thumbnailBlobId = thumbnailResult.blobId;
      totalCost += thumbnailResult.cost;
    }

    return {
      segments: uploadedSegments,
      thumbnailBlobId,
      totalCost,
    };
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(originalPath: string, workDir: string): Promise<void> {
    try {
      // Delete original upload
      await fs.unlink(originalPath).catch(() => {});

      // Delete transcoding work directory
      await this.transcodingService.cleanup(workDir);

      logger.info('Cleanup completed', { workDir });
    } catch (error) {
      logger.error('Cleanup failed', {
        workDir,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Calculate estimated time remaining based on file size and current status
   */
  private calculateEstimatedTime(
    status: UploadProgress['status'],
    fileSize: number,
    videoDuration: number
  ): number {
    // Time estimates based on typical processing speeds
    const TRANSCODE_SPEED_FACTOR = 0.15; // Transcoding takes ~0.15x video duration for 720p (7x faster than real-time)
    const WALRUS_UPLOAD_SPEED = 5 * 1024 * 1024; // 5 MB/s for Walrus CLI
    const BLOCKCHAIN_TIME = 120; // 2 minutes for blockchain registration

    let estimate = 0;

    switch (status) {
      case 'transcoding':
        // Estimate: transcoding time + walrus upload + blockchain
        const transcodeTime = videoDuration * TRANSCODE_SPEED_FACTOR;
        const walrusTime = fileSize / WALRUS_UPLOAD_SPEED;
        estimate = transcodeTime + walrusTime + BLOCKCHAIN_TIME;
        break;

      case 'uploading_walrus':
        // Estimate: walrus upload + blockchain
        estimate = (fileSize / WALRUS_UPLOAD_SPEED) + BLOCKCHAIN_TIME;
        break;

      case 'registering':
        // Estimate: just blockchain time
        estimate = BLOCKCHAIN_TIME;
        break;

      case 'completed':
      case 'failed':
        estimate = 0;
        break;
    }

    return Math.round(estimate);
  }

  /**
   * Update progress for a specific upload
   */
  private updateProgress(contentId: string, progress: UploadProgress): void {
    // Calculate estimated time if we have the necessary data
    if (progress.fileSize && progress.videoDuration && progress.status !== 'completed' && progress.status !== 'failed') {
      progress.estimatedTimeRemaining = this.calculateEstimatedTime(
        progress.status,
        progress.fileSize,
        progress.videoDuration
      );
    }

    this.uploadProgress.set(contentId, progress);
    logger.debug('Upload progress updated', {
      contentId,
      progress: progress.progress,
      estimatedTimeRemaining: progress.estimatedTimeRemaining
    });
  }

  /**
   * Get progress for a specific upload
   */
  getProgress(contentId: string): UploadProgress | null {
    return this.uploadProgress.get(contentId) || null;
  }

  /**
   * Clear progress data for completed/failed uploads
   */
  clearProgress(contentId: string): void {
    this.uploadProgress.delete(contentId);
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): UploadProgress[] {
    return Array.from(this.uploadProgress.values()).filter(
      (p) => p.status !== 'completed' && p.status !== 'failed'
    );
  }

  /**
   * Validate upload request
   */
  async validateUpload(filePath: string): Promise<{
    valid: boolean;
    error?: string;
    metadata?: any;
  }> {
    try {
      // Check file exists
      const stats = await fs.stat(filePath);

      // Check file size
      const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10737418240'); // 10GB default
      if (stats.size > maxSize) {
        return {
          valid: false,
          error: `File size exceeds maximum allowed size (${maxSize / 1024 / 1024 / 1024}GB)`,
        };
      }

      // Check if it's a valid video file
      const metadata = await this.transcodingService.getVideoMetadata(filePath);

      // Validate minimum duration (e.g., 1 second)
      if (metadata.duration < 1) {
        return {
          valid: false,
          error: 'Video duration is too short (minimum 1 second)',
        };
      }

      // Validate resolution
      if (metadata.width < 320 || metadata.height < 240) {
        return {
          valid: false,
          error: 'Video resolution is too low (minimum 320x240)',
        };
      }

      return {
        valid: true,
        metadata,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid video file: ${error instanceof Error ? error.message : error}`,
      };
    }
  }
}

// Singleton instance
let uploadServiceInstance: UploadService | null = null;

export function getUploadService(): UploadService {
  if (!uploadServiceInstance) {
    uploadServiceInstance = new UploadService();
  }
  return uploadServiceInstance;
}

export default UploadService;
