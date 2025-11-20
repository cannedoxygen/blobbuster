import { Request, Response, NextFunction } from 'express';
import { authService, AuthTokenPayload } from '../services/auth.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload & {
        id: string;
        walletAddress: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 * Usage: router.get('/protected', authMiddleware, handler)
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const payload = authService.verifyToken(token);

    // Attach user info to request
    req.user = {
      id: payload.userId,
      userId: payload.userId,
      walletAddress: payload.walletAddress,
      iat: payload.iat,
      exp: payload.exp,
    };

    next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error);

    if (error.message === 'Token expired') {
      return res.status(401).json({ error: 'Token expired', expired: true });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Optional middleware - doesn't fail if no token provided
 * Useful for routes that work with or without authentication
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const payload = authService.verifyToken(token);

      req.user = {
        id: payload.userId,
        userId: payload.userId,
        walletAddress: payload.walletAddress,
        iat: payload.iat,
        exp: payload.exp,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth middleware: Invalid token');
    next();
  }
}

/**
 * Middleware to check if user has active membership
 */
export async function requireMembership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      logger.warn('[Membership] No user attached to request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info('[Membership] Checking membership for user:', req.user.userId);

    // Check if user has active membership in database
    const membership = await prisma.memberships.findFirst({
      where: {
        user_id: req.user.userId,
        is_active: true,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    logger.info('[Membership] Query result:', {
      found: !!membership,
      userId: req.user.userId,
      membershipId: membership?.id,
      isActive: membership?.is_active,
      expiresAt: membership?.expires_at,
    });

    if (!membership) {
      logger.warn('[Membership] ❌ No active membership found for user:', req.user.userId);
      return res.status(403).json({
        error: 'Active membership required',
        code: 'NO_MEMBERSHIP',
      });
    }

    logger.info('[Membership] ✅ Active membership verified for user:', req.user.userId);
    next();
  } catch (error) {
    logger.error('Membership check error:', error);
    return res.status(500).json({ error: 'Failed to verify membership' });
  }
}

/**
 * Middleware to check if user is an uploader
 */
export async function requireUploader(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is registered as uploader
    const uploaderProfile = await prisma.uploader_profiles.findUnique({
      where: {
        user_id: req.user.userId,
      },
    });

    if (!uploaderProfile) {
      return res.status(403).json({
        error: 'Uploader registration required',
        code: 'NOT_UPLOADER',
      });
    }

    next();
  } catch (error) {
    logger.error('Uploader check error:', error);
    return res.status(500).json({ error: 'Failed to verify uploader status' });
  }
}
