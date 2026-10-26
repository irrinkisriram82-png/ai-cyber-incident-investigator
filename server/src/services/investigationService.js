// Business logic for cases and investigations (SPEC §7, §11).
//
// Rules enforced here, on the server only:
//   - private fields are loaded explicitly and leave only through the whitelist serializers
//   - evidence reward is granted once (conditional $addToSet update)
//   - hint limit + penalty are enforced atomically (revision compare-and-set)
//   - a submission is accepted once; the score is computed from stored state,
//     never from anything the client sends
//
// Every mutation is a single atomic findOneAndUpdate conditioned on status 'active'.

import { Case, PRIVATE_CASE_FIELDS } from '../models/Case.js';
import { Investigation } from '../models/Investigation.js';
import { hintLimitFor } from '../config/difficulty.js';
import { generateCase } from './caseGeneratorService.js';
import { toCaseDocument } from './caseMapper.js';
import { computeScore } from './scoringService.js';
import { evaluateFindings } from './evaluationService.js';
import { serializeEvent, toCaseSummary, toPublicCase, toPublicInvestigation } from '../serializers/caseSerializer.js';
import { errors } from '../utils/apiError.js';

const MAX_MUTATION_ATTEMPTS = 2; // first try + one retry, then 409 CONFLICT

// ---------------------------------------------------------------------------
// loaders
// ---------------------------------------------------------------------------

/** Loads a case INCLUDING private fields. Never return this object to a client directly. */
async function loadCase(caseId) {
  const doc = await Case.findById(caseId).select(PRIVATE_CASE_FIELDS).lean();
  if (!doc) throw errors.caseNotFound();
  return doc;
}

async function loadInvestigation(caseObjectId) {
  const inv = await Investigation.findOne({ caseId: caseObjectId }).lean();
  if (!inv) throw errors.caseNotFound();
  return inv;
}

/** After a failed conditional update, work out why. */
async function explainFailedUpdate(caseObjectId) {
  const inv = await Investigation.findOne({ caseId: caseObjectId }).lean();
  if (!inv) return errors.caseNotFound();
  if (inv.status === 'submitted') return errors.alreadySubmitted();
  return null; // still active: probably a concurrent change
}

const publicView = (caseDoc, inv) => ({
  case: toPublicCase(caseDoc, { discoveredEvidenceIds: inv.discoveredEvidenceIds }),
  investigation: toPublicInvestigation(inv, caseDoc),
});

// ---------------------------------------------------------------------------
// create / list / get
// ---------------------------------------------------------------------------

export async function createCase(input, { env, gemini, logger } = {}) {
  const { generated, source, fallbackUsed, fallbackReason } = await generateCase(input, { env, gemini, logger });

  const created = await Case.create(
    toCaseDocument(generated, { organizationTheme: input.organizationTheme ?? '', source }),
  );
  let inv;
  try {
    inv = await Investigation.create({ caseId: created._id });
  } catch (err) {
    await Case.deleteOne({ _id: created._id }).catch(() => {}); // do not leave an orphan case
    throw err;
  }

  const caseDoc = await loadCase(created._id);
  const invLean = await Investigation.findById(inv._id).lean();
  return {
    ...publicView(caseDoc, invLean),
    investigationId: String(inv._id),
    fallbackUsed,
    fallbackReason,
  };
}

