import jwt from 'jsonwebtoken';
import { fromB64 } from '@mysten/sui.js/utils';
import { verifyPersonalMessage } from '@mysten/sui.js/verify';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
const JWT_EXPIRY = '7d'; // 7 days
const JWT_REFRESH_EXPIRY = '30d'; // 30 days

export interface AuthTokenPayload {
  userId: string;
  walletAddress: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  /**
   * Generate authentication challenge message
   * This message will be signed by the user's wallet
   */
  generateChallengeMessage(walletAddress: string): string {
    const timestamp = Date.now();
    return `Sign this message to authenticate with Blockbuster\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
  }

  /**
   * Verify Sui wallet signature
   */
  async verifySignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);

      // Verify the personal message signature
      const publicKey = await verifyPersonalMessage(
        messageBytes,
        signature
      );

      // Get address from public key
      const derivedAddress = publicKey.toSuiAddress();

      // Compare addresses (case-insensitive)
      return derivedAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(userId: string, walletAddress: string): string {
    const payload: AuthTokenPayload = {
      userId,
      walletAddress,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId: string, walletAddress: string): string {
    const payload: AuthTokenPayload = {
      userId,
      walletAddress,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRY,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Find or create user by wallet address
   */
  async findOrCreateUser(walletAddress: string) {
    try {
      // Normalize wallet address
      const normalizedAddress = walletAddress.toLowerCase();

      // Try to find existing user
      let user = await prisma.users.findUnique({
        where: { wallet_address: normalizedAddress },
        include: {
          memberships: {
            where: { is_active: true },
            orderBy: { expires_at: 'desc' },
            take: 1,
          },
          uploader_profiles: true,
        },
      });

      // Create new user if doesn't exist
      if (!user) {
        const now = new Date();
        user = await prisma.users.create({
          data: {
            id: uuidv4(),
            wallet_address: normalizedAddress,
            username: `user_${normalizedAddress.slice(0, 8)}`,
            updated_at: now,
          },
          include: {
            memberships: true,
            uploader_profiles: true,
          },
        });

        logger.info(`New user created: ${normalizedAddress}`);
      }

      return user;
    } catch (error) {
      logger.error('Error finding or creating user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with wallet signature
   */
  async authenticateWithSignature(
    walletAddress: string,
    message: string,
    signature: string
  ) {
    // Verify signature
    const isValid = await this.verifySignature(walletAddress, message, signature);

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Find or create user
    const user = await this.findOrCreateUser(walletAddress);

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.wallet_address);
    const refreshToken = this.generateRefreshToken(user.id, user.wallet_address);

    return {
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url,
        hasMembership: user.memberships.length > 0,
        isUploader: !!user.uploader_profiles,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken);

      // Get user from database
      const user = await prisma.users.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(user.id, user.wallet_address);

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token: string) {
    try {
      const payload = this.verifyToken(token);

      const user = await prisma.users.findUnique({
        where: { id: payload.userId },
        include: {
          memberships: {
            where: { is_active: true },
            orderBy: { expires_at: 'desc' },
            take: 1,
          },
          uploader_profiles: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url,
        hasMembership: user.memberships.length > 0,
        isUploader: !!user.uploader_profiles,
        createdAt: user.created_at,
      };
    } catch (error) {
      logger.error('Failed to get user from token:', error);
      throw error;
    }
  }
}

// Singleton instance
export const authService = new AuthService();
