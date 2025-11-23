import dotenv from 'dotenv';
dotenv.config();

import { logger } from './utils/logger';
import { app } from './app';

import { connectDatabase } from './config/database';
import { connectRedis } from './utils/redis';
import { initializeJobs, shutdownJobs } from './jobs';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log('[STARTUP] Starting BlobBuster backend...');
    console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
    console.log('[STARTUP] DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('[STARTUP] PORT:', process.env.PORT);

    // Ensure upload and transcode directories exist
    const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
    const transcodeDir = process.env.TRANSCODE_DIR || '/tmp/transcoded';

    for (const dir of [uploadDir, transcodeDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`✓ Created directory: ${dir}`);
      } else {
        logger.info(`✓ Directory exists: ${dir}`);
      }
    }

    // Connect to PostgreSQL
    logger.info('Attempting database connection...');
    await Promise.race([
      connectDatabase(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
    logger.info('✓ Connected to PostgreSQL');

    // Connect to Redis (optional)
    const redisConnection = await connectRedis();
    if (redisConnection) {
      logger.info('✓ Connected to Redis');
    } else {
      logger.info('○ Redis disabled (running without cache)');
    }

    // Initialize background jobs
    initializeJobs();
    logger.info('✓ Background jobs initialized');

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🎬 Blockbuster API server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Network: ${process.env.SUI_NETWORK || 'testnet'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      await shutdownJobs();
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      await shutdownJobs();
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('=== FATAL STARTUP ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error(reason);
  process.exit(1);
});

startServer();
