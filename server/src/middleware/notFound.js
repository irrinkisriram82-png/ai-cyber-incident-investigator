import { ApiError } from '../utils/apiError.js';

export function notFound(req, res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', 'Route not found'));
}
