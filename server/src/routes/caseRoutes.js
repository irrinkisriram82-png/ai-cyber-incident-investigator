import { Router } from 'express';
import { createCaseController } from '../controllers/caseController.js';
import { validate } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  caseIdParam,
  createCaseBody,
  evidenceParams,
  listQuery,
  submitBody,
  timelineBody,
} from '../validators/caseSchemas.js';

/**
 * Routes for /api/cases (SPEC §7.2).
 * Rate limiters: strict on generation, moderate on every other mutation.
 */
export function createCaseRouter({ env, limiters, gemini, logger }) {
  const c = createCaseController({ env, gemini, logger });
  const router = Router();

  router.post('/', limiters.generate, validate({ body: createCaseBody }), asyncHandler(c.create));
  router.get('/', validate({ query: listQuery }), asyncHandler(c.list));
  router.get('/:id', validate({ params: caseIdParam }), asyncHandler(c.get));
  router.get('/:id/result', validate({ params: caseIdParam }), asyncHandler(c.result));

  router.post(
    '/:id/evidence/:evidenceId/discover',
    limiters.mutation,
    validate({ params: evidenceParams }),
    asyncHandler(c.discover),
  );
  router.post('/:id/hints', limiters.mutation, validate({ params: caseIdParam }), asyncHandler(c.hint));
  router.post(
    '/:id/timeline',
    limiters.mutation,
    validate({ params: caseIdParam, body: timelineBody }),
    asyncHandler(c.timeline),
  );
  router.post(
    '/:id/submit',
    limiters.mutation,
    validate({ params: caseIdParam, body: submitBody }),
    asyncHandler(c.submit),
  );

  return router;
}
