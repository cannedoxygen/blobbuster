import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, requireMembership } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const router = Router();

/**
 * POST /api/stream/start
 * Start a streaming session
 * Requires: Authentication + Active Membership
 */
router.post(
  '/start',
  authMiddleware,
  requireMembership,
  [body('contentId').isString().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { contentId } = req.body;
      const userId = req.user!.userId;

      // Check if content exists and is active
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          uploader_profiles: true,
        },
      });

      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      if (content.status !== 1) {
        // 1 = Active
        return res.status(403).json({ error: 'Content is not available for streaming' });
      }

      // Generate session ID
      const sessionId = uuidv4();

      // Create stream session in database
      const stream = await prisma.streams.create({
        data: {
          id: uuidv4(),
          session_id: sessionId,
          user_id: userId,
          content_id: contentId,
          start_time: new Date(),
          quality_level: 1, // Default to 720p (HD)
        },
      });

      // Parse walrus blob IDs from JSON
      const walrusBlobIds = typeof content.walrus_blob_ids === 'string'
        ? JSON.parse(content.walrus_blob_ids)
        : content.walrus_blob_ids;

      // Generate streaming URL through our proxy
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

      let streamUrl = '';

      // Check if content uses HLS segments or single blob
      if (walrusBlobIds.type === 'hls' && walrusBlobIds.segments) {
        // HLS streaming - provide playlist URL
        streamUrl = `${apiBaseUrl}/api/stream/hls/${contentId}/playlist.m3u8`;
        logger.info(`Stream started (HLS): ${sessionId} for content ${contentId} by user ${userId}`, {
          streamUrl,
          totalSegments: walrusBlobIds.segments.length,
        });
      } else if (walrusBlobIds.type === 'single' && walrusBlobIds.videoBlobId) {
        // New single-file format (post-HLS removal)
        streamUrl = `${apiBaseUrl}/api/stream/proxy/${walrusBlobIds.videoBlobId}`;
        logger.info(`Stream started (single file): ${sessionId} for content ${contentId} by user ${userId}`, {
          streamUrl,
          blobId: walrusBlobIds.videoBlobId,
        });
      } else {
        // Check for direct video key (current format) or legacy quality-based keys
        const blobId = walrusBlobIds.video || walrusBlobIds['720p'] || walrusBlobIds['1080p'] || walrusBlobIds['480p'] || '';
        streamUrl = blobId ? `${apiBaseUrl}/api/stream/proxy/${blobId}` : '';
        logger.info(`Stream started (legacy quality): ${sessionId} for content ${contentId} by user ${userId}`, {
          streamUrl,
          qualities: Object.keys(walrusBlobIds),
        });
      }

      res.json({
        success: true,
        sessionId,
        streamUrl,
        content: {
          id: content.id,
          title: content.title,
          durationSeconds: content.duration_seconds,
          thumbnailUrl: content.thumbnail_url,
        },
      });
    } catch (error) {
      logger.error('Stream start error:', error);
      res.status(500).json({ error: 'Failed to start stream' });
    }
  }
);

/**
 * POST /api/stream/heartbeat
 * Update streaming progress (called every 30s)
 */
