import { describe, it, expect } from 'vitest';
import { computeScore, computeProvisionalScore, SCORING } from '../../src/services/scoringService.js';

describe('scoringService.computeScore', () => {
  it('awards 100 for a correct classification only', () => {
    expect(computeScore({ classificationCorrect: true }).total).toBe(100);
  });

  it('awards 50 for a correct root cause only', () => {
    expect(computeScore({ rootCauseCorrect: true }).total).toBe(50);
  });

  it('awards 5 per unique evidence item', () => {
    expect(computeScore({ uniqueEvidenceCount: 3 }).total).toBe(15);
  });

  it('caps evidence points at 30 (6 items)', () => {
    expect(computeScore({ uniqueEvidenceCount: 6 }).evidencePoints).toBe(30);
    expect(computeScore({ uniqueEvidenceCount: 8 }).evidencePoints).toBe(30);
    expect(computeScore({ uniqueEvidenceCount: 999 }).total).toBe(30);
  });

  it('subtracts 10 per hint', () => {
    expect(computeScore({ classificationCorrect: true, hintCount: 2 }).total).toBe(80);
  });

  it('subtracts 15 per wrong submission', () => {
    expect(computeScore({ classificationCorrect: true, wrongSubmissionCount: 1 }).total).toBe(85);
  });

  it('never goes below 0', () => {
    const s = computeScore({ hintCount: 3, wrongSubmissionCount: 2 });
    expect(s.total).toBe(0);
    expect(s.hintPenalty).toBe(30); // components are still reported honestly
  });

  it('matches the documented formula for a mixed case', () => {
    const s = computeScore({
      classificationCorrect: true,
      rootCauseCorrect: true,
      uniqueEvidenceCount: 4,
      hintCount: 1,
      wrongSubmissionCount: 0,
    });
    expect(s.total).toBe(100 + 50 + 4 * 5 - 10); // 160
  });

  it('reports a self-consistent breakdown', () => {
    const s = computeScore({
      classificationCorrect: true,
      rootCauseCorrect: false,
      uniqueEvidenceCount: 5,
      hintCount: 2,
      wrongSubmissionCount: 1,
    });
    expect(s.total).toBe(
      Math.max(0, s.classificationPoints + s.rootCausePoints + s.evidencePoints - s.hintPenalty - s.wrongSubmissionPenalty),
    );
  });

  it('only awards answer points for exactly true (truthy values earn nothing)', () => {
    expect(computeScore({ classificationCorrect: 'yes', rootCauseCorrect: 1 }).total).toBe(0);
  });

  it('clamps negative, fractional and non-numeric counts', () => {
    expect(computeScore({ uniqueEvidenceCount: -4, hintCount: -1, wrongSubmissionCount: NaN }).total).toBe(0);
    expect(computeScore({ uniqueEvidenceCount: 2.9 }).uniqueEvidenceCount).toBe(2);
  });

  it('exposes the documented constants', () => {
    expect(SCORING).toMatchObject({
      CLASSIFICATION_POINTS: 100,
      ROOT_CAUSE_POINTS: 50,
      EVIDENCE_POINTS_EACH: 5,
      EVIDENCE_COUNT_CAP: 6,
      HINT_PENALTY: 10,
      WRONG_SUBMISSION_PENALTY: 15,
    });
  });
});

describe('computeProvisionalScore', () => {
  it('ignores answer points', () => {
    expect(computeProvisionalScore({ uniqueEvidenceCount: 4, hintCount: 1 })).toBe(10);
  });
  it('floors at 0', () => {
    expect(computeProvisionalScore({ uniqueEvidenceCount: 0, hintCount: 3 })).toBe(0);
  });
});
