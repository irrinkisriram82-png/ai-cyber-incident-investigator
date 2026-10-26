import { describe, it, expect } from 'vitest';
import { ApiClientError, normalizeError } from '../src/services/api.js';

describe('normalizeError', () => {
  it('keeps the server error code, message, status and details', () => {
    const err = normalizeError({
      response: {
        status: 409,
        data: { success: false, error: { code: 'HINT_LIMIT_REACHED', message: 'No hints remaining for this case' } },
      },
    });
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ code: 'HINT_LIMIT_REACHED', status: 409, message: 'No hints remaining for this case' });
  });

  it('passes validation details through', () => {
    const details = [{ path: 'body.premise', message: 'Too long' }];
    const err = normalizeError({
      response: { status: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details } } },
    });
    expect(err.details).toEqual(details);
  });

  it('gives a friendly message for rate limiting', () => {
    const err = normalizeError({ response: { status: 429, data: 'Too Many Requests' } });
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.message).toMatch(/wait/i);
  });

  it('handles non-JSON server errors', () => {
    const err = normalizeError({ response: { status: 502, data: '<html>Bad gateway</html>' } });
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.message).not.toContain('<html>');
  });

  it('handles network failures and timeouts', () => {
    expect(normalizeError({ message: 'Network Error' }).code).toBe('NETWORK_ERROR');
    expect(normalizeError({ code: 'ECONNABORTED' }).code).toBe('TIMEOUT');
  });

  it('returns an existing ApiClientError unchanged', () => {
    const original = new ApiClientError({ code: 'X', message: 'y' });
    expect(normalizeError(original)).toBe(original);
  });
});