router.post(
  '/heartbeat',
  authMiddleware,
  [
    body('sessionId').isString().notEmpty(),
    body('contentId').isString().notEmpty(),
    body('watchDuration').isInt({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId, contentId, watchDuration } = req.body;
      const userId = req.user!.userId;

      // Get content duration
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { duration_seconds: true },
      });

      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      // Calculate completion percentage
      const completionPercentage = Math.min(
        Math.round((watchDuration / content.duration_seconds) * 100),
        100
      );

      // Update stream session
      await prisma.streams.updateMany({
        where: {
          session_id: sessionId,
          user_id: userId,
        },
        data: {
          watch_duration: watchDuration,
          completion_percentage: completionPercentage,
        },
      });

      logger.debug(`Heartbeat: session ${sessionId}, progress ${completionPercentage}%`);

      res.json({
        success: true,
        completionPercentage,
      });
    } catch (error) {
      logger.error('Heartbeat error:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  }
);

/**
 * POST /api/stream/end
 * End streaming session and record final metrics
 */
router.post(
  '/end',
  authMiddleware,
  [
    body('sessionId').isString().notEmpty(),
    body('contentId').isString().notEmpty(),
    body('watchDuration').isInt({ min: 0 }),
    body('completionPercentage').isInt({ min: 0, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId, contentId, watchDuration, completionPercentage } = req.body;
      const userId = req.user!.userId;

      // Update stream session with final data
      const stream = await prisma.streams.updateMany({
        where: {
          session_id: sessionId,
          user_id: userId,
        },
        data: {
          end_time: new Date(),
          watch_duration: watchDuration,
          completion_percentage: completionPercentage,
        },
      });

      // Get content with uploader info
      const contentWithUploader = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
          uploader_id: true,
          average_completion_rate: true,
          total_streams: true,
        },
      });

      if (contentWithUploader) {
        // Calculate new average completion rate
        const currentAvg = contentWithUploader.average_completion_rate || 0;
        const currentStreams = Number(contentWithUploader.total_streams) || 0;
        const newAvg = Math.round(
          ((currentAvg * currentStreams) + completionPercentage) / (currentStreams + 1)
        );

        // Update content statistics
        await prisma.content.update({
          where: { id: contentId },
          data: {
            total_streams: { increment: 1 },
            total_watch_time: { increment: BigInt(watchDuration) },
            average_completion_rate: newAvg,
          },
        });

        // Update uploader profile total streams
        await prisma.uploader_profiles.update({
          where: { id: contentWithUploader.uploader_id },
          data: {
            total_streams: { increment: 1 },
          },
        });
      }

      // TODO: Record metrics on blockchain for revenue distribution
      // This would call suiBlockchainService.recordStreamMetrics()

      logger.info(`Stream ended: ${sessionId}, watched ${watchDuration}s (${completionPercentage}% complete)`);

      // ===== MEMBERSHIP POINTS LOGIC =====
      let pointAwarded = false;
      let pointMessage = '';

      try {
        // 1. Get content and check if viewer is the uploader
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          include: { uploader_profiles: true },
        });

        if (!content) {
          throw new Error('Content not found');
        }

        const isOwnContent = content.uploader_profiles.user_id === userId;

        // 2. Check if 85% completion threshold met
        const qualifiesForPoint = completionPercentage >= 85;

        // 3. Get user's active membership
        const membership = await prisma.memberships.findFirst({
          where: {
            user_id: userId,
            is_active: true,
          },
        });

        if (!isOwnContent && qualifiesForPoint && membership) {
          // 4. Check if already watched this content with this membership
          const existingWatch = await prisma.membership_watches.findUnique({
            where: {
              membership_id_content_id: {
                membership_id: membership.id,
                content_id: contentId,
              },
            },
          });

          if (!existingWatch) {
            // First time watching - award point!
            await prisma.$transaction([
              // Award the point
              prisma.memberships.update({
                where: { id: membership.id },
                data: { points: { increment: 1 } },
              }),

              // Record the watch
              prisma.membership_watches.create({
                data: {
                  membership_id: membership.id,
                  content_id: contentId,
                  completion_rate: completionPercentage,
                  points_awarded: true,
                },
              }),
            ]);

            pointAwarded = true;
            pointMessage = '🎉 Congratulations! You earned 1 point for watching this movie.';
            logger.info(`Point awarded: user ${userId} watched ${contentId} (${completionPercentage}% complete)`);
          } else {
            pointMessage = 'You already earned a point for this movie.';
            logger.debug(`No point awarded: user ${userId} already watched ${contentId}`);
          }
        } else if (isOwnContent) {
          pointMessage = 'You cannot earn points for watching your own content.';
          logger.debug(`No point awarded: user ${userId} is the uploader of ${contentId}`);
        } else if (!qualifiesForPoint) {
          pointMessage = `Watch at least 85% to earn a point (you watched ${completionPercentage}%).`;
          logger.debug(`No point awarded: user ${userId} only watched ${completionPercentage}% of ${contentId}`);
        } else if (!membership) {
          pointMessage = 'No active membership found.';
          logger.debug(`No point awarded: user ${userId} has no active membership`);
        }
      } catch (pointError) {
        // Don't fail the entire request if point logic fails
        logger.error('Point award error:', pointError);
        pointMessage = 'Failed to process points.';
      }

      res.json({
        success: true,
        watchDuration,
        completionPercentage,
        pointAwarded,
        pointMessage,
      });
    } catch (error) {
      logger.error('Stream end error:', error);
      res.status(500).json({ error: 'Failed to end stream' });
    }
  }
);

