import { describe, it, expect } from 'vitest';
import {
  lcsLength,
  evaluateTimeline,
  evaluateEvidenceCoverage,
  evaluateFindings,
} from '../../src/services/evaluationService.js';

const answerKey = {
  classification: 'credential_stuffing',
  rootCause: 'weak_or_reused_password',
  entryPoint: 'vpn_portal',
  keyEvidenceIds: ['ev-01', 'ev-02'],
  attackChainEventIds: ['evt-02', 'evt-03', 'evt-05', 'evt-06'],
};

describe('timeline accuracy', () => {
  it('LCS of simple arrays', () => {
    expect(lcsLength(['a', 'b', 'c'], ['a', 'c'])).toBe(2);
    expect(lcsLength([], ['a'])).toBe(0);
  });
  it('perfect order scores 1', () => {
    expect(evaluateTimeline(['evt-02', 'evt-03', 'evt-05', 'evt-06'], answerKey.attackChainEventIds).accuracy).toBe(1);
  });
  it('reversed order scores low', () => {
    expect(evaluateTimeline(['evt-06', 'evt-05', 'evt-03', 'evt-02'], answerKey.attackChainEventIds).accuracy).toBe(0.25);
  });
  it('ignores events outside the attack chain', () => {
    const r = evaluateTimeline(['evt-01', 'evt-02', 'evt-04', 'evt-03', 'evt-05', 'evt-06'], answerKey.attackChainEventIds);
    expect(r.accuracy).toBe(1);
  });
  it('reports "not provided" when no timeline was saved', () => {
    expect(evaluateTimeline([], answerKey.attackChainEventIds)).toMatchObject({ provided: false, accuracy: null });
  });
});

describe('evidence coverage', () => {
  it('computes matched, missed, extra and ratio', () => {
    const c = evaluateEvidenceCoverage(['ev-01', 'ev-04'], ['ev-01', 'ev-02']);
    expect(c.matched).toEqual(['ev-01']);
    expect(c.missed).toEqual(['ev-02']);
    expect(c.extra).toEqual(['ev-04']);
    expect(c.ratio).toBe(0.5);
  });
});

describe('evaluateFindings', () => {
  const base = {
    classification: 'credential_stuffing',
    rootCause: 'weak_or_reused_password',
    entryPoint: 'vpn_portal',
    evidenceIds: ['ev-01'],
    reasoning: 'x'.repeat(20),
  };
  it('correct classification => no wrong-submission penalty', () => {
    const r = evaluateFindings({ findings: base, answerKey, timeline: [] });
    expect(r.classificationCorrect).toBe(true);
    expect(r.rootCauseCorrect).toBe(true);
    expect(r.wrongSubmissionCount).toBe(0);
  });
  it('incorrect classification => wrong submission counted once', () => {
    const r = evaluateFindings({ findings: { ...base, classification: 'brute_force_login' }, answerKey, timeline: [] });
    expect(r.classificationCorrect).toBe(false);
    expect(r.wrongSubmissionCount).toBe(1);
    expect(r.evaluation.classification).toMatchObject({ correct: false, expected: 'credential_stuffing' });
  });
  it('incorrect root cause is judged independently', () => {
    const r = evaluateFindings({ findings: { ...base, rootCause: 'missing_mfa' }, answerKey, timeline: [] });
    expect(r.rootCauseCorrect).toBe(false);
    expect(r.classificationCorrect).toBe(true);
  });
});
