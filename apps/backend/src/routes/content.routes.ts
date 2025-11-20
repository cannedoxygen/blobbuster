import { Router, Request, Response } from 'express';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/content
 * Browse all content with pagination and filters
 */
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const genre = req.query.genre ? parseInt(req.query.genre as string) : undefined;
    const status = 1; // Only show active content

    const where: any = { status };
    if (genre !== undefined) {
      where.genre = genre;
    }

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
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
      prisma.content.count({ where }),
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
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Browse content error:', error);
    res.status(500).json({ error: 'Failed to browse content' });
  }
});

/**
 * GET /api/content/:id
 * Get content details by ID
 */
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        uploader_profiles: {
          select: {
            id: true,
            user_id: true,
            users: {
              select: {
                id: true,
                username: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Calculate average rating
    const averageRating = content.rating_count > 0
      ? Number(content.rating_sum) / Number(content.rating_count)
      : 0;

    res.json({
      success: true,
      content: {
        id: content.id,
        blockchainId: content.blockchain_id,
        uploaderId: content.uploader_id,
        title: content.title,
        description: content.description,
        genre: content.genre,
        durationSeconds: content.duration_seconds,
        walrusBlobIds: content.walrus_blob_ids,
        thumbnailUrl: content.thumbnail_url,

        // TMDB Metadata
        tmdbId: content.tmdb_id,
        imdbId: content.imdb_id,
        originalTitle: content.original_title,
        year: content.year,
        plot: content.plot,
        runtime: content.runtime,
        tagline: content.tagline,
        posterUrl: content.poster_url,
        backdropUrl: content.backdrop_url,
        genresList: content.genres_list,
        cast: content.cast,
        director: content.director,
        externalRating: content.external_rating,
        language: content.language,
        country: content.country,

        // Storage expiration
        storage_epochs: content.storage_epochs,
        storage_expires_at: content.storage_expires_at,

        status: content.status,
        totalStreams: Number(content.total_streams),
        totalWatchTime: Number(content.total_watch_time),
        averageCompletionRate: content.average_completion_rate,
        ratingSum: Number(content.rating_sum),
        ratingCount: Number(content.rating_count),
        averageRating: averageRating.toFixed(1),
        createdAt: content.created_at,
        updatedAt: content.updated_at,
        uploader: {
          id: content.uploader_profiles.id,
          username: content.uploader_profiles.users.username,
          avatarUrl: content.uploader_profiles.users.avatar_url,
        },
      },
    });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

/**
 * GET /api/content/search?q=query
 * Search content by title or description
 */
router.get('/search', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const content = await prisma.content.findMany({
      where: {
        status: 1, // Only active content
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        uploader_profiles: {
          select: {
            id: true,
            users: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        total_streams: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.content.count({
      where: {
        status: 1,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    // Normalize to camelCase for frontend
    const normalizedResults = content.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      uploaderId: item.uploader_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      durationSeconds: item.duration_seconds,
      walrusBlobIds: item.walrus_blob_ids,
      thumbnailUrl: item.thumbnail_url,
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
        username: item.uploader_profiles.users?.username,
      } : undefined,
    }));

    res.json({
      success: true,
      results: normalizedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Search content error:', error);
    res.status(500).json({ error: 'Failed to search content' });
  }
});

/**
 * GET /api/content/featured
 * Get featured content
 */
router.get('/featured', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const content = await prisma.content.findMany({
      where: {
        status: 1, // Active content
        average_completion_rate: {
          gte: 70, // High completion rate
        },
      },
      include: {
        uploader_profiles: {
          select: {
            users: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: [
        { total_streams: 'desc' },
        { average_completion_rate: 'desc' },
      ],
      take: 10,
    });

    // Normalize to camelCase for frontend
    const normalizedContent = content.map((item: any) => ({
      id: item.id,
      blockchainId: item.blockchain_id,
      uploaderId: item.uploader_id,
      title: item.title,
      description: item.description,
      genre: item.genre,
      durationSeconds: item.duration_seconds,
      walrusBlobIds: item.walrus_blob_ids,
      thumbnailUrl: item.thumbnail_url,
      status: item.status,
      totalStreams: Number(item.total_streams),
      totalWatchTime: Number(item.total_watch_time),
      averageCompletionRate: item.average_completion_rate,
      ratingSum: Number(item.rating_sum),
      ratingCount: Number(item.rating_count),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      uploader: item.uploader_profiles ? {
        username: item.uploader_profiles.users?.username,
      } : undefined,
    }));

    res.json({
      success: true,
      content: normalizedContent,
    });
  } catch (error) {
    logger.error('Get featured content error:', error);
    res.status(500).json({ error: 'Failed to get featured content' });
  }
});

export default router;
