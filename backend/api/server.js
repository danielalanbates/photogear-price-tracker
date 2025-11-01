/**
 * PhotoGear Price Tracker - Main API Server
 * Express server for handling all API requests
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Import routes
import productsRouter from './routes/products.js';
import usersRouter from './routes/users.js';
import alertsRouter from './routes/alerts.js';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://photogeartracker.com', 'chrome-extension://*']
    : '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/alerts', alertsRouter);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'PhotoGear Price Tracker API',
    version: '1.0.0',
    endpoints: {
      products: {
        'GET /api/products/search': 'Search for products',
        'GET /api/products/:id': 'Get product details',
        'GET /api/products/:id/prices': 'Get price history',
        'GET /api/products/tracked': 'Get user\'s tracked products',
        'GET /api/products/best-deals': 'Get current best deals',
        'POST /api/products/track': 'Track a product',
        'POST /api/products/untrack': 'Untrack a product'
      },
      users: {
        'POST /api/users/register': 'Register new user',
        'POST /api/users/login': 'Login user',
        'GET /api/users/profile': 'Get user profile',
        'PUT /api/users/settings': 'Update user settings'
      },
      alerts: {
        'GET /api/alerts': 'Get user\'s alert history',
        'POST /api/alerts/test': 'Send test alert'
      }
    },
    documentation: 'https://docs.photogeartracker.com'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 PhotoGear Price Tracker API running on port ${PORT}`);
  logger.info(`📸 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API Base URL: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
