import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fileUpload from 'express-fileupload';

import connect from './src/connnect/db.js';
import { connectToRedis } from './src/config/redis.js';
import { initializeSocket, getIO } from './src/socket/index.js';
import { initializeQueues, closeQueues } from './src/queues/index.js';
import apiRouter from './src/routes/index.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';
import logger from './src/utils/logger.js';

const app = express();
const httpServer = http.createServer(app);

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Request Parsing ──────────────────────────────────────────────────────────

app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

// File uploads (temp files for Cloudinary)
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    abortOnLimit: true,
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// Strict limiter for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/forgot-password', authRateLimiter);
app.use('/api', apiRateLimiter);

// ─── Inject io into every request ────────────────────────────────────────────
// getIO was imported at the top of the file; used here after initializeSocket() runs.
app.use((req, _res, next) => {
  try {
    req.io = getIO();
  } catch {
    req.io = null;
  }
  next();
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api', apiRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ─── Server Startup ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB (required)
    await connect();

    // 2. Connect to Redis (optional — app works without it)
    await connectToRedis();

    // 3. Initialize Socket.IO
    initializeSocket(httpServer);

    // 4. Start BullMQ queues & workers (requires Redis)
    initializeQueues();

    // 5. Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`API base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// ─── Process Lifecycle ────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  try {
    await closeQueues();
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10s if something hangs
    setTimeout(() => process.exit(1), 10000);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;
