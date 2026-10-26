import { ApiError } from '../utils/apiError.js';

function formatIssues(target, error) {
  return error.issues.map((issue) => ({
    path: [target, ...issue.path].join('.'),
    message: issue.message,
  }));
}

/**
 * Validate params / query / body with Zod schemas.
 * Parsed (typed, defaulted, sanitised) values are placed on `req.valid`
 * - the original req.* objects are left untouched, which keeps this
 * compatible with both Express 4 and 5.
 */
export function validate({ params, query, body } = {}) {
  return (req, res, next) => {
    const valid = {};
    const targets = [
      ['params', params, req.params],
      ['query', query, req.query],
      ['body', body, req.body ?? {}],
    ];
    for (const [target, schema, value] of targets) {
      if (!schema) continue;
      const result = schema.safeParse(value);
      if (!result.success) {
        const code = target === 'params' ? 'INVALID_ID' : 'VALIDATION_ERROR';
        const message = target === 'params' ? 'Invalid identifier in URL' : 'Validation failed';
        return next(new ApiError(400, code, message, formatIssues(target, result.error)));
      }
      valid[target] = result.data;
    }
    req.valid = valid;
    return next();
  };
}
