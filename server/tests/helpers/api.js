import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { makeEnv } from './env.js';
import { makeGeminiMock } from './gemini.js';
import { buildDemoCase } from '../../src/services/demoCaseService.js';

const silentLogger = { warn() {}, error() {}, log() {} };

export function makeTestApp(envOverrides = {}) {
  const env = makeEnv(envOverrides);
  const gemini = makeGeminiMock();
  const app = createApp(env, { gemini, logger: silentLogger });
  return { app, gemini, env };
}

/** Create a case through the real API. Returns the response `data` and the (test-only) answer. */
export async function createCaseViaApi(ctx, { category = 'suspicious_login', difficulty = 'medium', ...rest } = {}) {
  ctx.gemini.plan({ category, difficulty });
  const res = await request(ctx.app)
    .post('/api/cases')
    .send({ category, difficulty, organizationTheme: 'Test university', ...rest });
  expect(res.status).toBe(201);
  return { data: res.body.data, answer: buildDemoCase(category, difficulty), id: res.body.data.case.id };
}

export const discover = (ctx, id, evidenceId) =>
  request(ctx.app).post(`/api/cases/${id}/evidence/${evidenceId}/discover`);

export const hint = (ctx, id) => request(ctx.app).post(`/api/cases/${id}/hints`);

export const submit = (ctx, id, body) => request(ctx.app).post(`/api/cases/${id}/submit`).send(body);

/** A fully correct submission for the answer key, citing the given evidence ids. */
export function correctFindings(answer, evidenceIds = answer.answerKey.keyEvidenceIds) {
  return {
    classification: answer.answerKey.classification,
    rootCause: answer.answerKey.rootCause,
    entryPoint: answer.answerKey.entryPoint,
    evidenceIds,
    reasoning: 'The evidence points to this classification and root cause.',
  };
}
