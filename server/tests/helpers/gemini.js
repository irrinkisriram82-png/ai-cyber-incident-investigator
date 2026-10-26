import { vi } from 'vitest';
import { buildDemoCase } from '../../src/services/demoCaseService.js';

/**
 * Mock of geminiService: returns a valid generated case as JSON text.
 * No API key, no network, no cost. Use `.plan()` to choose what the next calls return.
 */
export function makeGeminiMock() {
  let current = { category: 'suspicious_login', difficulty: 'medium', mutate: null, raw: null };
  const generateJson = vi.fn(async () => {
    if (current.raw !== null) return current.raw;
    const generated = buildDemoCase(current.category, current.difficulty);
    return JSON.stringify(current.mutate ? (current.mutate(generated) ?? generated) : generated);
  });
  return {
    generateJson,
    plan(next) {
      current = { ...current, raw: null, mutate: null, ...next };
    },
  };
}
