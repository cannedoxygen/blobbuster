import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn'] // Removed 'query' to reduce terminal noise
    : ['error'],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}

// Handle cleanup
process.on('beforeExit', async () => {
  await disconnectDatabase();
});
