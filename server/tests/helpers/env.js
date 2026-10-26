import { loadEnv } from '../../src/config/env.js';

/** A valid test environment. Rate limits are high so ordinary tests never hit them. */
export function makeEnv(overrides = {}) {
  return loadEnv({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/unused-in-unit-tests',
    CLIENT_URL: 'http://localhost:5173',
    GEMINI_API_KEY: 'test-key-0123456789', // fake: Gemini is always mocked
    RATE_LIMIT_GENERATE_MAX: '1000',
    RATE_LIMIT_MUTATION_MAX: '1000',
    RATE_LIMIT_GLOBAL_MAX: '5000',
    ...overrides,
  });
}
