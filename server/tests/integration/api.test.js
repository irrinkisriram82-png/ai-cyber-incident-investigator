import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { startDb, clearDb, stopDb } from '../helpers/db.js';
import { makeTestApp, createCaseViaApi, discover, hint, submit, correctFindings } from '../helpers/api.js';
import { DIFFICULTY_CONFIG } from '../../src/config/difficulty.js';
import { Investigation } from '../../src/models/Investigation.js';

let ctx;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  ctx = makeTestApp();
});

const FAKE_ID = 'a'.repeat(24);

describe('GET /api/health', () => {
  it('reports status without secrets', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'connected', aiConfigured: true });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('test-key-0123456789');
    expect(text).not.toMatch(/mongodb(\+srv)?:\/\//);
  });
});

describe('POST /api/cases', () => {
  it.each(['easy', 'medium', 'hard'])('generates a %s case that matches the difficulty rules', async (difficulty) => {
    const { data } = await createCaseViaApi(ctx, { difficulty });
    const cfg = DIFFICULTY_CONFIG[difficulty];
    expect(data.case.difficulty).toBe(difficulty);
    expect(data.case.source).toBe('gemini');
    expect(data.case.isDemo).toBe(false);
    expect(data.fallbackUsed).toBe(false);
    expect(data.case.evidence.length).toBeGreaterThanOrEqual(cfg.evidence.min);
    expect(data.case.evidence.length).toBeLessThanOrEqual(cfg.evidence.max);
    expect(data.case.events.length).toBeGreaterThanOrEqual(cfg.events.min);
    expect(data.case.events.length).toBeLessThanOrEqual(cfg.events.max);
    expect(data.case.limits.hintLimit).toBe(cfg.hints);
    expect(data.investigation.status).toBe('active');
    expect(data.investigationId).toBe(data.investigation.id);
  });

  it.each([
    'suspicious_login',
    'phishing_simulation',
    'data_exposure',
    'malware_alert_simulation',
    'insider_access_anomaly',
  ])('supports category %s', async (category) => {
    const { data } = await createCaseViaApi(ctx, { category, difficulty: 'easy' });
    expect(data.case.category).toBe(category);
  });

  it('creates a clearly marked demo case on request, without calling Gemini', async () => {
    const res = await request(ctx.app).post('/api/cases').send({ category: 'data_exposure', difficulty: 'easy', useDemo: true });
    expect(res.status).toBe(201);
    expect(res.body.data.case).toMatchObject({ source: 'demo', isDemo: true });
    expect(res.body.data).toMatchObject({ fallbackUsed: false, fallbackReason: 'DEMO_REQUESTED' });
    expect(ctx.gemini.generateJson).not.toHaveBeenCalled();
  });

  it('falls back to a demo case when Gemini is down', async () => {
    ctx.gemini.generateJson.mockRejectedValue(Object.assign(new Error('down'), { kind: 'request', status: 503 }));
    const res = await request(ctx.app).post('/api/cases').send({ category: 'suspicious_login', difficulty: 'easy' });
    expect(res.status).toBe(201);
    expect(res.body.data.case.isDemo).toBe(true);
    expect(res.body.data).toMatchObject({ fallbackUsed: true, fallbackReason: 'AI_UNAVAILABLE' });
  });

  it('handles invalid Gemini output safely (retry once, then demo)', async () => {
    ctx.gemini.plan({ raw: '{"title": "incomplete"}' });
    const res = await request(ctx.app).post('/api/cases').send({ category: 'suspicious_login', difficulty: 'easy' });
    expect(res.status).toBe(201);
    expect(ctx.gemini.generateJson).toHaveBeenCalledTimes(2);
    expect(res.body.data).toMatchObject({ fallbackUsed: true, fallbackReason: 'AI_INVALID_OUTPUT' });
    expect(res.body.data.case.isDemo).toBe(true);
  });

  it('returns 502 when Gemini fails and fallback is disabled', async () => {
    const strict = makeTestApp({ AI_FALLBACK_ENABLED: 'false' });
    strict.gemini.plan({ raw: 'nonsense' });
    const res = await request(strict.app).post('/api/cases').send({ category: 'suspicious_login', difficulty: 'easy' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });

  it.each([
    [{ difficulty: 'easy' }, 'missing category'],
    [{ category: 'suspicious_login', difficulty: 'impossible' }, 'bad difficulty'],
    [{ category: 'suspicious_login', difficulty: 'easy', premise: 'x'.repeat(301) }, 'long premise'],
    [{ category: 'suspicious_login', difficulty: 'easy', organizationTheme: '' }, 'empty theme'],
  ])('rejects invalid body (%#: %s)', async (body) => {
    const res = await request(ctx.app).post('/api/cases').send(body);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(ctx.app).post('/api/cases').set('Content-Type', 'application/json').send('{"category":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an oversized body with 413', async () => {
    const res = await request(ctx.app)
      .post('/api/cases')
      .send({ category: 'suspicious_login', difficulty: 'easy', premise: 'a'.repeat(20_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rate-limits case generation', async () => {
    const limited = makeTestApp({ RATE_LIMIT_GENERATE_MAX: '2' });
    const body = { category: 'suspicious_login', difficulty: 'easy', useDemo: true };
    expect((await request(limited.app).post('/api/cases').send(body)).status).toBe(201);
    expect((await request(limited.app).post('/api/cases').send(body)).status).toBe(201);
    const third = await request(limited.app).post('/api/cases').send(body);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('GET /api/cases and /api/cases/:id', () => {
  it('lists cases newest-first with pagination and progress', async () => {
    for (let i = 0; i < 3; i += 1) await createCaseViaApi(ctx, { difficulty: 'easy' });
    const res = await request(ctx.app).get('/api/cases?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0]).toMatchObject({ status: 'active', score: null, progress: { discovered: 0 } });
    const page2 = await request(ctx.app).get('/api/cases?page=2&limit=2');
    expect(page2.body.data.items).toHaveLength(1);
  });

  it('rejects invalid pagination', async () => {
    expect((await request(ctx.app).get('/api/cases?page=0')).status).toBe(400);
    expect((await request(ctx.app).get('/api/cases?limit=500')).status).toBe(400);
  });

  it('returns a case and its investigation', async () => {
    const { id } = await createCaseViaApi(ctx);
    const res = await request(ctx.app).get(`/api/cases/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.case.id).toBe(id);
    expect(res.body.data.investigation.caseId).toBe(id);
  });

  it('404 for an unknown (well-formed) id, 400 for a malformed id', async () => {
    const missing = await request(ctx.app).get(`/api/cases/${FAKE_ID}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('CASE_NOT_FOUND');
    const bad = await request(ctx.app).get('/api/cases/not-an-id');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_ID');
  });
});

describe('evidence discovery', () => {
  it('reveals details once and awards points only once', async () => {
    const { id, data } = await createCaseViaApi(ctx);
    const evId = data.case.evidence[0].id;
    expect(data.case.evidence[0].description).toBeUndefined();

    const first = await discover(ctx, id, evId);
    expect(first.status).toBe(200);
    expect(first.body.data.alreadyDiscovered).toBe(false);
    expect(first.body.data.evidence.description).toBeTruthy();
    expect(first.body.data.investigation.provisionalScore).toBe(5);

    const again = await discover(ctx, id, evId);
    expect(again.status).toBe(200);
    expect(again.body.data.alreadyDiscovered).toBe(true);
    expect(again.body.data.investigation.provisionalScore).toBe(5);
    expect(again.body.data.investigation.discoveredEvidenceIds).toEqual([evId]);
  });

  it('survives concurrent duplicate discovery (reward granted once)', async () => {
    const { id, data } = await createCaseViaApi(ctx);
    const evId = data.case.evidence[0].id;
    const results = await Promise.all(Array.from({ length: 5 }, () => discover(ctx, id, evId)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r.body.data.alreadyDiscovered === false)).toHaveLength(1);
    const inv = await Investigation.findOne({ caseId: id }).lean();
    expect(inv.discoveredEvidenceIds).toEqual([evId]);
  });

  it('persists discovery across requests (refresh)', async () => {
    const { id, data } = await createCaseViaApi(ctx);
    await discover(ctx, id, data.case.evidence[1].id);
    const res = await request(ctx.app).get(`/api/cases/${id}`);
    expect(res.body.data.investigation.discoveredEvidenceIds).toEqual([data.case.evidence[1].id]);
    expect(res.body.data.case.evidence[1].discovered).toBe(true);
    expect(res.body.data.case.evidence[1].description).toBeTruthy();
    expect(res.body.data.case.evidence[0].discovered).toBe(false);
  });

  it('validates ids', async () => {
    const { id } = await createCaseViaApi(ctx);
    expect((await discover(ctx, id, 'ev-1')).status).toBe(400);
    expect((await discover(ctx, 'bad', 'ev-01')).status).toBe(400);
    const unknown = await discover(ctx, id, 'ev-99');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('EVIDENCE_NOT_FOUND');
    expect((await discover(ctx, FAKE_ID, 'ev-01')).status).toBe(404);
  });
});

describe('hints', () => {
  it('issues progressive hints, penalising each exactly once', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'medium' });
    await discover(ctx, id, data.case.evidence[0].id);
    await discover(ctx, id, data.case.evidence[1].id); // provisional = 10

    const h1 = await hint(ctx, id);
    expect(h1.status).toBe(200);
    expect(h1.body.data.hint.text).toBe(answer.hints[0].text);
    expect(h1.body.data.hintsUsed).toBe(1);
    expect(h1.body.data.hintsRemaining).toBe(2);
    expect(h1.body.data.investigation.provisionalScore).toBe(0); // 10 - 10

    const h2 = await hint(ctx, id);
    expect(h2.body.data.hint.text).toBe(answer.hints[1].text);
    expect(h2.body.data.investigation.hints).toHaveLength(2);
  });

  it('enforces the difficulty hint limit with 409', async () => {
    const { id } = await createCaseViaApi(ctx, { difficulty: 'easy' }); // 2 hints
    expect((await hint(ctx, id)).status).toBe(200);
    expect((await hint(ctx, id)).status).toBe(200);
    const third = await hint(ctx, id);
    expect(third.status).toBe(409);
    expect(third.body.error.code).toBe('HINT_LIMIT_REACHED');
    const inv = await Investigation.findOne({ caseId: id }).lean();
    expect(inv.hintsUsed).toHaveLength(2);
  });

  it('cannot exceed the limit with concurrent requests', async () => {
    const { id } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    const results = await Promise.all(Array.from({ length: 6 }, () => hint(ctx, id)));
    const inv = await Investigation.findOne({ caseId: id }).lean();
    expect(inv.hintsUsed.length).toBeLessThanOrEqual(2);
    expect(results.filter((r) => r.status === 200).length).toBe(inv.hintsUsed.length);
    expect(new Set(inv.hintsUsed).size).toBe(inv.hintsUsed.length); // never the same hint twice
  });

  it('404 for an unknown case', async () => {
    expect((await hint(ctx, FAKE_ID)).status).toBe(404);
  });
});

describe('timeline', () => {
  it('saves and restores a valid timeline', async () => {
    const { id, data } = await createCaseViaApi(ctx);
    const ids = [data.case.events[2].id, data.case.events[0].id];
    const res = await request(ctx.app).post(`/api/cases/${id}/timeline`).send({ eventIds: ids });
    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toEqual(ids);
    const get = await request(ctx.app).get(`/api/cases/${id}`);
    expect(get.body.data.investigation.timeline).toEqual(ids);
  });

  it('rejects duplicate, malformed and unknown event ids', async () => {
    const { id } = await createCaseViaApi(ctx);
    const post = (eventIds) => request(ctx.app).post(`/api/cases/${id}/timeline`).send({ eventIds });
    expect((await post(['evt-01', 'evt-01'])).status).toBe(400);
    expect((await post(['nope'])).status).toBe(400);
    expect((await post([])).status).toBe(400);
    expect((await post(['evt-99'])).status).toBe(400);
  });
});

describe('POST /api/cases/:id/submit', () => {
  it('scores a fully correct submission on the server', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'medium' });
    for (const e of data.case.evidence.slice(0, 3)) await discover(ctx, id, e.id);
    await hint(ctx, id);

    const keyIds = answer.answerKey.keyEvidenceIds.filter((k) => data.case.evidence.slice(0, 3).some((e) => e.id === k));
    const res = await submit(ctx, id, correctFindings(answer, keyIds.length ? keyIds : [data.case.evidence[0].id]));
    expect(res.status).toBe(200);
    expect(res.body.data.score).toMatchObject({
      classificationPoints: 100,
      rootCausePoints: 50,
      evidencePoints: 15,
      hintPenalty: 10,
      wrongSubmissionPenalty: 0,
      total: 155,
    });
    expect(res.body.data.evaluation.classification.correct).toBe(true);
  });

  it('penalises an incorrect classification and still reveals the truth afterwards', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    await discover(ctx, id, data.case.evidence[0].id);
    const wrong = { ...correctFindings(answer, [data.case.evidence[0].id]), classification: 'brute_force_login', rootCause: 'missing_mfa' };
    if (answer.answerKey.classification === 'brute_force_login') wrong.classification = 'credential_stuffing';
    if (answer.answerKey.rootCause === 'missing_mfa') wrong.rootCause = 'unpatched_software';
    const res = await submit(ctx, id, wrong);
    expect(res.status).toBe(200);
    expect(res.body.data.score).toMatchObject({ classificationPoints: 0, rootCausePoints: 0, wrongSubmissionPenalty: 15 });
    expect(res.body.data.score.total).toBe(0); // 5 - 15 floors at 0
    expect(res.body.data.evaluation.classification.expected).toBe(answer.answerKey.classification);
  });

  it('ignores any client-supplied score or correctness flags', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    await discover(ctx, id, data.case.evidence[0].id);
    const wrong = { ...correctFindings(answer, [data.case.evidence[0].id]), classification: 'malware_beaconing', score: 9999, correct: true };
    const res = await submit(ctx, id, wrong);
    expect(res.status).toBe(200);
    expect(res.body.data.score.total).toBeLessThan(100);
    expect(res.body.data.evaluation.classification.correct).toBe(false);
  });

  it('rejects evidence that was never discovered (422)', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx);
    const res = await submit(ctx, id, correctFindings(answer, [data.case.evidence[0].id]));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EVIDENCE_NOT_DISCOVERED');
    const get = await request(ctx.app).get(`/api/cases/${id}`);
    expect(get.body.data.investigation.status).toBe('active'); // nothing changed
  });

  it('validates the body', async () => {
    const { id } = await createCaseViaApi(ctx);
    expect((await submit(ctx, id, {})).status).toBe(400);
    expect((await submit(ctx, id, { classification: 'x' })).status).toBe(400);
  });

  it('accepts a submission only once and never changes the score afterwards', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    await discover(ctx, id, data.case.evidence[0].id);
    const body = correctFindings(answer, [data.case.evidence[0].id]);
    const first = await submit(ctx, id, body);
    expect(first.status).toBe(200);

    const second = await submit(ctx, id, { ...body, classification: 'brute_force_login' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_SUBMITTED');

    const result = await request(ctx.app).get(`/api/cases/${id}/result`);
    expect(result.body.data.score.total).toBe(first.body.data.score.total);
    const list = await request(ctx.app).get('/api/cases');
    expect(list.body.data.items[0]).toMatchObject({ status: 'submitted', score: first.body.data.score.total });
  });

  it('handles concurrent submissions: exactly one wins', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    await discover(ctx, id, data.case.evidence[0].id);
    const body = correctFindings(answer, [data.case.evidence[0].id]);
    const results = await Promise.all([submit(ctx, id, body), submit(ctx, id, body), submit(ctx, id, body)]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
  });

  it('blocks every mutation after submission', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    await discover(ctx, id, data.case.evidence[0].id);
    await submit(ctx, id, correctFindings(answer, [data.case.evidence[0].id]));

    for (const res of [
      await discover(ctx, id, data.case.evidence[1].id),
      await hint(ctx, id),
      await request(ctx.app).post(`/api/cases/${id}/timeline`).send({ eventIds: ['evt-01'] }),
    ]) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_SUBMITTED');
    }
  });
});

describe('GET /api/cases/:id/result', () => {
  it('is unavailable (409) before submission', async () => {
    const { id } = await createCaseViaApi(ctx);
    const res = await request(ctx.app).get(`/api/cases/${id}/result`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVESTIGATION_ACTIVE');
    expect(JSON.stringify(res.body)).not.toMatch(/rootCauseExplanation|attackChain/);
  });

  it('returns the full report after submission', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    await discover(ctx, id, data.case.evidence[0].id);
    await submit(ctx, id, correctFindings(answer, [data.case.evidence[0].id]));
    const res = await request(ctx.app).get(`/api/cases/${id}/result`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'submitted', explanation: answer.explanation });
    expect(res.body.data.recommendations).toEqual(answer.recommendations);
    expect(res.body.data.attackChain.map((e) => e.id)).toEqual(answer.answerKey.attackChainEventIds);
    expect(res.body.data.case.evidence.every((e) => e.discovered)).toBe(true);
  });

  it('404 for unknown case, 400 for malformed id', async () => {
    expect((await request(ctx.app).get(`/api/cases/${FAKE_ID}/result`)).status).toBe(404);
    expect((await request(ctx.app).get('/api/cases/xyz/result')).status).toBe(400);
  });
});

describe('misc', () => {
  it('unknown routes return a JSON 404', async () => {
    const res = await request(ctx.app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'ROUTE_NOT_FOUND' } });
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('only allows the configured CORS origin', async () => {
    const ok = await request(ctx.app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await request(ctx.app).get('/api/health').set('Origin', 'https://evil.example');
    expect(bad.status).toBe(403);
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
