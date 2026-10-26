// Whitelist serializers: the PRIMARY defence for answer confidentiality (SPEC §12).
// Every field that leaves the server is listed here explicitly - nothing is spread
// or copied wholesale from a database document.

import { publicOptions } from '../config/taxonomy.js';
import { hintLimitFor } from '../config/difficulty.js';
import { computeProvisionalScore } from '../services/scoringService.js';

const iso = (d) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);

export function serializeEvent(e) {
  return {
    id: e.eventId,
    timestamp: iso(e.timestamp),
    source: e.source,
    severity: e.severity,
    summary: e.summary,
    details: e.details ?? '',
  };
}

/**
 * Public view of a case.
 * Evidence description / relatedEventIds are included ONLY for discovered items
 * (or all items when `revealAll` is true, which is used for the post-submission report).
 *
 * @param {object} caseDoc  lean Case; `evidenceDetails` must be loaded when anything is revealed
 * @param {{discoveredEvidenceIds?: string[], revealAll?: boolean}} [opts]
 */
export function toPublicCase(caseDoc, { discoveredEvidenceIds = [], revealAll = false } = {}) {
  const discovered = new Set(discoveredEvidenceIds);
  const details = new Map((caseDoc.evidenceDetails ?? []).map((d) => [d.evidenceId, d]));

  const evidence = (caseDoc.evidence ?? []).map((stub) => {
    const isOpen = revealAll || discovered.has(stub.evidenceId);
    const item = { id: stub.evidenceId, title: stub.title, type: stub.type, discovered: isOpen };
    if (isOpen) {
      const d = details.get(stub.evidenceId);
      item.description = d?.description ?? '';
      item.relatedEventIds = d?.relatedEventIds ?? [];
    }
    return item;
  });

  return {
    id: String(caseDoc._id),
    title: caseDoc.title,
    summary: caseDoc.summary,
    category: caseDoc.category,
    difficulty: caseDoc.difficulty,
    source: caseDoc.source,
    isDemo: caseDoc.source === 'demo',
    organization: {
      name: caseDoc.organization?.name,
      industry: caseDoc.organization?.industry,
      description: caseDoc.organization?.description,
    },
    organizationTheme: caseDoc.organizationTheme ?? '',
    objectives: [...(caseDoc.objectives ?? [])],
    events: (caseDoc.events ?? []).map(serializeEvent),
    evidence,
    options: publicOptions(),
    limits: {
      hintLimit: hintLimitFor(caseDoc.difficulty),
      evidenceCount: (caseDoc.evidence ?? []).length,
      eventCount: (caseDoc.events ?? []).length,
    },
    createdAt: iso(caseDoc.createdAt),
  };
}

/**
 * Public view of an investigation.
 * Hint text is included only for hints that have been issued.
 *
 * @param {object} inv       lean Investigation
 * @param {object} caseDoc   lean Case with `hints` loaded (only issued ones are emitted)
 */
export function toPublicInvestigation(inv, caseDoc) {
  const issuedIds = inv.hintsUsed ?? [];
  const byId = new Map((caseDoc.hints ?? []).map((h) => [h.hintId, h]));
  const hints = issuedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((h) => ({ id: h.hintId, level: h.level, text: h.text }));

  const hintLimit = hintLimitFor(caseDoc.difficulty);
  const submitted = inv.status === 'submitted';

  return {
    id: String(inv._id),
    caseId: String(inv.caseId),
    status: inv.status,
    discoveredEvidenceIds: [...(inv.discoveredEvidenceIds ?? [])],
    hints,
    hintsUsed: issuedIds.length,
    hintsRemaining: Math.max(0, hintLimit - issuedIds.length),
    timeline: [...(inv.timeline ?? [])],
    provisionalScore: submitted
      ? inv.finalScore ?? 0
      : computeProvisionalScore({
          uniqueEvidenceCount: (inv.discoveredEvidenceIds ?? []).length,
          hintCount: issuedIds.length,
        }),
    submittedAt: iso(inv.submittedAt),
    createdAt: iso(inv.createdAt),
    updatedAt: iso(inv.updatedAt),
  };
}

export function toCaseSummary(caseDoc, inv) {
  const total = (caseDoc.evidence ?? []).length;
  const submitted = inv?.status === 'submitted';
  return {
    id: String(caseDoc._id),
    title: caseDoc.title,
    category: caseDoc.category,
    difficulty: caseDoc.difficulty,
    isDemo: caseDoc.source === 'demo',
    source: caseDoc.source,
    status: inv?.status ?? 'active',
    progress: { discovered: (inv?.discoveredEvidenceIds ?? []).length, total },
    score: submitted ? inv.finalScore ?? 0 : null,
    submittedAt: submitted ? iso(inv.submittedAt) : null,
    createdAt: iso(caseDoc.createdAt),
  };
}
