import { ApiError } from '../utils/apiError.js';

function normalise(err) {
  if (err instanceof ApiError) return err;

  // body-parser errors
  if (err?.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Malformed JSON body');
  }
  // CORS rejection raised by our origin callback
  if (err?.code === 'CORS_ORIGIN_DENIED') {
    return new ApiError(403, 'CORS_ORIGIN_DENIED', 'Origin not allowed');
  }
  // Mongoose / MongoDB
  if (err?.name === 'CastError') {
    return new ApiError(400, 'INVALID_ID', 'Invalid identifier');
  }
  if (err?.name === 'ValidationError') {
    return new ApiError(400, 'VALIDATION_ERROR', 'Data validation failed');
  }
  if (err?.code === 11000) {
    return new ApiError(409, 'CONFLICT', 'Duplicate resource');
  }
  return null;
}

export function createErrorHandler({ isProduction = false, isDevelopment = false, silent = false } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    const known = normalise(err);

    if (known) {
      const body = { success: false, error: { code: known.code, message: known.message } };
      if (known.details !== undefined) body.error.details = known.details;
      return res.status(known.status).json(body);
    }

    // Unknown error -> 500. Never log request bodies or private data.
    if (!silent) {
      if (isProduction) console.error(`[error] ${err?.name ?? 'Error'}: ${err?.message ?? 'unknown'}`);
      else console.error('[error]', err);
    }

    const body = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction ? 'Something went wrong on our side' : String(err?.message ?? 'Internal error'),
      },
    };
    if (isDevelopment && err?.stack) body.error.stack = err.stack;
    return res.status(500).json(body);
  };
}
