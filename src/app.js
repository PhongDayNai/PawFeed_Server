import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimits.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import adminRoutes from './routes/admin.routes.js';
import deviceRoutes from './routes/device.routes.js';
import devRoutes from './routes/dev.routes.js';
import { sendSuccess } from './utils/response.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: env.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: true }));

  if (!env.isProduction) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  app.get('/', (_req, res) => {
    sendSuccess(res, {
      service: env.appName,
      version: env.appVersion,
      message: 'Pet Feeder Server is running. Use GET /api/health for health check.'
    });
  });

  app.use('/api', apiRateLimiter);
  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', accountRoutes);
  app.use('/api', deviceRoutes);
  app.use('/api', adminRoutes);

  if (env.enableDevErrorRoute && !env.isProduction) {
    app.use('/api/dev', devRoutes);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
