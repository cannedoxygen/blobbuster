import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authMiddleware, requireUploader } from '../middleware/auth.middleware';
import { getUploadService } from '../services/upload.service';
import { getSuiBlockchainService } from '../services/suiBlockchain.service';
import { getPaymentVerificationService } from '../services/paymentVerification.service';
import { getWalrusService } from '../services/walrus.service';
import { TranscodingService } from '../services/transcoding.service';
import { getMetadataService } from '../services/metadata.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { ContentGenre } from '@blobbuster/shared-types';

const router = Router();
const uploadService = getUploadService();
const suiService = getSuiBlockchainService();
const walrusService = getWalrusService();
const transcodingService = new TranscodingService();
const metadataService = getMetadataService();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10737418240'), // 10GB default
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only - check both MIME type and extension
    const allowedMimes = [
      'video/mp4',
      'video/x-msvideo',
      'video/x-matroska',
      'video/quicktime',
      'video/webm',
    ];

    const allowedExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.webm'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Accepted: MP4, AVI, MKV, MOV, WEBM`));
    }
  },
});

/**
 * Generate a unique 5-character referral code
 * Format: Alphanumeric (A-Z, 0-9)
 */
async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existing = await prisma.uploader_profiles.findUnique({
      where: { referral_code: code },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate unique referral code after multiple attempts');
}

/**
 * POST /api/upload/register
 * Register user as a content creator on the blockchain
 * Requires: Authentication
 */
router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const walletAddress = req.user!.walletAddress;
    const { v4: uuidv4 } = require('uuid');

    // Check if user is already an uploader
    const existingUploader = await prisma.uploader_profiles.findUnique({
      where: { user_id: userId },
    });

    if (existingUploader) {
      return res.status(400).json({
        success: false,
        error: 'User is already registered as an uploader',
      });
    }

    logger.info('Registering uploader', { userId, walletAddress });

    // For development: Skip blockchain registration if platform wallet has insufficient funds
    let blockchainAccountId = 'dev_' + uuidv4().substring(0, 8);
    let txDigest = 'dev_tx_' + Date.now();

    try {
      const result = await suiService.registerUploader(walletAddress);
      blockchainAccountId = result.accountId;
      txDigest = result.txDigest;
    } catch (error: any) {
      if (error.message && error.message.includes('Balance') && error.message.includes('lower than')) {
        logger.warn('Platform wallet has insufficient funds, using dev mode registration');
        // Continue with dev mode
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();
    logger.info('Generated referral code', { userId, referralCode });

    // Create uploader profile in database
    const uploaderProfile = await prisma.uploader_profiles.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        blockchain_account_id: blockchainAccountId,
        referral_code: referralCode,
        updated_at: new Date(),
      },
    });

    logger.info(`New uploader registered: ${userId} -> ${blockchainAccountId}, code: ${referralCode}`);

    res.json({
      success: true,
      uploader: {
        id: uploaderProfile.id,
        blockchainAccountId: uploaderProfile.blockchain_account_id,
        totalEarnings: uploaderProfile.total_earnings.toString(),
        pendingEarnings: uploaderProfile.pending_earnings.toString(),
        referralCode: uploaderProfile.referral_code,
      },
      accountId: blockchainAccountId,
      txDigest,
      referralCode: referralCode,
      message: 'Successfully registered as creator',
    });
  } catch (error) {
    logger.error('Uploader registration failed', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to register as creator',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/upload/content
 * Upload video content (multipart/form-data)
 * Body: { title, description, genre }
 * File: video file
 * Requires: Authentication + Uploader status
 */
router.post('/content', authMiddleware, requireUploader, upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded',
      });
    }

    const userId = req.user!.userId;
    const walletAddress = req.user!.walletAddress;
    const { title, description, genre, epochs, paymentDigest, paidAmount } = req.body;

    // Validate required fields (title and description are optional - will be auto-filled from TMDB)
    if (!genre) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: genre',
      });
    }

    // Validate payment fields
    if (!paymentDigest || !paidAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment information - payment is required for uploads',
      });
    }

    // Parse epochs (convert from string to number if provided)
    const storageEpochs = epochs ? parseInt(epochs) : undefined;

    // VERIFY PAYMENT BEFORE PROCESSING
    const paymentService = getPaymentVerificationService();
    const expectedAmount = parseFloat(paidAmount);

    logger.info('Verifying payment for upload', {
      userId,
      walletAddress,
      paymentDigest,
      expectedAmount,
    });

    const verification = await paymentService.verifyPayment(
      paymentDigest,
      walletAddress,
      expectedAmount
    );

    if (!verification.isValid) {
      logger.warn('Payment verification failed', {
        userId,
        paymentDigest,
        error: verification.error,
      });

      return res.status(402).json({
        success: false,
        error: 'Payment verification failed',
        details: verification.error,
        message: 'Please ensure you have sent the correct amount to the platform wallet',
      });
    }

    logger.info('Payment verified successfully', {
      userId,
      paymentDigest,
      amountSUI: verification.details?.amountSUI,
    });

    // Check if payment digest was already used (prevent replay attacks)
    const existingPayment = await prisma.content.findFirst({
      where: {
        payment_tx_digest: paymentDigest,
      },
    });

    if (existingPayment) {
      logger.warn('Payment digest already used', {
        userId,
        paymentDigest,
        existingContentId: existingPayment.id,
      });

      return res.status(409).json({
        success: false,
        error: 'Payment already used',
        message: 'This payment has already been used for another upload',
      });
    }

    logger.info('Content upload initiated', {
      userId,
      title,
      fileName: req.file.originalname,
      size: req.file.size,
      epochs: storageEpochs,
      estimatedDuration: storageEpochs ? `${storageEpochs * 14} days` : 'default (12 epochs)',
    });

    // Validate upload
    const validation = await uploadService.validateUpload(req.file.path);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Generate contentId upfront so we can return it immediately
    const { v4: uuidv4 } = require('uuid');
    const contentId = uuidv4();

    // Process upload asynchronously (don't wait for completion)
    const uploadPromise = uploadService.processUploadWithId(
      contentId,
      {
        userId,
        walletAddress,
        title,
        description,
        genre: parseInt(genre) as ContentGenre,
        filePath: req.file.path,
        originalFileName: req.file.originalname,
        epochs: storageEpochs, // User-selected storage duration
        paymentDigest, // Payment proof
      }
    );

    // Return immediately with content ID for progress tracking
    uploadPromise
      .then((result) => {
        logger.info('Upload completed successfully', {
          contentId: result.contentId,
          blockchainContentId: result.blockchainContentId,
        });
      })
      .catch((error) => {
        logger.error('Upload processing failed', {
          userId,
          contentId,
          error: error instanceof Error ? error.message : error,
        });
      });

    res.json({
      success: true,
      message: 'Upload started successfully',
      contentId, // Return contentId for progress tracking
      metadata: validation.metadata,
    });
  } catch (error) {
    logger.error('Content upload failed', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/upload/progress/:contentId
 * Get upload progress for a specific content
 */
router.get('/progress/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const progress = uploadService.getProgress(contentId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found or already completed',
      });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    logger.error('Failed to get upload progress', {
      contentId: req.params.contentId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve progress',
    });
  }
});

