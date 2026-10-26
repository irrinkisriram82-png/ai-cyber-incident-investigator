import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiError.js';

function build({ windowMs, limit, message, skip }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip,
    handler: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', message)),
  });
}

/**
 * Three tiers (SPEC §12):
 *  - global:   lenient, covers everything except /health
 *  - generate: strict, protects the AI-backed case creation
 *  - mutation: moderate, for evidence/hint/timeline/submit
 */
export function createRateLimiters({ windowMs, globalMax, generateMax, mutationMax }) {
  return {
    global: build({
      windowMs,
      limit: globalMax,
      message: 'Too many requests. Please slow down and try again later.',
      skip: (req) => req.path === '/health',
    }),
    generate: build({
      windowMs,
      limit: generateMax,
      message: 'Case generation limit reached. Please wait a while before creating another case.',
    }),
    mutation: build({
      windowMs,
      limit: mutationMax,
      message: 'Too many actions in a short time. Please wait a moment and try again.',
    }),
  };
}
