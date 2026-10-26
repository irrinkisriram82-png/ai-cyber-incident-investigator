import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createCaseRouter } from './routes/caseRoutes.js';
import { createHealthHandler } from './controllers/healthController.js';
import { createRateLimiters } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { createErrorHandler } from './middleware/errorHandler.js';

/**
 * Build the Express app. Kept separate from server.js so tests (Supertest) can
 * create an app without opening a port or connecting at import time.
 * `deps.gemini` lets tests inject a mock Gemini service (never hits the network).
 */
export function createApp(env, deps = {}) {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      // Explicit allow-list from CLIENT_URL. Requests with no Origin header
      // (curl, health probes, server-to-server) are not browser cross-origin calls.
      origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        const err = new Error('Origin not allowed');
        err.code = 'CORS_ORIGIN_DENIED';
        return callback(err);
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: env.bodyLimit }));
  app.use(requestLogger({ enabled: !env.isTest }));

  const limiters = createRateLimiters(env.rateLimit);
  app.use('/api', limiters.global);

  app.get('/api/health', createHealthHandler(env));
  app.use('/api/cases', createCaseRouter({ env, limiters, gemini: deps.gemini, logger: deps.logger }));

  app.use(notFound);
  app.use(
    createErrorHandler({
      isProduction: env.isProduction,
      isDevelopment: env.isDevelopment,
      silent: env.isTest,
    }),
  );

  return app;
}