/**
 * GET /api/upload/active
 * Get all active uploads
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const activeUploads = uploadService.getActiveUploads();
    res.json({
      success: true,
      uploads: activeUploads,
      count: activeUploads.length,
    });
  } catch (error) {
    logger.error('Failed to get active uploads', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active uploads',
    });
  }
});

/**
 * GET /api/upload/my-content
 * Get all content uploaded by the authenticated uploader
 * Requires: Authentication + Uploader status
 */
router.get('/my-content', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get uploader profile
    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!uploaderProfile) {
      return res.status(404).json({
        success: false,
        error: 'Uploader profile not found',
      });
    }

    // Get all content for this uploader (exclude deleted)
    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where: {
          uploader_id: uploaderProfile.id,
          status: { not: 3 } // Exclude deleted content
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.content.count({
        where: {
          uploader_id: uploaderProfile.id,
          status: { not: 3 } // Exclude deleted content
        }
      }),
    ]);

    // Convert BigInt fields to Numbers and normalize to camelCase for frontend
    const serializedContent = content.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      uploaderId: item.uploader_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      durationSeconds: item.duration_seconds,
      walrusBlobIds: item.walrus_blob_ids,
      thumbnailUrl: item.thumbnail_url,

      // TMDB Metadata
      posterUrl: item.poster_url,
      backdropUrl: item.backdrop_url,
      year: item.year,
      director: item.director,
      externalRating: item.external_rating,

      // Storage expiration
      storage_epochs: item.storage_epochs,
      storage_expires_at: item.storage_expires_at,

      status: item.status,
      totalStreams: Number(item.total_streams),
      totalWatchTime: Number(item.total_watch_time),
      averageCompletionRate: item.average_completion_rate,
      ratingSum: Number(item.rating_sum),
      ratingCount: Number(item.rating_count),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    res.json({
      success: true,
      content: serializedContent,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Failed to get uploader content', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve content',
    });
  }
});

