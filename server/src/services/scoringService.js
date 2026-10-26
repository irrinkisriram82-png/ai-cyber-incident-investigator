// The ONLY place where scores are computed (SPEC §11.2). Pure functions, no I/O.
// Never trust a client-supplied score or correctness flag.

export const SCORING = Object.freeze({
  CLASSIFICATION_POINTS: 100,
  ROOT_CAUSE_POINTS: 50,
  EVIDENCE_POINTS_EACH: 5,
  EVIDENCE_COUNT_CAP: 6, // => at most +30
  HINT_PENALTY: 10,
  WRONG_SUBMISSION_PENALTY: 15,
});

const nonNegInt = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/**
 * score = max(0, classificationPoints + rootCausePoints
 *                + min(uniqueEvidenceCount, 6) * 5
 *                - hintCount * 10 - wrongSubmissionCount * 15)
 */
export function computeScore({
  classificationCorrect = false,
  rootCauseCorrect = false,
  uniqueEvidenceCount = 0,
  hintCount = 0,
  wrongSubmissionCount = 0,
} = {}) {
  const evidenceCount = nonNegInt(uniqueEvidenceCount);
  const hints = nonNegInt(hintCount);
  const wrong = nonNegInt(wrongSubmissionCount);

  const classificationPoints = classificationCorrect === true ? SCORING.CLASSIFICATION_POINTS : 0;
  const rootCausePoints = rootCauseCorrect === true ? SCORING.ROOT_CAUSE_POINTS : 0;
  const evidencePoints = Math.min(evidenceCount, SCORING.EVIDENCE_COUNT_CAP) * SCORING.EVIDENCE_POINTS_EACH;
  const hintPenalty = hints * SCORING.HINT_PENALTY;
  const wrongSubmissionPenalty = wrong * SCORING.WRONG_SUBMISSION_PENALTY;

  const total = Math.max(
    0,
    classificationPoints + rootCausePoints + evidencePoints - hintPenalty - wrongSubmissionPenalty,
  );

  return {
    classificationPoints,
    rootCausePoints,
    evidencePoints,
    hintPenalty,
    wrongSubmissionPenalty,
    uniqueEvidenceCount: evidenceCount,
    hintCount: hints,
    wrongSubmissionCount: wrong,
    total,
  };
}

/** Live score shown during the investigation: answer points are not yet awarded. */
export function computeProvisionalScore({ uniqueEvidenceCount = 0, hintCount = 0 } = {}) {
  return computeScore({ uniqueEvidenceCount, hintCount }).total;
}
