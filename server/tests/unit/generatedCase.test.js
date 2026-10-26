import { describe, it, expect } from 'vitest';
import { validateGeneratedCase } from '../../src/validators/caseSchemas.js';
import { buildDemoCase, DEMO_CATEGORIES } from '../../src/services/demoCaseService.js';
import { DIFFICULTY_IDS } from '../../src/config/difficulty.js';

const fresh = (category = 'suspicious_login', difficulty = 'medium') => buildDemoCase(category, difficulty);
const paths = (r) => r.issues.map((i) => i.path);

describe('GeneratedCaseSchema + consistency checks', () => {
  it.each(DEMO_CATEGORIES.flatMap((c) => DIFFICULTY_IDS.map((d) => [c, d])))(
    'curated demo case %s / %s is valid',
    (category, difficulty) => {
      const r = validateGeneratedCase(fresh(category, difficulty), { category, difficulty });
      expect(r.issues ?? []).toEqual([]);
      expect(r.success).toBe(true);
    },
  );

  it('rejects a missing required field', () => {
    const c = fresh();
    delete c.title;
    const r = validateGeneratedCase(c);
    expect(r.success).toBe(false);
    expect(paths(r)).toContain('title');
  });

  it('rejects wrong types', () => {
    const c = fresh();
    c.events = 'not an array';
    expect(validateGeneratedCase(c).success).toBe(false);
  });

  it('rejects duplicate event ids', () => {
    const c = fresh();
    c.events[1].id = c.events[0].id;
    expect(validateGeneratedCase(c).success).toBe(false);
  });

  it('rejects the wrong number of evidence items for the difficulty', () => {
    const c = fresh('suspicious_login', 'hard');
    c.evidence = c.evidence.slice(0, 3);
    expect(paths(validateGeneratedCase(c))).toContain('evidence');
  });

  it('rejects the wrong number of hints', () => {
    const c = fresh('suspicious_login', 'easy');
    c.hints.push({ id: 'hint-03', level: 3, text: 'Look at the order in which things happened.' });
    expect(paths(validateGeneratedCase(c))).toContain('hints');
  });

  it('rejects non-chronological events', () => {
    const c = fresh();
    [c.events[0].timestamp, c.events[1].timestamp] = [c.events[1].timestamp, c.events[0].timestamp];
    const r = validateGeneratedCase(c);
    expect(r.success).toBe(false);
    expect(r.issues.some((i) => /chronological/i.test(i.message))).toBe(true);
  });

  it('rejects an invalid timestamp', () => {
    const c = fresh();
    c.events[0].timestamp = 'yesterday afternoon';
    expect(validateGeneratedCase(c).success).toBe(false);
  });

  it('rejects evidence that references an unknown event', () => {
    const c = fresh();
    c.evidence[0].relatedEventIds = ['evt-99'];
    expect(validateGeneratedCase(c).success).toBe(false);
  });

  it('rejects key evidence that is not in the evidence list', () => {
    const c = fresh();
    c.answerKey.keyEvidenceIds = ['ev-01', 'ev-99'];
    expect(validateGeneratedCase(c).success).toBe(false);
  });

  it('rejects a classification that does not belong to the category', () => {
    const c = fresh('suspicious_login', 'medium');
    c.answerKey.classification = 'malware_beaconing';
    expect(paths(validateGeneratedCase(c))).toContain('answerKey.classification');
  });

  it('rejects an unknown root cause', () => {
    const c = fresh();
    c.answerKey.rootCause = 'cosmic_rays';
    expect(validateGeneratedCase(c).success).toBe(false);
  });

  it('rejects a hint that gives the answer away', () => {
    const c = fresh();
    c.hints[0].text = `This is clearly ${c.answerKey.classification.replace(/_/g, ' ')} activity.`;
    const r = validateGeneratedCase(c);
    expect(r.success).toBe(false);
    expect(r.issues.some((i) => /reveals the answer/i.test(i.message))).toBe(true);
  });

  it('rejects empty explanation fields', () => {
    const c = fresh();
    c.explanation = '   ';
    expect(validateGeneratedCase(c).success).toBe(false);
  });

  it('rejects a case whose category or difficulty is not what was requested', () => {
    const c = fresh('suspicious_login', 'easy');
    expect(validateGeneratedCase(c, { category: 'data_exposure' }).success).toBe(false);
    expect(validateGeneratedCase(c, { difficulty: 'hard' }).success).toBe(false);
  });

  it('strips HTML from generated text instead of keeping it', () => {
    const c = fresh();
    c.title = '<b>Odd</b> sign-ins at the <script>alert(1)</script>VPN';
    const r = validateGeneratedCase(c);
    expect(r.success).toBe(true);
    expect(r.data.title).not.toMatch(/[<>]/);
  });
});