/**
 * GET /api/upload/analytics
 * Get creator analytics (earnings, streams, etc.)
 * Requires: Authentication + Uploader status
 */
router.get('/analytics', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get uploader profile with stats
    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { user_id: userId },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            total_streams: true,
            average_completion_rate: true,
          },
          orderBy: {
            total_streams: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!uploaderProfile) {
      return res.status(404).json({
        success: false,
        error: 'Uploader profile not found',
      });
    }

    res.json({
      success: true,
      analytics: {
        totalEarnings: uploaderProfile.total_earnings.toString(),
        pendingEarnings: uploaderProfile.pending_earnings.toString(),
        totalStreams: uploaderProfile.total_streams.toString(),
        totalContent: uploaderProfile.total_content_uploaded,
        referralCode: uploaderProfile.referral_code,
        referralCount: uploaderProfile.referral_count,
        averageCompletion: uploaderProfile.content.length > 0
          ? Math.round(
              uploaderProfile.content.reduce((sum, c) => sum + c.average_completion_rate, 0) /
                uploaderProfile.content.length
            )
          : 0,
        topContent: uploaderProfile.content.map((c) => ({
          id: c.id,
          title: c.title,
          streams: c.total_streams.toString(),
          completionRate: c.average_completion_rate,
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to get creator analytics', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics',
    });
  }
});

/**
 * POST /api/upload/extend-storage/:contentId
 * Extend storage duration for existing content
 * Body: { epochs, paymentDigest, paidAmount }
 * Requires: Authentication + Uploader status + Content ownership
 */
router.post('/extend-storage/:contentId', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const walletAddress = req.user!.walletAddress;
    const { contentId } = req.params;
    const { epochs, paymentDigest, paidAmount } = req.body;

    // Validate required fields
    if (!epochs || !paymentDigest || !paidAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: epochs, paymentDigest, paidAmount',
      });
    }

    const additionalEpochs = parseInt(epochs);
    if (additionalEpochs <= 0 || additionalEpochs > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid epochs value (must be between 1 and 1000)',
      });
    }

    // Get uploader profile
    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!uploaderProfile) {
      return res.status(404).json({
        success: false,
        error: 'Uploader profile not found',
      });
    }

    // Get content and verify ownership
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      });
    }

    if (content.uploader_id !== uploaderProfile.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this content',
      });
    }

    // Verify payment
    const paymentService = getPaymentVerificationService();
    const expectedAmount = parseFloat(paidAmount);

    logger.info('Verifying payment for storage extension', {
      userId,
      contentId,
      walletAddress,
      paymentDigest,
      expectedAmount,
      additionalEpochs,
    });

    const verification = await paymentService.verifyPayment(
      paymentDigest,
      walletAddress,
      expectedAmount
    );

    if (!verification.isValid) {
      logger.warn('Payment verification failed for storage extension', {
        userId,
        contentId,
        paymentDigest,
        error: verification.error,
      });

      return res.status(402).json({
        success: false,
        error: 'Payment verification failed',
        details: verification.error,
      });
    }

    logger.info('Payment verified for storage extension', {
      userId,
      contentId,
      amountSUI: verification.details?.amountSUI,
    });

    // Calculate new expiration date
    // Each epoch is ~14 days on Walrus
    const currentExpiration = content.storage_expires_at || new Date();
    const daysToAdd = additionalEpochs * 14;
    const newExpiration = new Date(currentExpiration);
    newExpiration.setDate(newExpiration.getDate() + daysToAdd);

    const newTotalEpochs = (content.storage_epochs || 0) + additionalEpochs;

    // Update content with extended storage
    const updatedContent = await prisma.content.update({
      where: { id: contentId },
      data: {
        storage_epochs: newTotalEpochs,
        storage_expires_at: newExpiration,
        status: content.status === 2 ? 1 : content.status, // Reactivate if was expired
        updated_at: new Date(),
      },
    });

    logger.info('Storage extended successfully', {
      contentId,
      userId,
      additionalEpochs,
      newTotalEpochs,
      newExpiration,
      previousExpiration: content.storage_expires_at,
    });

    res.json({
      success: true,
      message: 'Storage extended successfully',
      content: {
        id: updatedContent.id,
        title: updatedContent.title,
        storage_epochs: updatedContent.storage_epochs,
        storage_expires_at: updatedContent.storage_expires_at,
        status: updatedContent.status,
      },
      extensionDetails: {
        additionalEpochs,
        daysAdded: daysToAdd,
        newExpirationDate: newExpiration.toISOString(),
        amountPaidSUI: verification.details?.amountSUI,
      },
    });
  } catch (error) {
    logger.error('Failed to extend storage', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to extend storage',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================================
// CHUNKED UPLOAD ENDPOINTS (YouTube-style)
// ==========================================

/**
 * POST /api/upload/initiate
 * Initiate a chunked upload session
 */
router.post('/initiate', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const { fileName, fileSize, totalChunks, title, description, genre, epochs, paymentDigest, paidAmount } =
      req.body;

    if (
      !fileName ||
      !fileSize ||
      !totalChunks ||
      !title ||
      genre === undefined ||
      !epochs ||
      !paymentDigest ||
      !paidAmount
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Check if payment digest was already used for a completed upload
    const existingPayment = await prisma.content.findUnique({
      where: { payment_tx_digest: paymentDigest },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        error: 'Payment digest already used for a completed upload',
      });
    }

    // Check if there's an existing session with this payment (allow resume)
    const existingSession = await prisma.upload_sessions.findUnique({
      where: { payment_digest: paymentDigest },
    });

    if (existingSession) {
      // Return existing session ID for resume instead of error
      logger.info('Resuming existing upload session', {
        uploadId: existingSession.id,
        fileName: existingSession.file_name,
        chunksReceived: existingSession.chunks_received,
        totalChunks: existingSession.total_chunks,
      });

      return res.json({
        success: true,
        uploadId: existingSession.id,
        message: 'Resuming existing upload session',
        resuming: true,
        chunksReceived: existingSession.chunks_received,
        totalChunks: existingSession.total_chunks,
      });
    }

    // Create upload session
    const session = await prisma.upload_sessions.create({
      data: {
        uploader_id: req.user!.id,
        file_name: fileName,
        file_size: BigInt(fileSize),
        total_chunks: totalChunks,
        title,
        description: description || null,
        genre,
        epochs,
        payment_digest: paymentDigest,
        paid_amount: paidAmount,
        status: 'receiving_chunks',
        progress: 0,
      },
    });

    // Create temporary directory for chunks
    const uploadDir = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', session.id, 'chunks');
    await fs.mkdir(uploadDir, { recursive: true });

    logger.info('Chunked upload session created', {
      sessionId: session.id,
      fileName,
      fileSize,
      totalChunks,
    });

    res.json({
      success: true,
      uploadId: session.id,
      message: 'Upload session created',
    });
  } catch (error) {
    logger.error('Failed to initiate chunked upload', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate upload',
    });
  }
});

