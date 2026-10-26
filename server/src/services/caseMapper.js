// Maps a validated generated case (API/Gemini/demo shape, SPEC §9) to the Mongoose
// Case document shape (SPEC §8). Pure function: no I/O.
//
// Stable ids are stored as eventId / evidenceId / hintId so they never clash with
// Mongoose's `id` virtual; serializers map them back to `id`.

export function toCaseDocument(generated, { organizationTheme = '', source }) {
  return {
    title: generated.title,
    summary: generated.summary,
    category: generated.category,
    difficulty: generated.difficulty,
    organizationTheme,
    organization: {
      name: generated.organization.name,
      industry: generated.organization.industry,
      description: generated.organization.description,
    },
    objectives: [...generated.objectives],
    events: generated.events.map((e) => ({
      eventId: e.id,
      timestamp: new Date(e.timestamp),
      source: e.source,
      severity: e.severity,
      summary: e.summary,
      details: e.details ?? '',
    })),
    // Public stub: safe to show before discovery.
    evidence: generated.evidence.map((e) => ({ evidenceId: e.id, title: e.title, type: e.type })),
    source,

    // ---- private ----
    evidenceDetails: generated.evidence.map((e) => ({
      evidenceId: e.id,
      description: e.description,
      relatedEventIds: [...e.relatedEventIds],
    })),
    answerKey: {
      classification: generated.answerKey.classification,
      rootCause: generated.answerKey.rootCause,
      entryPoint: generated.answerKey.entryPoint,
      rootCauseExplanation: generated.answerKey.rootCauseExplanation,
      keyEvidenceIds: [...generated.answerKey.keyEvidenceIds],
      attackChainEventIds: [...generated.answerKey.attackChainEventIds],
    },
    hints: generated.hints.map((h) => ({ hintId: h.id, level: h.level, text: h.text })),
    explanation: generated.explanation,
    recommendations: [...generated.recommendations],
  };
}
