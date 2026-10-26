// End-to-end acceptance test for SPEC §15: create -> investigate -> hint -> timeline -> submit -> result.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startDb, clearDb, stopDb } from '../helpers/db.js';
import { makeTestApp, createCaseViaApi, discover, hint, submit, correctFindings } from '../helpers/api.js';

beforeAll(async () => {
  await startDb();
  await clearDb();
});
afterAll(stopDb);

describe('complete investigation flow (Gemini mocked)', () => {
  it('create -> discover -> hint -> timeline -> submit -> result, with a consistent score', async () => {
    const ctx = makeTestApp();

    // 1. create (hard, so there are plenty of events/evidence)
    const { id, data, answer } = await createCaseViaApi(ctx, { category: 'phishing_simulation', difficulty: 'hard' });
    expect(data.investigation.provisionalScore).toBe(0);
    expect(data.case.evidence.every((e) => e.discovered === false)).toBe(true);

    // 2. discover EVERY evidence item (hard has 7-8, so the +30 cap of 6 items is exercised)
    const toDiscover = data.case.evidence.map((e) => e.id);
    expect(toDiscover.length).toBeGreaterThan(6);
    for (const evId of toDiscover) {
      const r = await discover(ctx, id, evId);
      expect(r.status).toBe(200);
      expect(r.body.data.alreadyDiscovered).toBe(false);
    }

    // 3. one hint
    const h = await hint(ctx, id);
    expect(h.status).toBe(200);
    expect(h.body.data.hintsRemaining).toBe(2);

    // 4. perfect timeline
    const tl = await request(ctx.app).post(`/api/cases/${id}/timeline`).send({ eventIds: answer.answerKey.attackChainEventIds });
    expect(tl.status).toBe(200);

    // 5. refresh: state restored from the database
    const refreshed = await request(ctx.app).get(`/api/cases/${id}`);
    expect(refreshed.body.data.investigation).toMatchObject({
      status: 'active',
      hintsUsed: 1,
      timeline: answer.answerKey.attackChainEventIds,
    });
    expect(refreshed.body.data.investigation.discoveredEvidenceIds).toHaveLength(toDiscover.length);

    // 6. result is not available yet
    expect((await request(ctx.app).get(`/api/cases/${id}/result`)).status).toBe(409);

    // 7. submit a correct report
    const res = await submit(ctx, id, correctFindings(answer));
    expect(res.status).toBe(200);
    const expectedEvidencePoints = Math.min(toDiscover.length, 6) * 5;
    expect(res.body.data.score.total).toBe(100 + 50 + expectedEvidencePoints - 10);
    expect(res.body.data.evaluation.evidenceCoverage.ratio).toBe(1);
    expect(res.body.data.evaluation.timeline).toMatchObject({ provided: true, accuracy: 1 });
    expect(res.body.data.evaluation.entryPoint.correct).toBe(true);

    // 8. result matches the submit response and is stable
    const result = await request(ctx.app).get(`/api/cases/${id}/result`);
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual(res.body.data);

    // 9. dashboard shows the completed case with its score
    const list = await request(ctx.app).get('/api/cases');
    expect(list.body.data.items[0]).toMatchObject({ id, status: 'submitted', score: res.body.data.score.total });

    // 10. the player can start another case
    const next = await createCaseViaApi(ctx, { difficulty: 'easy' });
    expect(next.id).not.toBe(id);
  });
});