/**
 * GET /api/upload/resume/:uploadId
 * Get upload session status and which chunks are already received
 * This allows resuming interrupted uploads without re-payment
 */
router.get('/resume/:uploadId', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;

    // Get session
    const session = await prisma.upload_sessions.findUnique({
      where: { id: uploadId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Upload session not found',
      });
    }

    // Verify ownership
    if (session.uploader_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Check which chunks already exist on disk
    const chunksDir = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', uploadId, 'chunks');
    let receivedChunks: number[] = [];

    try {
      const files = await fs.readdir(chunksDir);
      receivedChunks = files
        .filter((f) => f.startsWith('chunk-'))
        .map((f) => parseInt(f.replace('chunk-', '')))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
    } catch (err) {
      // Directory doesn't exist yet - no chunks received
      receivedChunks = [];
    }

    // Calculate which chunks are missing
    const allChunks = Array.from({ length: session.total_chunks }, (_, i) => i);
    const missingChunks = allChunks.filter((i) => !receivedChunks.includes(i));

    logger.info('Upload session resume info requested', {
      uploadId,
      receivedChunks: receivedChunks.length,
      missingChunks: missingChunks.length,
      totalChunks: session.total_chunks,
      status: session.status,
    });

    res.json({
      success: true,
      session: {
        id: session.id,
        fileName: session.file_name,
        fileSize: Number(session.file_size),
        totalChunks: session.total_chunks,
        receivedChunks: receivedChunks,
        missingChunks: missingChunks,
        status: session.status,
        progress: session.progress,
        title: session.title,
        description: session.description,
        genre: session.genre,
        epochs: session.epochs,
        // Payment info is already verified, no need to pay again
        paymentVerified: true,
      },
    });
  } catch (error) {
    logger.error('Failed to get resume info', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upload status',
    });
  }
});

