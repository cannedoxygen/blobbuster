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

// Create Express app
export const app: Application = express();

// ===== Middleware =====

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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

// ===== 404 Handler =====

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ===== Error Handler =====

app.use(errorMiddleware);
