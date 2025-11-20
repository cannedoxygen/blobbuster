import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/challenge
 * Get challenge message for wallet to sign
 */
router.post(
  '/challenge',
  [body('walletAddress').isString().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { walletAddress } = req.body;

      const message = authService.generateChallengeMessage(walletAddress);

      res.json({
        success: true,
        message,
      });
    } catch (error) {
      logger.error('Challenge generation error:', error);
      res.status(500).json({ error: 'Failed to generate challenge' });
    }
  }
);

/**
 * POST /api/auth/connect
 * Authenticate user via wallet signature
 */
router.post(
  '/connect',
  [
    body('walletAddress').isString().notEmpty(),
    body('message').isString().notEmpty(),
    body('signature').isString().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { walletAddress, message, signature } = req.body;

      // Authenticate user
      const result = await authService.authenticateWithSignature(
        walletAddress,
        message,
        signature
      );

      logger.info(`User authenticated: ${walletAddress}`);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error('Authentication error:', error);

      if (error.message === 'Invalid signature') {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);

/**
 * POST /api/auth/verify
 * Verify JWT token and return user info
 */
router.post(
  '/verify',
  [body('token').isString().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token } = req.body;

      // Get user from token
      const user = await authService.getUserFromToken(token);

      res.json({
        success: true,
        valid: true,
        user,
      });
    } catch (error: any) {
      logger.error('Token verification error:', error);

      if (error.message === 'Token expired') {
        return res.status(401).json({ error: 'Token expired', expired: true });
      }

      if (error.message === 'Invalid token') {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.status(401).json({ error: 'Token verification failed' });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { refreshToken } = req.body;

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);

      if (error.message === 'Token expired') {
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      res.status(401).json({ error: 'Token refresh failed' });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.getUserFromToken(token);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

export default router;