/**
 * GET /api/stream/history
 * Get user's watch history
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const streams = await prisma.streams.findMany({
      where: { user_id: userId },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            thumbnail_url: true,
            duration_seconds: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.streams.count({ where: { user_id: userId } });

    // Normalize to camelCase for frontend
    const normalizedStreams = streams.map((stream: any) => ({
      id: stream.id,
      userId: stream.user_id,
      contentId: stream.content_id,
      sessionId: stream.session_id,
      startTime: stream.start_time,
      endTime: stream.end_time,
      watchDuration: stream.watch_duration,
      completionPercentage: stream.completion_percentage,
      qualityLevel: stream.quality_level,
      createdAt: stream.created_at,
      content: stream.content ? {
        id: stream.content.id,
        title: stream.content.title,
        thumbnailUrl: stream.content.thumbnail_url,
        durationSeconds: stream.content.duration_seconds,
      } : undefined,
    }));

    res.json({
      success: true,
      streams: normalizedStreams,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get watch history' });
  }
});

/**
 * GET /api/stream/proxy/:blobId
 * Proxy video from Walrus with correct content-type
 * No auth required - access is controlled at stream/start level
 */
router.get('/proxy/:blobId', async (req: Request, res: Response) => {
  try {
    const { blobId } = req.params;
    const walrusAggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-mainnet.walrus.space';
    const walrusUrl = `${walrusAggregatorUrl}/v1/blobs/${blobId}`;

    logger.info(`Proxying video from Walrus: ${blobId}`, {
      range: req.headers.range || 'full request',
      url: walrusUrl,
    });

    // Optimize range requests for faster initial playback
    const headers: any = {};
    if (req.headers.range) {
      const rangeHeader = req.headers.range;

      // Check if this is an initial "bytes=0-" request (no end specified)
      // This typically means the browser wants the entire file
      if (rangeHeader === 'bytes=0-') {
        // Limit initial request to first 10 MB for faster startup
        // Browser will automatically request more as needed
        const initialChunkSize = 10 * 1024 * 1024; // 10 MB
        headers.Range = `bytes=0-${initialChunkSize - 1}`;
        logger.info('Optimizing initial range request', {
          original: rangeHeader,
          optimized: headers.Range,
        });
      } else {
        // Forward other range requests as-is (seeking, continuation, etc.)
        headers.Range = rangeHeader;
      }
    }

    // Fetch from Walrus with longer timeout and keep-alive
    const response = await axios.get(walrusUrl, {
      headers,
      responseType: 'stream',
      validateStatus: (status) => status < 500, // Accept 206 for partial content
      timeout: 600000, // 10 minute timeout
      maxRedirects: 5,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // Keep connection alive
      httpAgent: new (require('http').Agent)({ keepAlive: true }),
      httpsAgent: new (require('https').Agent)({ keepAlive: true }),
    });

    // Set correct content-type for video
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    // Set CORS headers for cross-origin video playback
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

    // Always forward content-length
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    // Handle partial content responses
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
      res.status(206); // Partial content
      logger.info(`Serving partial content: ${response.headers['content-range']}`);
    } else {
      // Even for full requests, set 200 explicitly
      res.status(200);
      logger.info(`Serving full content: ${response.headers['content-length']} bytes`);
    }

    // Stream the video with error handling
    response.data.on('error', (streamError: any) => {
      logger.error('Stream error while piping:', {
        message: streamError?.message,
        code: streamError?.code,
      });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream interrupted' });
      }
    });

    response.data.pipe(res);

  } catch (error: any) {
    logger.error('Video proxy error:', {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy video' });
    }
  }
});

