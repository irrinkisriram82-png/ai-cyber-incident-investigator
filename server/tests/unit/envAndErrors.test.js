import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { createErrorHandler } from '../../src/middleware/errorHandler.js';
import { notFound } from '../../src/middleware/notFound.js';
import { ApiError } from '../../src/utils/apiError.js';
import { makeEnv } from '../helpers/env.js';

describe('loadEnv', () => {
  const base = { MONGODB_URI: 'mongodb://secret-user:secret-pass@db.example.test/x', NODE_ENV: 'test' };

  it('requires MONGODB_URI and names the variable but not its value', () => {
    expect(() => loadEnv({ NODE_ENV: 'test' })).toThrow(/MONGODB_URI/);
  });
  it('does not echo secret values in errors', () => {
    try {
      loadEnv({ ...base, PORT: 'not-a-number' });
    } catch (e) {
      expect(e.message).toMatch(/PORT/);
      expect(e.message).not.toContain('secret-pass');
    }
  });
  it('treats a placeholder Gemini key as "not configured"', () => {
    expect(loadEnv({ ...base, GEMINI_API_KEY: 'your_gemini_api_key_here' }).gemini.enabled).toBe(false);
    expect(loadEnv({ ...base }).gemini.enabled).toBe(false);
    expect(loadEnv({ ...base, GEMINI_API_KEY: 'AIza-real-looking-key-12345' }).gemini.enabled).toBe(true);
  });
  it('refuses a wildcard CORS origin', () => {
    expect(() => loadEnv({ ...base, CLIENT_URL: '*' })).toThrow(/explicit origin/);
  });
  it('parses several allowed origins', () => {
    const env = loadEnv({ ...base, CLIENT_URL: 'http://localhost:5173, https://app.example.test/' });
    expect(env.clientOrigins).toEqual(['http://localhost:5173', 'https://app.example.test']);
  });
});

function appThatThrows(err, opts) {
  const app = express();
  app.get('/boom', () => {
    throw err;
  });
  app.use(notFound);
  app.use(createErrorHandler({ silent: true, ...opts }));
  return app;
}

describe('centralised error handling', () => {
  it('returns a generic 500 in production without a stack or the real message', async () => {
    const res = await request(appThatThrows(new Error('db password is hunter2'), { isProduction: true })).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side' },
    });
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });
  it('includes the stack only in development', async () => {
    const res = await request(appThatThrows(new Error('oops'), { isDevelopment: true })).get('/boom');
    expect(res.body.error.stack).toBeDefined();
  });
  it('maps ApiError to its status and code', async () => {
    const res = await request(appThatThrows(new ApiError(409, 'CONFLICT', 'nope'), {})).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
  it('maps unknown routes to 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(appThatThrows(new Error('x'), {})).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
  it('makeEnv helper yields a test environment', () => {
    expect(makeEnv().isTest).toBe(true);
  });
});
