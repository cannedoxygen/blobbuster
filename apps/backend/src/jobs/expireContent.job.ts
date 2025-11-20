import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Expire Content Job
 *
 * Runs daily to check for content with expired Walrus storage and mark them as inactive.
 * Status codes:
 * - 1 = Active
 * - 2 = Expired (storage expired on Walrus)
 */

export async function expireContentJob(): Promise<void> {
  try {
    logger.info('Running content expiration job...');

    const now = new Date();

    // Find all active content where storage has expired
    const expiredContent = await prisma.content.findMany({
      where: {
        status: 1, // Active
        storage_expires_at: {
          lte: now, // Less than or equal to now (expired)
        },
      },
      select: {
        id: true,
        title: true,
        storage_expires_at: true,
        storage_epochs: true,
      },
    });

    if (expiredContent.length === 0) {
      logger.info('No expired content found');
      return;
    }

    logger.info(`Found ${expiredContent.length} expired content items`, {
      count: expiredContent.length,
      titles: expiredContent.map((c) => c.title),
    });

    // Mark expired content as inactive (status = 2)
    const result = await prisma.content.updateMany({
      where: {
        id: {
          in: expiredContent.map((c) => c.id),
        },
      },
      data: {
        status: 2, // Expired
        updated_at: new Date(),
      },
    });

    logger.info(`Successfully marked ${result.count} content items as expired`, {
      count: result.count,
      expiredContent: expiredContent.map((c) => ({
        id: c.id,
        title: c.title,
        expiredAt: c.storage_expires_at,
        epochs: c.storage_epochs,
      })),
    });
  } catch (error) {
    logger.error('Content expiration job failed', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}