/**
 * POST /api/upload/chunk/:uploadId
 * Upload a single chunk
 */
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 0.5 * 1024 * 1024 * 1024, // 0.5GB (half a gig) max per chunk
  },
});

router.post(
  '/chunk/:uploadId',
  authMiddleware,
  requireUploader,
  chunkUpload.single('chunk'),
  async (req: Request, res: Response) => {
    try {
      const { uploadId } = req.params;
      const { chunkIndex } = req.body;

      if (!req.file || chunkIndex === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing chunk data or index',
        });
      }

      // Verify session exists and belongs to user
      const session = await prisma.upload_sessions.findUnique({
        where: { id: uploadId },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Upload session not found',
        });
      }

      if (session.uploader_id !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (session.status !== 'receiving_chunks') {
        return res.status(400).json({
          success: false,
          error: `Cannot upload chunks in status: ${session.status}`,
        });
      }

      // Save chunk to disk
      const chunkPath = path.join(
        process.env.UPLOAD_DIR || '/tmp/uploads',
        uploadId,
        'chunks',
        `chunk-${chunkIndex}`
      );

      // Check if chunk already exists (resumable upload)
      let chunkAlreadyExists = false;
      try {
        await fs.access(chunkPath);
        chunkAlreadyExists = true;
        logger.info('Chunk already exists, skipping upload', {
          sessionId: uploadId,
          chunkIndex,
        });
      } catch (err) {
        // Chunk doesn't exist, write it
        await fs.writeFile(chunkPath, req.file.buffer);
      }

      // Update chunks received count only if this is a new chunk
      const updatedSession = chunkAlreadyExists
        ? session
        : await prisma.upload_sessions.update({
            where: { id: uploadId },
            data: {
              chunks_received: session.chunks_received + 1,
              progress: Math.floor(((session.chunks_received + 1) / session.total_chunks) * 80), // 0-80% for chunks
            },
          });

      logger.info('Chunk uploaded', {
        sessionId: uploadId,
        chunkIndex,
        chunksReceived: updatedSession.chunks_received,
        totalChunks: session.total_chunks,
      });

      res.json({
        success: true,
        chunksReceived: updatedSession.chunks_received,
        totalChunks: session.total_chunks,
        message: `Chunk ${updatedSession.chunks_received}/${session.total_chunks} uploaded`,
      });
    } catch (error) {
      logger.error('Failed to upload chunk', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload chunk',
      });
    }
  }
);

/**
 * POST /api/upload/complete/:uploadId
 * Complete the upload and trigger background processing
 */
router.post(
  '/complete/:uploadId',
  authMiddleware,
  requireUploader,
  async (req: Request, res: Response) => {
    try {
      const { uploadId } = req.params;

      // Verify session exists and belongs to user
      const session = await prisma.upload_sessions.findUnique({
        where: { id: uploadId },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Upload session not found',
        });
      }

      if (session.uploader_id !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Verify all chunks received
      if (session.chunks_received !== session.total_chunks) {
        return res.status(400).json({
          success: false,
          error: `Missing chunks: ${session.chunks_received}/${session.total_chunks}`,
        });
      }

      // Mark as assembling
      await prisma.upload_sessions.update({
        where: { id: uploadId },
        data: {
          status: 'assembling',
          progress: 80,
        },
      });

      // Trigger background job (DO NOT AWAIT)
      processUploadInBackground(uploadId).catch((error) => {
        logger.error('Background processing failed', { uploadId, error });
      });

      logger.info('Upload complete, processing in background', { sessionId: uploadId });

      res.json({
        success: true,
        message: 'Processing upload in background',
        statusUrl: `/api/upload/status/${uploadId}`,
      });
    } catch (error) {
      logger.error('Failed to complete upload', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete upload',
      });
    }
  }
);