/**
 * GET /api/stream/hls/:contentId/playlist.m3u8
 * Generate HLS playlist (m3u8) dynamically from database segments
 * No auth required - access is controlled at stream/start level
 */
router.get('/hls/:contentId/playlist.m3u8', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    // Get content with HLS segment information
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { walrus_blob_ids: true, duration_seconds: true },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Parse walrus blob IDs
    const walrusBlobIds = typeof content.walrus_blob_ids === 'string'
      ? JSON.parse(content.walrus_blob_ids)
      : content.walrus_blob_ids;

    if (walrusBlobIds.type !== 'hls' || !walrusBlobIds.segments) {
      return res.status(400).json({ error: 'Content does not use HLS streaming' });
    }

    // Generate m3u8 playlist
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const segments = walrusBlobIds.segments;

    let playlist = '#EXTM3U\n';
    playlist += '#EXT-X-VERSION:3\n';
    playlist += `#EXT-X-TARGETDURATION:${Math.ceil(Math.max(...segments.map((s: any) => s.duration)))}\n`;
    playlist += '#EXT-X-MEDIA-SEQUENCE:0\n';
    playlist += '#EXT-X-PLAYLIST-TYPE:VOD\n';

    for (const segment of segments) {
      playlist += `#EXTINF:${segment.duration.toFixed(3)},\n`;
      playlist += `${apiBaseUrl}/api/stream/hls/${contentId}/segment/${segment.index}\n`;
    }

    playlist += '#EXT-X-ENDLIST\n';

    logger.info(`Generated HLS playlist for content ${contentId}`, {
      totalSegments: segments.length,
      duration: content.duration_seconds,
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(playlist);
  } catch (error: any) {
    logger.error('HLS playlist generation error:', {
      contentId: req.params.contentId,
      error: error?.message,
    });
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

/**
 * GET /api/stream/hls/:contentId/segment/:index
 * Proxy HLS segment from Walrus
 * No auth required - access is controlled at stream/start level
 */
router.get('/hls/:contentId/segment/:index', async (req: Request, res: Response) => {
  try {
    const { contentId, index } = req.params;
    const segmentIndex = parseInt(index);

    // Get content with HLS segment information
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { walrus_blob_ids: true },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Parse walrus blob IDs
    const walrusBlobIds = typeof content.walrus_blob_ids === 'string'
      ? JSON.parse(content.walrus_blob_ids)
      : content.walrus_blob_ids;

    if (walrusBlobIds.type !== 'hls' || !walrusBlobIds.segments) {
      return res.status(400).json({ error: 'Content does not use HLS streaming' });
    }

    // Find the requested segment
    const segment = walrusBlobIds.segments.find((s: any) => s.index === segmentIndex);

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    // Proxy from Walrus
    const walrusAggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-mainnet.walrus.space';
    const walrusUrl = `${walrusAggregatorUrl}/v1/blobs/${segment.blobId}`;

    logger.debug(`Proxying HLS segment ${segmentIndex} from Walrus`, {
      contentId,
      blobId: segment.blobId,
      url: walrusUrl,
    });

    // Forward range header if present
    const headers: any = {};
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    // Fetch from Walrus
    const response = await axios.get(walrusUrl, {
      headers,
      responseType: 'stream',
      validateStatus: (status) => status < 500,
      timeout: 60000, // 1 minute timeout per segment
      maxRedirects: 5,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      httpAgent: new (require('http').Agent)({ keepAlive: true }),
      httpsAgent: new (require('https').Agent)({ keepAlive: true }),
    });

    // Set correct content-type for MPEG-TS segment
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
      res.status(206);
    } else {
      res.status(200);
    }

    // Stream the segment
    response.data.pipe(res);

  } catch (error: any) {
    logger.error('HLS segment proxy error:', {
      contentId: req.params.contentId,
      index: req.params.index,
      error: error?.message,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy segment' });
    }
  }
});

export default router;