export async function listCases({ page, limit }) {
  const [cases, total] = await Promise.all([
    Case.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(), // private fields are select:false, so they are not loaded here
    Case.countDocuments(),
  ]);
  const investigations = await Investigation.find({ caseId: { $in: cases.map((c) => c._id) } }).lean();
  const byCase = new Map(investigations.map((i) => [String(i.caseId), i]));

  return {
    items: cases.map((c) => toCaseSummary(c, byCase.get(String(c._id)))),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getCase(caseId) {
  const caseDoc = await loadCase(caseId);
  const inv = await loadInvestigation(caseDoc._id);
  return publicView(caseDoc, inv);
}

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------

export async function discoverEvidence(caseId, evidenceId) {
  const caseDoc = await loadCase(caseId);
  if (!caseDoc.evidence.some((e) => e.evidenceId === evidenceId)) throw errors.evidenceNotFound();

  // Conditional update: matches only while active AND the item is not yet discovered,
  // so the reward can be granted at most once, even for concurrent requests.
  let inv = await Investigation.findOneAndUpdate(
    { caseId: caseDoc._id, status: 'active', discoveredEvidenceIds: { $ne: evidenceId } },
    { $addToSet: { discoveredEvidenceIds: evidenceId }, $inc: { revision: 1 } },
    { new: true },
  ).lean();

  let alreadyDiscovered = false;
  if (!inv) {
    const reason = await explainFailedUpdate(caseDoc._id);
    if (reason) throw reason;
    inv = await loadInvestigation(caseDoc._id);
    alreadyDiscovered = true;
  }

  const evidence = toPublicCase(caseDoc, { discoveredEvidenceIds: [evidenceId] }).evidence.find(
    (e) => e.id === evidenceId,
  );
  return { evidence, alreadyDiscovered, investigation: toPublicInvestigation(inv, caseDoc) };
}

// ---------------------------------------------------------------------------
// hints
// ---------------------------------------------------------------------------

export async function requestHint(caseId) {
  for (let attempt = 1; attempt <= MAX_MUTATION_ATTEMPTS; attempt += 1) {
    const caseDoc = await loadCase(caseId);
    const inv = await loadInvestigation(caseDoc._id);
    if (inv.status === 'submitted') throw errors.alreadySubmitted();

    const limit = hintLimitFor(caseDoc.difficulty);
    const ordered = [...(caseDoc.hints ?? [])].sort((a, b) => a.level - b.level);
    const used = inv.hintsUsed.length;
    if (used >= limit || used >= ordered.length) throw errors.hintLimit();
    const next = ordered[used];

    // Compare-and-set on `revision`: a concurrent hint/discovery makes this miss, and we
    // re-read and re-check the limit. The penalty is derived from hintsUsed.length at
    // submit time, so each issued hint is penalised exactly once.
    const updated = await Investigation.findOneAndUpdate(
      { _id: inv._id, status: 'active', revision: inv.revision },
      { $push: { hintsUsed: next.hintId }, $inc: { revision: 1 } },
      { new: true },
    ).lean();

    if (updated) {
      const view = toPublicInvestigation(updated, caseDoc);
      return {
        hint: { id: next.hintId, level: next.level, text: next.text },
        hintsUsed: view.hintsUsed,
        hintsRemaining: view.hintsRemaining,
        investigation: view,
      };
    }
  }
  throw errors.conflict();
}

// ---------------------------------------------------------------------------
// timeline
// ---------------------------------------------------------------------------

export async function saveTimeline(caseId, eventIds) {
  const caseDoc = await loadCase(caseId);
  const known = new Set(caseDoc.events.map((e) => e.eventId));
  const unknown = eventIds.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw errors.validation('Timeline contains events that do not belong to this case', [
      { path: 'body.eventIds', message: 'Unknown event id(s)' },
    ]);
  }

  const inv = await Investigation.findOneAndUpdate(
    { caseId: caseDoc._id, status: 'active' },
    { $set: { timeline: eventIds }, $inc: { revision: 1 } },
    { new: true },
  ).lean();
  if (!inv) throw (await explainFailedUpdate(caseDoc._id)) ?? errors.conflict();

  const view = toPublicInvestigation(inv, caseDoc);
  return { timeline: view.timeline, investigation: view };
}

// ---------------------------------------------------------------------------
// submit / result
// ---------------------------------------------------------------------------

function buildResult({ caseDoc, inv, findings, evaluation, score, submittedAt }) {
  const { answerKey } = caseDoc;
  const eventsById = new Map(caseDoc.events.map((e) => [e.eventId, e]));
  const stubs = new Map(caseDoc.evidence.map((e) => [e.evidenceId, e]));
  const details = new Map(caseDoc.evidenceDetails.map((d) => [d.evidenceId, d]));

  return {
    investigationId: String(inv._id),
    caseId: String(caseDoc._id),
    status: 'submitted',
    submittedAt: submittedAt.toISOString(),
    findings,
    evaluation,
    score,
    explanation: caseDoc.explanation,
    rootCauseExplanation: answerKey.rootCauseExplanation,
    recommendations: [...caseDoc.recommendations],
    attackChain: answerKey.attackChainEventIds
      .map((id) => eventsById.get(id))
      .filter(Boolean)
      .map(serializeEvent),
    keyEvidence: answerKey.keyEvidenceIds
      .filter((id) => stubs.has(id))
      .map((id) => ({
        id,
        title: stubs.get(id).title,
        description: details.get(id)?.description ?? '',
      })),
    case: toPublicCase(caseDoc, { discoveredEvidenceIds: inv.discoveredEvidenceIds, revealAll: true }),
  };
}

export async function submitFindings(caseId, body) {
  for (let attempt = 1; attempt <= MAX_MUTATION_ATTEMPTS; attempt += 1) {
    const caseDoc = await loadCase(caseId);
    const inv = await loadInvestigation(caseDoc._id);
    if (inv.status === 'submitted') throw errors.alreadySubmitted();

    const discovered = new Set(inv.discoveredEvidenceIds);
    if (!body.evidenceIds.every((id) => discovered.has(id))) throw errors.evidenceNotDiscovered();

    const findings = {
      classification: body.classification,
      rootCause: body.rootCause,
      entryPoint: body.entryPoint,
      evidenceIds: [...body.evidenceIds],
      reasoning: body.reasoning,
    };

    const { classificationCorrect, rootCauseCorrect, wrongSubmissionCount, evaluation } = evaluateFindings({
      findings,
      answerKey: caseDoc.answerKey,
      timeline: inv.timeline,
    });

    // Score comes from stored state (discoveries, issued hints) + server-side checks only.
    const score = computeScore({
      classificationCorrect,
      rootCauseCorrect,
      uniqueEvidenceCount: inv.discoveredEvidenceIds.length,
      hintCount: inv.hintsUsed.length,
      wrongSubmissionCount,
    });

    const submittedAt = new Date();
    const result = buildResult({ caseDoc, inv, findings, evaluation, score, submittedAt });

    // Succeeds only once: still active AND unchanged since we computed the score.
    const updated = await Investigation.findOneAndUpdate(
      { _id: inv._id, status: 'active', revision: inv.revision },
      {
        $set: {
          status: 'submitted',
          findings,
          scoreBreakdown: score,
          finalScore: score.total,
          result,
          submittedAt,
        },
        $inc: { revision: 1 },
      },
      { new: true },
    ).lean();

    if (updated) return result;
    // else: something changed concurrently -> loop re-reads (and reports 409 if now submitted)
  }
  throw errors.conflict();
}

export async function getResult(caseId) {
  const caseDoc = await Case.findById(caseId).select('_id').lean();
  if (!caseDoc) throw errors.caseNotFound();
  const inv = await Investigation.findOne({ caseId: caseDoc._id }).select('+result').lean();
  if (!inv) throw errors.caseNotFound();
  if (inv.status !== 'submitted' || !inv.result) throw errors.investigationActive();
  return inv.result;
}
