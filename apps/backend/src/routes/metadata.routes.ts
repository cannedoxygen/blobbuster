import { Router, Request, Response } from 'express';
import { getMetadataService } from '../services/metadata.service';
import { logger } from '../utils/logger';
// Lazy import to avoid top-level prisma import hang
// import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/metadata/search
 * Search TMDB for movie metadata by filename
 * No auth required - just for preview before upload
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required',
      });
    }

    logger.info('TMDB metadata search requested', { filename });

    const metadataService = getMetadataService();

    // Check if TMDB is enabled
    if (!metadataService.isEnabled()) {
      return res.json({
        success: true,
        found: false,
        message: 'TMDB is not configured',
      });
    }

    // Search with fallback strategies
    const metadata = await metadataService.searchMovieWithFallbacks(filename);

    if (metadata) {
      logger.info('TMDB metadata found', {
        filename,
        title: metadata.title,
        year: metadata.year,
        tmdbId: metadata.tmdbId,
      });

      return res.json({
        success: true,
        found: true,
        metadata: {
          title: metadata.title,
          originalTitle: metadata.originalTitle,
          year: metadata.year,
          plot: metadata.plot,
          runtime: metadata.runtime,
          tagline: metadata.tagline,
          posterUrl: metadata.posterUrl,
          backdropUrl: metadata.backdropUrl,
          genres: metadata.genres,
          cast: metadata.cast,
          director: metadata.director,
          rating: metadata.rating,
          language: metadata.language,
          country: metadata.country,
          tmdbId: metadata.tmdbId,
          imdbId: metadata.imdbId,
        },
      });
    } else {
      logger.info('No TMDB metadata found', { filename });

      // Parse filename to at least get a title
      const parsed = getMetadataService().parseFilename(filename);

      return res.json({
        success: true,
        found: false,
        suggestedTitle: parsed.title,
        suggestedYear: parsed.year,
        message: 'No match found in TMDB. You can enter details manually.',
      });
    }
  } catch (error: any) {
    logger.error('Metadata search failed', {
      error: error.message,
      filename: req.body.filename,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to search metadata',
      details: error.message,
    });
  }
});

/**
 * POST /api/metadata/search-by-title
 * Manual search by title (for when filename doesn't work)
 */
router.post('/search-by-title', async (req: Request, res: Response) => {
  try {
    const { title, year } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      });
    }

    logger.info('Manual TMDB search', { title, year });

    const metadataService = getMetadataService();

    if (!metadataService.isEnabled()) {
      return res.json({
        success: true,
        found: false,
        message: 'TMDB is not configured',
      });
    }

    const metadata = await metadataService.searchMovie(title, year);

    if (metadata) {
      return res.json({
        success: true,
        found: true,
        metadata: {
          title: metadata.title,
          originalTitle: metadata.originalTitle,
          year: metadata.year,
          plot: metadata.plot,
          runtime: metadata.runtime,
          tagline: metadata.tagline,
          posterUrl: metadata.posterUrl,
          backdropUrl: metadata.backdropUrl,
          genres: metadata.genres,
          cast: metadata.cast,
          director: metadata.director,
          rating: metadata.rating,
          language: metadata.language,
          country: metadata.country,
          tmdbId: metadata.tmdbId,
          imdbId: metadata.imdbId,
        },
      });
    } else {
      return res.json({
        success: true,
        found: false,
        message: 'No match found in TMDB',
      });
    }
  } catch (error: any) {
    logger.error('Manual metadata search failed', {
      error: error.message,
      title: req.body.title,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to search metadata',
      details: error.message,
    });
  }
});

/**
 * POST /api/metadata/check-duplicate
 * Check if content with given tmdbId already exists
 * No auth required - just for preview before upload
 */
router.post('/check-duplicate', async (req: Request, res: Response) => {
  try {
    const { tmdbId } = req.body;

    if (!tmdbId) {
      return res.json({
        success: true,
        isDuplicate: false,
        message: 'No TMDB ID provided',
      });
    }

    const { prisma } = await import('../config/database');

    // Check if content with this tmdbId already exists
    const existingContent = await prisma.content.findFirst({
      where: {
        tmdb_id: parseInt(tmdbId),
      },
      select: {
        id: true,
        title: true,
        year: true,
        poster_url: true,
        created_at: true,
      },
    });

    if (existingContent) {
      logger.info('Duplicate content found', {
        tmdbId,
        existingTitle: existingContent.title,
      });

      return res.json({
        success: true,
        isDuplicate: true,
        existingContent: {
          id: existingContent.id,
          title: existingContent.title,
          year: existingContent.year,
          posterUrl: existingContent.poster_url,
          uploadedAt: existingContent.created_at,
        },
      });
    } else {
      return res.json({
        success: true,
        isDuplicate: false,
      });
    }
  } catch (error: any) {
    logger.error('Duplicate check failed', {
      error: error.message,
      tmdbId: req.body.tmdbId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check for duplicates',
      details: error.message,
    });
  }
});

/**
 * POST /api/metadata/refresh/:contentId
 * Refresh TMDB metadata for existing content
 * Requires authentication - only uploader can refresh their content
 */
router.post('/refresh/:contentId', async (req: Request, res: Response) => {
  try {
    // Manual auth check to avoid top-level prisma import
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { authService } = await import('../services/auth.service');
    const payload = authService.verifyToken(token);
    const userId = payload.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    const { prisma } = await import('../config/database');
    const { contentId } = req.params;

    // Verify content exists and user owns it
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        title: true,
        uploader_id: true,
      },
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      });
    }

    if (content.uploader_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this content',
      });
    }

    const metadataService = getMetadataService();

    // Check if TMDB is enabled
    if (!metadataService.isEnabled()) {
      return res.status(400).json({
        success: false,
        error: 'TMDB is not configured',
      });
    }

    logger.info('Refreshing TMDB metadata', {
      contentId,
      title: content.title,
      userId,
    });

    // Search for metadata
    const metadata = await metadataService.searchMovie(content.title);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'No TMDB results found for this title',
      });
    }

    // Update content with TMDB metadata
    const updatedContent = await prisma.content.update({
      where: { id: contentId },
      data: {
        tmdb_id: metadata.tmdbId,
        poster_url: metadata.posterUrl,
        backdrop_url: metadata.backdropUrl,
        year: metadata.year,
        external_rating: metadata.rating,
        language: metadata.language,
        original_title: metadata.originalTitle,
        plot: metadata.plot,
        updated_at: new Date(),
      },
    });

    logger.info('TMDB metadata refreshed successfully', {
      contentId,
      title: content.title,
      tmdbId: metadata.tmdbId,
    });

    res.json({
      success: true,
      content: updatedContent,
      metadata,
    });
  } catch (error: any) {
    logger.error('Failed to refresh TMDB metadata', {
      error: error.message,
      contentId: req.params.contentId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to refresh metadata',
      details: error.message,
    });
  }
});

export default router;
