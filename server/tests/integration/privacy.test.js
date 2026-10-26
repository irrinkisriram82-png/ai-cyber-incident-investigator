// Answer confidentiality (SPEC §12): nothing private may appear in ANY response before submission.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { startDb, clearDb, stopDb } from '../helpers/db.js';
import { makeTestApp, createCaseViaApi, discover, hint, submit, correctFindings } from '../helpers/api.js';
import { Case } from '../../src/models/Case.js';

let ctx;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  ctx = makeTestApp();
});

const FORBIDDEN_KEYS = ['answerKey', 'keyEvidenceIds', 'attackChainEventIds', 'rootCauseExplanation', 'evidenceDetails', 'recommendations', 'explanation'];

/** Recursively collect every key name in a JSON value. */
function allKeys(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      allKeys(v, out);
    }
  }
  return out;
}

function assertNoLeak(res, answer, { issuedHints = 0, discoveredIds = [] } = {}) {
  const text = JSON.stringify(res.body);
  const keys = allKeys(res.body);
  for (const k of FORBIDDEN_KEYS) expect(keys.has(k), `response leaks key "${k}"`).toBe(false);

  // private VALUES (long free text is safe to search for verbatim)
  expect(text).not.toContain(answer.answerKey.rootCauseExplanation);
  expect(text).not.toContain(answer.explanation);
  for (const r of answer.recommendations) expect(text).not.toContain(r);

  // hints that were not issued
  answer.hints.slice(issuedHints).forEach((h) => expect(text, `un-issued hint leaked: ${h.id}`).not.toContain(h.text));

  // descriptions of evidence that is still locked
  answer.evidence
    .filter((e) => !discoveredIds.includes(e.id))
    .forEach((e) => expect(text, `locked evidence leaked: ${e.id}`).not.toContain(e.description));
}

describe('no private data before submission', () => {
  it('create, get and list responses expose nothing private', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'hard' });
    assertNoLeak({ body: data }, answer);
    assertNoLeak(await request(ctx.app).get(`/api/cases/${id}`), answer);
    assertNoLeak(await request(ctx.app).get('/api/cases'), answer);
  });

  it('discovering one item reveals only that item', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx);
    const evId = data.case.evidence[0].id;
    const res = await discover(ctx, id, evId);
    assertNoLeak(res, answer, { discoveredIds: [evId] });
    assertNoLeak(await request(ctx.app).get(`/api/cases/${id}`), answer, { discoveredIds: [evId] });
  });

  it('hints are revealed one at a time', async () => {
    const { id, answer } = await createCaseViaApi(ctx, { difficulty: 'medium' });
    const res = await hint(ctx, id);
    assertNoLeak(res, answer, { issuedHints: 1 });
    assertNoLeak(await request(ctx.app).get(`/api/cases/${id}`), answer, { issuedHints: 1 });
  });

  it('timeline and failed submissions leak nothing', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx);
    assertNoLeak(await request(ctx.app).post(`/api/cases/${id}/timeline`).send({ eventIds: [data.case.events[0].id] }), answer);
    assertNoLeak(await submit(ctx, id, correctFindings(answer, [data.case.evidence[0].id])), answer); // 422: not discovered
    assertNoLeak(await request(ctx.app).get(`/api/cases/${id}/result`), answer); // 409
    assertNoLeak(await request(ctx.app).post(`/api/cases/${id}/submit`).send({ nonsense: true }), answer);
  });

  it('options lists are identical for every case, so they cannot reveal the answer', async () => {
    const a = await createCaseViaApi(ctx, { category: 'suspicious_login', difficulty: 'easy' });
    const b = await createCaseViaApi(ctx, { category: 'data_exposure', difficulty: 'hard' });
    expect(a.data.case.options).toEqual(b.data.case.options);
  });

  it('the Mongoose document never serialises private fields, even if returned by mistake', async () => {
    const { id } = await createCaseViaApi(ctx);
    const plain = await Case.findById(id).select('+answerKey +hints +evidenceDetails +explanation +recommendations');
    const json = JSON.parse(JSON.stringify(plain));
    for (const k of FORBIDDEN_KEYS.concat('hints')) expect(json).not.toHaveProperty(k);
  });

  it('default queries do not even load private fields', async () => {
    const { id } = await createCaseViaApi(ctx);
    const doc = await Case.findById(id).lean();
    for (const k of ['answerKey', 'hints', 'evidenceDetails', 'explanation', 'recommendations']) {
      expect(doc[k]).toBeUndefined();
    }
  });

  it('the answer is revealed only after submission', async () => {
    const { id, data, answer } = await createCaseViaApi(ctx, { difficulty: 'easy' });
    await discover(ctx, id, data.case.evidence[0].id);
    const res = await submit(ctx, id, correctFindings(answer, [data.case.evidence[0].id]));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain(answer.answerKey.rootCauseExplanation);
  });
});
