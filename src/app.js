import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimits.js';
import {
  createHelmetMiddleware,
  prototypePollutionGuard,
  requestIdMiddleware,
  requireHttpsMiddleware
} from './middleware/security.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import adminRoutes from './routes/admin.routes.js';
import deviceRoutes from './routes/device.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import devRoutes from './routes/dev.routes.js';
import { sendSuccess } from './utils/response.js';

import { redirectLegacy } from './middleware/redirectLegacy.js';
import v1Routes from './routes/v1.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.security.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(requestIdMiddleware);
  app.use(createHelmetMiddleware());
  app.use(requireHttpsMiddleware);
  app.use(cors({ origin: env.corsOrigin, credentials: false }));
  app.use(express.json({ limit: env.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.jsonBodyLimit }));
  app.use(prototypePollutionGuard);

  if (!env.isProduction) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  app.get('/', (_req, res) => {
    sendSuccess(res, {
      service: env.appName,
      version: env.appVersion,
      message: 'Pet Feeder Server is running. Use GET /v1/health for health check.'
    });
  });

  // Legacy redirect /api/* → /v1/*
  app.use(redirectLegacy);

  // V1 routes
  app.use('/v1', apiRateLimiter);
  app.use('/v1', v1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
