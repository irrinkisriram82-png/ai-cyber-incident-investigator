// Operational (expected) errors carry an HTTP status and a stable machine code.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export const errors = {
  validation: (message = 'Validation failed', details) =>
    new ApiError(400, 'VALIDATION_ERROR', message, details),
  invalidId: (message = 'Invalid identifier', details) =>
    new ApiError(400, 'INVALID_ID', message, details),
  caseNotFound: () => new ApiError(404, 'CASE_NOT_FOUND', 'Case not found'),
  evidenceNotFound: () => new ApiError(404, 'EVIDENCE_NOT_FOUND', 'Evidence item not found in this case'),
  alreadySubmitted: () =>
    new ApiError(409, 'ALREADY_SUBMITTED', 'This investigation has already been submitted'),
  hintLimit: () => new ApiError(409, 'HINT_LIMIT_REACHED', 'No hints remaining for this case'),
  investigationActive: () =>
    new ApiError(409, 'INVESTIGATION_ACTIVE', 'The result is available only after you submit your findings'),
  conflict: () =>
    new ApiError(409, 'CONFLICT', 'The investigation was modified concurrently. Please retry.'),
  evidenceNotDiscovered: () =>
    new ApiError(422, 'EVIDENCE_NOT_DISCOVERED', 'You can only cite evidence you have discovered'),
  aiUnavailable: () =>
    new ApiError(502, 'AI_UNAVAILABLE', 'The AI service could not produce a valid case right now'),
};