/**
 * GET /api/upload/status/:uploadId
 * Get upload session status
 */
router.get('/status/:uploadId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;

    const session = await prisma.upload_sessions.findUnique({
      where: { id: uploadId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Upload session not found',
      });
    }

    // Only uploader can check status
    if (session.uploader_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    res.json({
      success: true,
      status: session.status,
      progress: session.progress,
      message: getStatusMessage(session.status),
      contentId: session.content_id,
      error: session.error_message,
    });
  } catch (error) {
    logger.error('Failed to get upload status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
});

/**
 * DELETE /api/upload/:contentId
 * Delete content (hard delete from database)
 */
router.delete('/:contentId', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const userId = req.user!.userId;

    // Get uploader profile
    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!uploaderProfile) {
      return res.status(404).json({
        success: false,
        error: 'Uploader profile not found',
      });
    }

    // Get content to verify ownership
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      });
    }

    // Verify ownership
    if (content.uploader_id !== uploaderProfile.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this content',
      });
    }

    // Delete related streams first (foreign key constraint)
    await prisma.streams.deleteMany({
      where: { content_id: contentId },
    });

    // Hard delete content from database
    await prisma.content.delete({
      where: { id: contentId },
    });

    logger.info(`Content deleted: ${contentId} by uploader ${uploaderProfile.id}`);

    res.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete content',
    });
  }
});

// ==========================================
// BACKGROUND PROCESSING FUNCTIONS
// ==========================================

/**
 * Process upload in background (assembles chunks, uploads to Walrus, registers on blockchain)
 */
