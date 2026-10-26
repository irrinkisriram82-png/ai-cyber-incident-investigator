import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    pool: 'forks', // each test file gets its own process => its own mongoose connection
    testTimeout: 30_000,
    hookTimeout: 120_000, // first run may download a MongoDB binary for mongodb-memory-server
  },
});
