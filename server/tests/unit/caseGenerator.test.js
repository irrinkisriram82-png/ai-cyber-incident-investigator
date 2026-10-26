import { describe, it, expect, vi } from 'vitest';
import { generateCase, parseModelJson } from '../../src/services/caseGeneratorService.js';
import { GeminiError } from '../../src/services/geminiService.js';
import { buildDemoCase } from '../../src/services/demoCaseService.js';
import { makeEnv } from '../helpers/env.js';

const input = { category: 'phishing_simulation', difficulty: 'easy', organizationTheme: 'Test college', useDemo: false };
const goodJson = () => JSON.stringify(buildDemoCase(input.category, input.difficulty));
const logger = () => ({ warn: vi.fn() });
const geminiWith = (...steps) => {
  const fn = vi.fn();
  steps.forEach((s) => fn.mockImplementationOnce(async () => (s instanceof Error ? Promise.reject(s) : s)));
  return { generateJson: fn };
};

describe('parseModelJson', () => {
  it('parses plain JSON and strips markdown fences', () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('throws on invalid JSON', () => {
    expect(() => parseModelJson('not json')).toThrow();
  });
});

describe('generateCase', () => {
  it('accepts valid Gemini output (one call)', async () => {
    const gemini = geminiWith(goodJson());
    const r = await generateCase(input, { env: makeEnv(), gemini, logger: logger() });
    expect(r).toMatchObject({ source: 'gemini', fallbackUsed: false, fallbackReason: null });
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
  });

  it('accepts JSON wrapped in a code fence', async () => {
    const r = await generateCase(input, {
      env: makeEnv(),
      gemini: geminiWith('```json\n' + goodJson() + '\n```'),
      logger: logger(),
    });
    expect(r.source).toBe('gemini');
  });

  it('retries ONCE after invalid JSON, then falls back to a demo case', async () => {
    const gemini = geminiWith('garbage', 'still garbage', goodJson()); // third value must never be used
    const r = await generateCase(input, { env: makeEnv(), gemini, logger: logger() });
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({ source: 'demo', fallbackUsed: true, fallbackReason: 'AI_INVALID_OUTPUT' });
  });

  it('retries once after a schema failure and succeeds if the second answer is valid', async () => {
    const bad = JSON.parse(goodJson());
    delete bad.explanation;
    const gemini = geminiWith(JSON.stringify(bad), goodJson());
    const r = await generateCase(input, { env: makeEnv(), gemini, logger: logger() });
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    expect(r.source).toBe('gemini');
  });

  it('falls back when Zod/consistency validation keeps failing', async () => {
    const bad = JSON.parse(goodJson());
    bad.answerKey.keyEvidenceIds = ['ev-99', 'ev-98'];
    const gemini = geminiWith(JSON.stringify(bad), JSON.stringify(bad));
    const r = await generateCase(input, { env: makeEnv(), gemini, logger: logger() });
    expect(r).toMatchObject({ source: 'demo', fallbackReason: 'AI_INVALID_OUTPUT' });
  });

  it('falls back to a demo case when Gemini is unavailable (server error)', async () => {
    const err = new GeminiError('request', 'down', 503);
    const gemini = geminiWith(err, err);
    const r = await generateCase(input, { env: makeEnv(), gemini, logger: logger() });
    expect(r).toMatchObject({ source: 'demo', fallbackUsed: true, fallbackReason: 'AI_UNAVAILABLE' });
  });

  it('does not retry on quota/auth errors or timeouts', async () => {
    const quota = geminiWith(new GeminiError('request', 'quota', 429));
    await generateCase(input, { env: makeEnv(), gemini: quota, logger: logger() });
    expect(quota.generateJson).toHaveBeenCalledTimes(1);

    const slow = geminiWith(new GeminiError('timeout', 'slow'));
    await generateCase(input, { env: makeEnv(), gemini: slow, logger: logger() });
    expect(slow.generateJson).toHaveBeenCalledTimes(1);
  });

  it('throws 502 AI_UNAVAILABLE when fallback is disabled', async () => {
    const env = makeEnv({ AI_FALLBACK_ENABLED: 'false' });
    const gemini = geminiWith('garbage', 'garbage');
    await expect(generateCase(input, { env, gemini, logger: logger() })).rejects.toMatchObject({
      status: 502,
      code: 'AI_UNAVAILABLE',
    });
  });

  it('uses a demo case without calling Gemini when no key is configured', async () => {
    const gemini = geminiWith(goodJson());
    const r = await generateCase(input, { env: makeEnv({ GEMINI_API_KEY: '' }), gemini, logger: logger() });
    expect(gemini.generateJson).not.toHaveBeenCalled();
    expect(r).toMatchObject({ source: 'demo', fallbackReason: 'AI_NOT_CONFIGURED' });
  });

  it('uses a demo case without calling Gemini when useDemo is set', async () => {
    const gemini = geminiWith(goodJson());
    const r = await generateCase({ ...input, useDemo: true }, { env: makeEnv(), gemini, logger: logger() });
    expect(gemini.generateJson).not.toHaveBeenCalled();
    expect(r).toMatchObject({ source: 'demo', fallbackUsed: false, fallbackReason: 'DEMO_REQUESTED' });
  });

  it('never logs the generated answer key', async () => {
    const bad = JSON.parse(goodJson());
    bad.answerKey.rootCauseExplanation = 'SECRET-ROOT-CAUSE-TEXT-FOR-LOG-CHECK';
    bad.events = []; // invalid
    const log = logger();
    await generateCase(input, { env: makeEnv(), gemini: geminiWith(JSON.stringify(bad), JSON.stringify(bad)), logger: log });
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('SECRET-ROOT-CAUSE-TEXT-FOR-LOG-CHECK');
  });
});