async function processUploadInBackground(uploadId: string): Promise<void> {
  try {
    const session = await prisma.upload_sessions.findUnique({
      where: { id: uploadId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // STEP 1: Assemble chunks
    await updateSessionStatus(uploadId, 'assembling', 80);
    const assembledFilePath = await assembleChunks(uploadId, session.file_name);

    // STEP 2: Extract video metadata and generate thumbnail
    await updateSessionStatus(uploadId, 'analyzing', 85);
    const metadata = await transcodingService.getVideoMetadata(assembledFilePath);

    // Create work directory for thumbnail
    const workDir = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', uploadId, 'work');
    await fs.mkdir(workDir, { recursive: true });

    const thumbnailPath = await transcodingService.generateThumbnail(assembledFilePath, workDir);

    // STEP 3: Upload video to Walrus
    await updateSessionStatus(uploadId, 'uploading_to_walrus', 90);
    const videoUploadResult = await walrusService.uploadFile(assembledFilePath, {
      epochs: session.epochs,
    });

    // STEP 4: Upload thumbnail to Walrus
    const thumbnailUploadResult = await walrusService.uploadFile(thumbnailPath, {
      epochs: session.epochs,
    });

    // STEP 5: Register on SUI blockchain
    await updateSessionStatus(uploadId, 'registering_blockchain', 95);

    // Get uploader profile
    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { user_id: session.uploader_id },
    });

    if (!uploaderProfile) {
      throw new Error('Uploader profile not found');
    }

    const blobIdsString = JSON.stringify({
      video: videoUploadResult.blobId,
      thumbnail: thumbnailUploadResult.blobId,
    });

    const blockchainResult = await suiService.registerContent(
      session.title,
      session.description || '',
      Number(session.genre),
      Math.floor(metadata.duration),
      blobIdsString,
      thumbnailUploadResult.blobId
    );

    // STEP 6: Fetch TMDB metadata (optional)
    let tmdbMetadata = null;
    if (metadataService && metadataService.isEnabled()) {
      try {
        tmdbMetadata = await metadataService.searchMovie(session.title);
      } catch (error) {
        logger.warn('Failed to fetch TMDB metadata', { error });
      }
    }

    // STEP 7: Save to database
    await prisma.content.create({
      data: {
        id: blockchainResult.contentId,
        blockchain_id: blockchainResult.contentId,
        payment_tx_digest: session.payment_digest,
        uploader_id: uploaderProfile.id,
        title: tmdbMetadata?.title || session.title,
        description: tmdbMetadata?.plot || session.description || '',
        genre: session.genre,
        duration_seconds: Math.floor(metadata.duration),

        // TMDB metadata
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
        thumbnail_url: tmdbMetadata?.posterUrl || walrusService.getStreamingUrl(thumbnailUploadResult.blobId),
        storage_epochs: session.epochs,
        storage_expires_at: new Date(Date.now() + (session.epochs * 14 * 24 * 60 * 60 * 1000)),

        status: 1,
        updated_at: new Date(),
      },
    });

    // Update uploader stats
    await prisma.uploader_profiles.update({
      where: { id: uploaderProfile.id },
      data: {
        total_content_uploaded: { increment: 1 },
        updated_at: new Date(),
      },
    });

    // STEP 8: Cleanup temp files
    await cleanupUploadDir(uploadId);

    // STEP 9: Mark complete
    await prisma.upload_sessions.update({
      where: { id: uploadId },
      data: {
        status: 'complete',
        progress: 100,
        content_id: blockchainResult.contentId,
        video_blob_id: videoUploadResult.blobId,
        thumbnail_blob_id: thumbnailUploadResult.blobId,
        completed_at: new Date(),
      },
    });

    logger.info('Background processing completed', { uploadId, contentId: blockchainResult.contentId });
  } catch (error) {
    logger.error('Background processing failed', { uploadId, error });

    await prisma.upload_sessions.update({
      where: { id: uploadId },
      data: {
        status: 'error',
        progress: 0,
        error_message: error instanceof Error ? error.message : String(error),
      },
    });

    // Cleanup on error
    await cleanupUploadDir(uploadId).catch((cleanupError) => {
      logger.error('Cleanup failed', { uploadId, error: cleanupError });
    });
  }
}

/**
 * Assemble all chunks into a single file
 */
async function assembleChunks(uploadId: string, fileName: string): Promise<string> {
  const chunksDir = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', uploadId, 'chunks');
  const outputPath = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', uploadId, fileName);

  // Get all chunk files sorted by index
  const chunkFiles = await fs.readdir(chunksDir);
  const sortedChunks = chunkFiles
    .filter((f) => f.startsWith('chunk-'))
    .sort((a, b) => {
      const aIndex = parseInt(a.replace('chunk-', ''));
      const bIndex = parseInt(b.replace('chunk-', ''));
      return aIndex - bIndex;
    });

  // Create write stream for output file
  const writeStream = require('fs').createWriteStream(outputPath);

  // Append each chunk
  for (const chunkFile of sortedChunks) {
    const chunkPath = path.join(chunksDir, chunkFile);
    const chunkData = await fs.readFile(chunkPath);
    writeStream.write(chunkData);
  }

  writeStream.end();

  // Wait for write to complete
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  logger.info('Chunks assembled', { uploadId, outputPath, chunkCount: sortedChunks.length });

  return outputPath;
}

/**
 * Update session status
 */
async function updateSessionStatus(uploadId: string, status: string, progress: number): Promise<void> {
  await prisma.upload_sessions.update({
    where: { id: uploadId },
    data: { status, progress },
  });
  logger.info('Session status updated', { uploadId, status, progress });
}

/**
 * Cleanup upload directory
 */
async function cleanupUploadDir(uploadId: string): Promise<void> {
  const uploadDir = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', uploadId);
  await fs.rm(uploadDir, { recursive: true, force: true });
  logger.info('Upload directory cleaned up', { uploadId });
}

/**
 * Get human-readable status message
 */
function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    receiving_chunks: 'Receiving chunks...',
    assembling: 'Assembling video file...',
    analyzing: 'Analyzing video...',
    uploading_to_walrus: 'Uploading to Walrus...',
    registering_blockchain: 'Registering on blockchain...',
    complete: 'Upload complete!',
    error: 'Upload failed',
  };
  return messages[status] || status;
}

export default router;
