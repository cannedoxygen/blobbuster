import { Router, Request, Response } from 'express';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/referral/validate
 * Validate a referral code and get provider info
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required',
      });
    }

    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase().trim();

    if (normalizedCode.length !== 5) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Invalid code format',
      });
    }

    // Find provider with this referral code
    const provider = await prisma.uploader_profiles.findUnique({
      where: { referral_code: normalizedCode },
      include: {
        users: {
          select: {
            username: true,
          },
        },
        content: {
          where: { status: 1 }, // Only active content
          select: { id: true },
        },
      },
    });

    if (!provider) {
      return res.json({
        success: true,
        valid: false,
      });
    }

    res.json({
      success: true,
      valid: true,
      provider: {
        id: provider.id,
        username: provider.users.username || 'Anonymous Provider',
        contentCount: provider.content.length,
      },
    });
  } catch (error) {
    logger.error('Referral validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate referral code',
    });
  }
});

/**
 * GET /api/referral/content/:code
 * Get all content from a provider by their referral code
 */
router.get('/content/:code', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase().trim();

    if (normalizedCode.length !== 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid code format',
      });
    }

    // Find provider with this referral code
    const provider = await prisma.uploader_profiles.findUnique({
      where: { referral_code: normalizedCode },
      include: {
        users: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
      });
    }

    // Get content from this provider
    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where: {
          uploader_id: provider.id,
          status: 1, // Only active content
        },
        include: {
          uploader_profiles: {
            select: {
              id: true,
              user_id: true,
              users: {
                select: {
                  username: true,
                  wallet_address: true,
                },
              },
            },
          },
        },
        orderBy: [
          { total_streams: 'desc' },
          { created_at: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.content.count({
        where: {
          uploader_id: provider.id,
          status: 1,
        },
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
      tmdbId: item.tmdb_id,
      imdbId: item.imdb_id,
      originalTitle: item.original_title,
      year: item.year,
      plot: item.plot,
      runtime: item.runtime,
      tagline: item.tagline,
      posterUrl: item.poster_url,
      backdropUrl: item.backdrop_url,
      genresList: item.genres_list,
      cast: item.cast,
      director: item.director,
      externalRating: item.external_rating,
      language: item.language,
      country: item.country,

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
      uploader: item.uploader_profiles ? {
        id: item.uploader_profiles.id,
        user: {
          username: item.uploader_profiles.users?.username,
          walletAddress: item.uploader_profiles.users?.wallet_address,
        },
      } : undefined,
    }));

    res.json({
      success: true,
      content: serializedContent,
      provider: {
        username: provider.users.username || 'Anonymous Provider',
        code: normalizedCode,
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Get content by referral error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content',
    });
  }
});

export default router;
