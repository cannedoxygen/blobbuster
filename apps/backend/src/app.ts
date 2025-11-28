import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import membershipRoutes from './routes/membership.routes';
import contentRoutes from './routes/content.routes';
import streamRoutes from './routes/stream.routes';
import uploadRoutes from './routes/upload.routes';
import revenueRoutes from './routes/revenue.routes';
import analyticsRoutes from './routes/analytics.routes';
import walrusRoutes from './routes/walrus.routes';
import metadataRoutes from './routes/metadata.routes';
import referralRoutes from './routes/referral.routes';
import statsRoutes from './routes/stats.routes';

// Create Express app
export const app: Application = express();

// ===== Middleware =====

// Security headers
app.use(helmet());

// CORS - Allow localhost, ngrok, and Vercel domains
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CORS_ORIGIN
    ];

    // Allow any Vercel domain, ngrok domain, simp.wtf, or blobbuster.com
    if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.simp.wtf') ||
        origin.endsWith('.blobbuster.com') ||
        origin === 'https://blobbuster.com' ||
        origin.includes('.ngrok') ||
        origin.includes('.ngrok-free.dev') ||
        origin.includes('.trycloudflare.com')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (skip noisy polling endpoints)
const skipPaths = [
  '/api/upload/active',
  '/api/upload/my-content',
  '/api/upload/analytics',
  '/health'
];
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', {
    skip: (req) => skipPaths.some(path => req.url === path)
  }));
} else {
  app.use(morgan('combined', {
    skip: (req) => skipPaths.some(path => req.url === path),
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// ===== Health Check =====

app.get('/health', async (req, res) => {
  const startTime = Date.now();
  try {
    // Ping database to wake it up
    const { prisma } = await import('./config/database');
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    res.json({
      status: 'ok',
      database: 'connected',
      dbLatencyMs: dbLatency,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error: any) {
    const dbLatency = Date.now() - startTime;
    logger.error('Health check failed - Database error:', error.message);

    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      dbLatencyMs: dbLatency,
      error: error.message || 'Unknown database error',
      errorCode: error.code || null,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      hint: error.message?.includes('timeout')
        ? 'Database may be paused (Supabase free tier pauses after inactivity)'
        : error.message?.includes('ECONNREFUSED')
        ? 'Cannot reach database server - check DATABASE_URL'
        : 'Check Supabase dashboard for project status'
    });
  }
});

// Detailed diagnostics endpoint
app.get('/health/details', async (req, res) => {
  const results: any = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  // Test database connection
  const dbStart = Date.now();
  try {
    const { prisma } = await import('./config/database');
    const dbResult = await prisma.$queryRaw`SELECT NOW() as time, current_database() as db`;
    results.checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
      details: dbResult
    };
  } catch (error: any) {
    results.checks.database = {
      status: 'error',
      latencyMs: Date.now() - dbStart,
      error: error.message,
      code: error.code
    };
  }

  // Test Redis if configured
  try {
    const { getRedisClient } = await import('./utils/redis');
    const redis = getRedisClient();
    if (redis) {
      const redisStart = Date.now();
      await redis.ping();
      results.checks.redis = {
        status: 'ok',
        latencyMs: Date.now() - redisStart
      };
    } else {
      results.checks.redis = { status: 'disabled' };
    }
  } catch (error: any) {
    results.checks.redis = {
      status: 'error',
      error: error.message
    };
  }

  const hasErrors = Object.values(results.checks).some((c: any) => c.status === 'error');
  res.status(hasErrors ? 503 : 200).json(results);
});

// ===== API Routes =====

app.use('/api/auth', authRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/walrus', walrusRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/stats', statsRoutes);

// ===== 404 Handler =====

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ===== Error Handler =====

app.use(errorMiddleware);
