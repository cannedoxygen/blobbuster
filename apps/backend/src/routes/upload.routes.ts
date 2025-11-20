import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, requireUploader } from '../middleware/auth.middleware';
import { getUploadService } from '../services/upload.service';
import { getSuiBlockchainService } from '../services/suiBlockchain.service';
import { getPaymentVerificationService } from '../services/paymentVerification.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { ContentGenre } from '@blockbuster/shared-types';

const router = Router();
const uploadService = getUploadService();
const suiService = getSuiBlockchainService();

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

    // Get all content for this uploader
    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where: { uploader_id: uploaderProfile.id },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.content.count({ where: { uploader_id: uploaderProfile.id } }),
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

export default router;
