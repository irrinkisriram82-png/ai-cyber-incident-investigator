// Pure evaluation helpers: compare a player's findings with the answer key.
// Feedback-only metrics (evidence coverage, timeline accuracy, entry point) award
// no points in v1 - see SPEC §11.2.

/** Length of the longest common subsequence of two arrays. */
export function lcsLength(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Timeline accuracy = LCS(player's order restricted to chain events, expected chain) / chain length.
 * Returns provided=false / accuracy=null when no timeline was saved.
 */
export function evaluateTimeline(playerTimeline, expectedChain) {
  if (!Array.isArray(playerTimeline) || playerTimeline.length === 0) {
    return { provided: false, accuracy: null, expectedOrder: expectedChain, playerOrder: [] };
  }
  const chain = new Set(expectedChain);
  const playerChainOrder = playerTimeline.filter((id) => chain.has(id));
  const accuracy = expectedChain.length === 0 ? 0 : lcsLength(playerChainOrder, expectedChain) / expectedChain.length;
  return {
    provided: true,
    accuracy: Math.round(accuracy * 100) / 100,
    expectedOrder: expectedChain,
    playerOrder: playerTimeline,
  };
}

/** How well the cited evidence matches the key evidence. */
export function evaluateEvidenceCoverage(selectedIds, keyEvidenceIds) {
  const selected = new Set(selectedIds);
  const key = new Set(keyEvidenceIds);
  const matched = keyEvidenceIds.filter((id) => selected.has(id));
  const missed = keyEvidenceIds.filter((id) => !selected.has(id));
  const extra = selectedIds.filter((id) => !key.has(id));
  return {
    keyEvidenceIds: [...keyEvidenceIds],
    selectedIds: [...selectedIds],
    matched,
    missed,
    extra,
    ratio: key.size === 0 ? 0 : Math.round((matched.length / key.size) * 100) / 100,
  };
}

/**
 * Evaluate submitted findings against the answer key.
 * wrongSubmissionCount is 1 when the CLASSIFICATION is wrong, else 0 (SPEC §11.2).
 */
export function evaluateFindings({ findings, answerKey, timeline }) {
  const classificationCorrect = findings.classification === answerKey.classification;
  const rootCauseCorrect = findings.rootCause === answerKey.rootCause;
  const entryPointCorrect = findings.entryPoint === answerKey.entryPoint;

  return {
    classificationCorrect,
    rootCauseCorrect,
    wrongSubmissionCount: classificationCorrect ? 0 : 1,
    evaluation: {
      classification: { correct: classificationCorrect, submitted: findings.classification, expected: answerKey.classification },
      rootCause: { correct: rootCauseCorrect, submitted: findings.rootCause, expected: answerKey.rootCause },
      entryPoint: { correct: entryPointCorrect, submitted: findings.entryPoint, expected: answerKey.entryPoint },
      evidenceCoverage: evaluateEvidenceCoverage(findings.evidenceIds, answerKey.keyEvidenceIds),
      timeline: evaluateTimeline(timeline, answerKey.attackChainEventIds),
    },
  };
}
