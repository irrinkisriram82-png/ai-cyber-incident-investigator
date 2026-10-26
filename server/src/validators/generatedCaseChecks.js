// Stage 2 of generated-case validation (SPEC §10.2): cross-field consistency.
// Plain, dependency-free functions so they are trivial to unit-test and reuse for
// both Gemini output and the curated demo cases.

import { CLASSIFICATIONS_BY_CATEGORY, labelFor } from '../config/taxonomy.js';
import { DIFFICULTY_CONFIG } from '../config/difficulty.js';

const MAX_SPAN_MS = 7 * 24 * 60 * 60 * 1000;

const inRange = (n, { min, max }) => n >= min && n <= max;
export const uniqueStrings = (arr) => new Set(arr).size === arr.length;

/** Strings that must never appear in hint text because they give the answer away. */
export function hintLeakNeedles(answerKey) {
  const needles = new Set();
  const add = (s) => {
    if (s) needles.add(String(s).toLowerCase());
  };
  for (const [kind, id] of [
    ['classification', answerKey.classification],
    ['rootCause', answerKey.rootCause],
  ]) {
    add(id);
    add(id.replace(/_/g, ' '));
    add(labelFor(kind, id));
  }
  // Entry points: only multi-word machine ids (e.g. "vpn_portal"). Single common words
  // such as "email" would wrongly flag harmless hints.
  if (answerKey.entryPoint.includes('_')) add(answerKey.entryPoint);
  return [...needles];
}

/**
 * @param {object} data   a shape-valid generated case
 * @param {{category?:string, difficulty?:string}} [expected] what the player asked for
 * @returns {{path:string, message:string}[]} empty array when consistent
 */
export function crossValidateGeneratedCase(data, expected = {}) {
  const issues = [];
  const add = (path, message) => issues.push({ path, message });

  if (expected.category && data.category !== expected.category) {
    add('category', `Expected category "${expected.category}" but got "${data.category}"`);
  }
  if (expected.difficulty && data.difficulty !== expected.difficulty) {
    add('difficulty', `Expected difficulty "${expected.difficulty}" but got "${data.difficulty}"`);
  }

  const cfg = DIFFICULTY_CONFIG[data.difficulty];
  if (!cfg) {
    add('difficulty', 'Unknown difficulty');
    return issues;
  }

  // 1. unique ids
  const eventIds = data.events.map((e) => e.id);
  const evidenceIds = data.evidence.map((e) => e.id);
  const hintIds = data.hints.map((h) => h.id);
  if (!uniqueStrings(eventIds)) add('events', 'Event ids must be unique');
  if (!uniqueStrings(evidenceIds)) add('evidence', 'Evidence ids must be unique');
  if (!uniqueStrings(hintIds)) add('hints', 'Hint ids must be unique');

  // 2. counts for the difficulty
  if (!inRange(data.events.length, cfg.events)) {
    add('events', `Need ${cfg.events.min}-${cfg.events.max} events for ${data.difficulty}, got ${data.events.length}`);
  }
  if (!inRange(data.evidence.length, cfg.evidence)) {
    add('evidence', `Need ${cfg.evidence.min}-${cfg.evidence.max} evidence items for ${data.difficulty}, got ${data.evidence.length}`);
  }
  if (data.hints.length !== cfg.hints) {
    add('hints', `Need exactly ${cfg.hints} hints for ${data.difficulty}, got ${data.hints.length}`);
  }

  // 3. chronological events, bounded span
  const times = data.events.map((e) => Date.parse(e.timestamp));
  for (let i = 1; i < times.length; i += 1) {
    if (times[i] < times[i - 1]) {
      add(`events.${i}.timestamp`, 'Events must be in chronological order');
      break;
    }
  }
  if (times.length > 0 && Math.max(...times) - Math.min(...times) > MAX_SPAN_MS) {
    add('events', 'Events must span no more than 7 days');
  }

  // 4. taxonomy consistency
  const allowed = CLASSIFICATIONS_BY_CATEGORY[data.category] ?? [];
  if (!allowed.includes(data.answerKey.classification)) {
    add('answerKey.classification', `Classification is not valid for category "${data.category}"`);
  }

  // 5. references from evidence to events
  const eventSet = new Set(eventIds);
  const evidenceSet = new Set(evidenceIds);
  data.evidence.forEach((ev, i) => {
    ev.relatedEventIds.forEach((id) => {
      if (!eventSet.has(id)) add(`evidence.${i}.relatedEventIds`, `Unknown event id "${id}"`);
    });
  });

  // 6. answer-key references
  const { keyEvidenceIds, attackChainEventIds } = data.answerKey;
  if (!uniqueStrings(keyEvidenceIds)) add('answerKey.keyEvidenceIds', 'Key evidence ids must be unique');
  keyEvidenceIds.forEach((id) => {
    if (!evidenceSet.has(id)) add('answerKey.keyEvidenceIds', `Unknown evidence id "${id}"`);
  });
  if (!uniqueStrings(attackChainEventIds)) add('answerKey.attackChainEventIds', 'Attack-chain event ids must be unique');
  attackChainEventIds.forEach((id) => {
    if (!eventSet.has(id)) add('answerKey.attackChainEventIds', `Unknown event id "${id}"`);
  });
  const position = new Map(eventIds.map((id, i) => [id, i]));
  for (let i = 1; i < attackChainEventIds.length; i += 1) {
    const a = position.get(attackChainEventIds[i - 1]);
    const b = position.get(attackChainEventIds[i]);
    if (a !== undefined && b !== undefined && b <= a) {
      add('answerKey.attackChainEventIds', 'Attack chain must be in chronological order');
      break;
    }
  }

  // 7. the intended solution must be supported by the evidence
  const chain = new Set(attackChainEventIds);
  keyEvidenceIds.forEach((id) => {
    const ev = data.evidence.find((e) => e.id === id);
    if (ev && !ev.relatedEventIds.some((eventId) => chain.has(eventId))) {
      add('answerKey.keyEvidenceIds', `Key evidence "${id}" is not linked to any attack-chain event`);
    }
  });

  // 8. hints: ascending levels, and no answer leakage
  data.hints.forEach((hint, i) => {
    if (hint.level !== i + 1) add(`hints.${i}.level`, 'Hint levels must be 1..n in ascending order');
  });
  const needles = hintLeakNeedles(data.answerKey);
  data.hints.forEach((hint, i) => {
    const lower = hint.text.toLowerCase();
    if (needles.some((n) => lower.includes(n))) add(`hints.${i}.text`, 'Hint reveals the answer');
  });

  return issues;
}
