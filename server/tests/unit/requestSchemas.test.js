import { describe, it, expect } from 'vitest';
import {
  caseIdParam,
  evidenceParams,
  listQuery,
  createCaseBody,
  timelineBody,
  submitBody,
} from '../../src/validators/caseSchemas.js';

describe('route parameter validation', () => {
  it('accepts a 24-hex ObjectId', () => {
    expect(caseIdParam.safeParse({ id: 'a'.repeat(24) }).success).toBe(true);
  });
  it.each(['123', 'zzzzzzzzzzzzzzzzzzzzzzzz', '', 'a'.repeat(25), '../etc/passwd'])('rejects invalid case id %j', (id) => {
    expect(caseIdParam.safeParse({ id }).success).toBe(false);
  });
  it.each(['ev-1', 'ev-001', 'evt-01', 'EV-01', '$ne', 'ev-0a'])('rejects invalid evidence id %j', (evidenceId) => {
    expect(evidenceParams.safeParse({ id: 'a'.repeat(24), evidenceId }).success).toBe(false);
  });
  it('accepts a valid evidence id', () => {
    expect(evidenceParams.safeParse({ id: 'a'.repeat(24), evidenceId: 'ev-03' }).success).toBe(true);
  });
});

describe('listQuery', () => {
  it('applies defaults', () => {
    expect(listQuery.parse({})).toEqual({ page: 1, limit: 10 });
  });
  it('coerces strings', () => {
    expect(listQuery.parse({ page: '2', limit: '5' })).toEqual({ page: 2, limit: 5 });
  });
  it.each([{ page: '0' }, { page: '-1' }, { limit: '0' }, { limit: '51' }, { page: 'abc' }])('rejects %j', (q) => {
    expect(listQuery.safeParse(q).success).toBe(false);
  });
});

describe('createCaseBody', () => {
  const valid = { category: 'suspicious_login', difficulty: 'easy' };
  it('fills defaults', () => {
    const r = createCaseBody.parse(valid);
    expect(r.organizationTheme).toBe('Regional university');
    expect(r.useDemo).toBe(false);
  });
  it('rejects unknown category or difficulty', () => {
    expect(createCaseBody.safeParse({ ...valid, category: 'sql_injection' }).success).toBe(false);
    expect(createCaseBody.safeParse({ ...valid, difficulty: 'nightmare' }).success).toBe(false);
  });
  it('rejects a premise over 300 characters', () => {
    expect(createCaseBody.safeParse({ ...valid, premise: 'a'.repeat(301) }).success).toBe(false);
    expect(createCaseBody.safeParse({ ...valid, premise: 'a'.repeat(300) }).success).toBe(true);
  });
  it('rejects an organisation theme that is too short or too long', () => {
    expect(createCaseBody.safeParse({ ...valid, organizationTheme: 'a' }).success).toBe(false);
    expect(createCaseBody.safeParse({ ...valid, organizationTheme: 'a'.repeat(61) }).success).toBe(false);
  });
  it('strips HTML from free text', () => {
    const r = createCaseBody.parse({ ...valid, premise: '<script>alert(1)</script>A quiet campus', organizationTheme: '<b>Acme</b> Labs' });
    expect(r.premise).not.toMatch(/[<>]/);
    expect(r.organizationTheme).toBe('Acme Labs');
  });
  it('drops unknown keys', () => {
    const r = createCaseBody.parse({ ...valid, isAdmin: true, score: 9999 });
    expect(r).not.toHaveProperty('isAdmin');
    expect(r).not.toHaveProperty('score');
  });
  it('rejects a non-boolean useDemo', () => {
    expect(createCaseBody.safeParse({ ...valid, useDemo: 'yes' }).success).toBe(false);
  });
});

describe('timelineBody', () => {
  it('accepts unique valid ids', () => {
    expect(timelineBody.safeParse({ eventIds: ['evt-01', 'evt-02'] }).success).toBe(true);
  });
  it('rejects empty, duplicate and malformed ids', () => {
    expect(timelineBody.safeParse({ eventIds: [] }).success).toBe(false);
    expect(timelineBody.safeParse({ eventIds: ['evt-01', 'evt-01'] }).success).toBe(false);
    expect(timelineBody.safeParse({ eventIds: ['event-1'] }).success).toBe(false);
  });
  it('rejects more than 14 ids', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `evt-${String(i + 1).padStart(2, '0')}`);
    expect(timelineBody.safeParse({ eventIds: ids }).success).toBe(false);
  });
});

describe('submitBody', () => {
  const valid = {
    classification: 'credential_stuffing',
    rootCause: 'missing_mfa',
    entryPoint: 'vpn_portal',
    evidenceIds: ['ev-01'],
    reasoning: 'Many failed logins then one success.',
  };
  it('accepts a valid submission', () => {
    expect(submitBody.safeParse(valid).success).toBe(true);
  });
  it.each([
    ['classification', 'made_up'],
    ['rootCause', 'made_up'],
    ['entryPoint', 'made_up'],
    ['evidenceIds', []],
    ['evidenceIds', ['ev-01', 'ev-01']],
    ['evidenceIds', ['x']],
    ['reasoning', 'short'],
    ['reasoning', 'a'.repeat(1001)],
  ])('rejects invalid %s = %j', (field, value) => {
    expect(submitBody.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });
  it('ignores a client-supplied score or correctness flag', () => {
    const r = submitBody.parse({ ...valid, score: 9999, correct: true, finalScore: 1 });
    expect(r).not.toHaveProperty('score');
    expect(r).not.toHaveProperty('correct');
    expect(r).not.toHaveProperty('finalScore');
  });
});
