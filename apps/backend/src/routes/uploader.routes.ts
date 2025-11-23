import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, requireUploader } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { suiBlockchainService } from '../services/suiBlockchain.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/uploader/register
 * Register as a content uploader
 * Requires: Authentication only
 */
router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const walletAddress = req.user!.walletAddress;

    // Check if user is already an uploader
    const existingUploader = await prisma.uploader_profiles.findUnique({
      where: { user_id: userId },
    });

    if (existingUploader) {
      return res.status(400).json({ error: 'User is already registered as an uploader' });
    }

    // Register uploader on blockchain
    const { accountId, txDigest } = await suiBlockchainService.registerUploader(walletAddress);

    // Create uploader profile in database
    const uploaderProfile = await prisma.uploader_profiles.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        blockchain_account_id: accountId,
        updated_at: new Date(),
      },
    });

    logger.info(`New uploader registered: ${userId} -> ${accountId}`);

    res.json({
      success: true,
      uploader: {
        id: uploaderProfile.id,
        blockchainAccountId: uploaderProfile.blockchain_account_id,
        totalEarnings: uploaderProfile.total_earnings,
        pendingEarnings: uploaderProfile.pending_earnings,
        totalStreams: uploaderProfile.total_streams,
        totalContentUploaded: uploaderProfile.total_content_uploaded,
      },
      txDigest,
    });
  } catch (error) {
    logger.error('Uploader registration error:', error);
    res.status(500).json({ error: 'Failed to register as uploader' });
  }
});

/**
 * GET /api/uploader/profile
 * Get uploader profile and stats
 * Requires: Authentication + Uploader status
 */
router.get('/profile', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            username: true,
            walletAddress: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!uploaderProfile) {
      return res.status(404).json({ error: 'Uploader profile not found' });
    }

    res.json({
      success: true,
      uploader: {
        id: uploaderProfile.id,
        username: uploaderProfile.user.username,
        walletAddress: uploaderProfile.user.walletAddress,
        avatarUrl: uploaderProfile.user.avatarUrl,
        blockchainAccountId: uploaderProfile.blockchainAccountId,
        totalEarnings: uploaderProfile.totalEarnings.toString(),
        pendingEarnings: uploaderProfile.pendingEarnings.toString(),
        totalStreams: uploaderProfile.totalStreams.toString(),
        totalContentUploaded: uploaderProfile.totalContentUploaded,
        createdAt: uploaderProfile.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get uploader profile error:', error);
    res.status(500).json({ error: 'Failed to get uploader profile' });
  }
});

/**
 * GET /api/uploader/content
 * List all content uploaded by this uploader
 * Requires: Authentication + Uploader status
 */
router.get('/content', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { userId },
    });

    if (!uploaderProfile) {
      return res.status(404).json({ error: 'Uploader profile not found' });
    }

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where: { uploader_id: uploaderProfile.id },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.content.count({ where: { uploader_id: uploaderProfile.id } }),
    ]);

    res.json({
      success: true,
      content,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Get uploader content error:', error);
    res.status(500).json({ error: 'Failed to get uploader content' });
  }
});

/**
 * POST /api/uploader/content
 * Create new content entry (metadata only - file upload handled separately)
 * Requires: Authentication + Uploader status
 */
router.post(
  '/content',
  authMiddleware,
  requireUploader,
  [
    body('title').isString().notEmpty().trim().isLength({ max: 200 }),
    body('description').isString().notEmpty().trim(),
    body('genre').isInt({ min: 0, max: 10 }),
    body('durationSeconds').isInt({ min: 1 }),
    body('walrusBlobIds').isObject(),
    body('thumbnailUrl').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.userId;
      const { title, description, genre, durationSeconds, walrusBlobIds, thumbnailUrl } = req.body;

      const uploaderProfile = await prisma.uploader_profiles.findUnique({
        where: { userId },
      });

      if (!uploaderProfile) {
        return res.status(404).json({ error: 'Uploader profile not found' });
      }

      // Register content on blockchain
      const { contentId: blockchainContentId, txDigest } = await suiBlockchainService.registerContent(
        title,
        description || '',
        parseInt(genre) || 0,
        durationSeconds,
        JSON.stringify(walrusBlobIds),
        thumbnailUrl || ''
      );

      // Create content in database
      const content = await prisma.content.create({
        data: {
          id: uuidv4(),
          blockchain_id: blockchainContentId,
          uploader_id: uploaderProfile.id,
          title,
          description,
          genre,
          duration_seconds: durationSeconds,
          walrus_blob_ids: walrusBlobIds,
          thumbnail_url: thumbnailUrl,
          status: 1, // 1 = Active
          updated_at: new Date(),
        },
      });

      // Update uploader's content count
      await prisma.uploader_profiles.update({
        where: { id: uploaderProfile.id },
        data: {
          total_content_uploaded: { increment: 1 },
          updated_at: new Date(),
        },
      });

      logger.info(`New content created: ${content.id} by uploader ${uploaderProfile.id}`);

      res.json({
        success: true,
        content: {
          id: content.id,
          blockchainId: content.blockchain_id,
          title: content.title,
          description: content.description,
          genre: content.genre,
          durationSeconds: content.duration_seconds,
          thumbnailUrl: content.thumbnail_url,
          status: content.status,
          createdAt: content.created_at,
        },
        txDigest,
      });
    } catch (error) {
      logger.error('Create content error:', error);
      res.status(500).json({ error: 'Failed to create content' });
    }
  }
);

/**
 * GET /api/uploader/earnings
 * Get earnings history and distribution records
 * Requires: Authentication + Uploader status
 */
router.get('/earnings', authMiddleware, requireUploader, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: { userId },
    });

    if (!uploaderProfile) {
      return res.status(404).json({ error: 'Uploader profile not found' });
    }

    const [distributions, total] = await Promise.all([
      prisma.distributions.findMany({
        where: { uploaderId: uploaderProfile.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.distributions.count({ where: { uploaderId: uploaderProfile.id } }),
    ]);

    res.json({
      success: true,
      summary: {
        totalEarnings: uploaderProfile.totalEarnings.toString(),
        pendingEarnings: uploaderProfile.pendingEarnings.toString(),
      },
      distributions: distributions.map((d) => ({
        id: d.id,
        weekStartDate: d.weekStartDate,
        weekEndDate: d.weekEndDate,
        amount: d.amount.toString(),
        weightedScore: d.weightedScore.toString(),
        totalStreams: d.totalStreams,
        blockchainTxDigest: d.blockchainTxDigest,
        createdAt: d.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Get uploader earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

export default router;
