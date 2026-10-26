import { z } from 'zod';
import { sanitizeText } from '../utils/sanitize.js';
import {
  CATEGORY_IDS,
  CLASSIFICATION_IDS,
  ROOT_CAUSE_IDS,
  ENTRY_POINT_IDS,
  EVIDENCE_TYPES,
  SEVERITIES,
} from '../config/taxonomy.js';
import { DIFFICULTY_IDS } from '../config/difficulty.js';
import { crossValidateGeneratedCase, uniqueStrings } from './generatedCaseChecks.js';

export { crossValidateGeneratedCase };

export const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
export const EVENT_ID_RE = /^evt-\d{2}$/;
export const EVIDENCE_ID_RE = /^ev-\d{2}$/;
export const HINT_ID_RE = /^hint-\d{2}$/;

const MAX_EVENTS = 14;
const MAX_EVIDENCE = 8;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Bounded, sanitised text. Length limits apply AFTER sanitising. */
function text(min, max, { singleLine = false } = {}) {
  return z
    .string()
    .max(max * 4) // coarse cap before the (cheap) sanitiser runs
    .transform((s) => sanitizeText(s, { singleLine }))
    .pipe(z.string().min(min).max(max));
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const isoTimestamp = z
  .string()
  .refine((s) => ISO_RE.test(s) && !Number.isNaN(Date.parse(s)), 'Invalid ISO-8601 timestamp');

// ---------------------------------------------------------------------------
// request schemas (SPEC §10.1)
// ---------------------------------------------------------------------------

export const caseIdParam = z.object({
  id: z.string().regex(OBJECT_ID_RE, 'Invalid case id'),
});

export const evidenceParams = caseIdParam.extend({
  evidenceId: z.string().regex(EVIDENCE_ID_RE, 'Invalid evidence id'),
});

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createCaseBody = z.object({
  category: z.enum(CATEGORY_IDS),
  difficulty: z.enum(DIFFICULTY_IDS),
  organizationTheme: text(2, 60, { singleLine: true }).default('Regional university'),
  premise: text(0, 300).optional(),
  useDemo: z.boolean().default(false),
});

export const timelineBody = z.object({
  eventIds: z
    .array(z.string().regex(EVENT_ID_RE, 'Invalid event id'))
    .min(1, 'Select at least one event')
    .max(MAX_EVENTS)
    .refine(uniqueStrings, 'Event ids must be unique'),
});

export const submitBody = z.object({
  classification: z.enum(CLASSIFICATION_IDS),
  rootCause: z.enum(ROOT_CAUSE_IDS),
  entryPoint: z.enum(ENTRY_POINT_IDS),
  evidenceIds: z
    .array(z.string().regex(EVIDENCE_ID_RE, 'Invalid evidence id'))
    .min(1, 'Select at least one piece of supporting evidence')
    .max(MAX_EVIDENCE)
    .refine(uniqueStrings, 'Evidence ids must be unique'),
  reasoning: text(10, 1000),
});

// ---------------------------------------------------------------------------
// generated-case schema (SPEC §10.2) - stage 1: shape and types
// ---------------------------------------------------------------------------

const generatedEvent = z.object({
  id: z.string().regex(EVENT_ID_RE),
  timestamp: isoTimestamp,
  source: text(1, 60, { singleLine: true }),
  severity: z.enum(SEVERITIES),
  summary: text(5, 300, { singleLine: true }),
  details: text(0, 500).default(''),
});

const generatedEvidence = z.object({
  id: z.string().regex(EVIDENCE_ID_RE),
  title: text(3, 100, { singleLine: true }),
  type: z.enum(EVIDENCE_TYPES),
  description: text(10, 800),
  relatedEventIds: z.array(z.string().regex(EVENT_ID_RE)).min(1).max(6),
});

const generatedHint = z.object({
  id: z.string().regex(HINT_ID_RE),
  level: z.number().int().min(1).max(5),
  text: text(10, 300),
});

const generatedAnswerKey = z.object({
  classification: z.enum(CLASSIFICATION_IDS),
  rootCause: z.enum(ROOT_CAUSE_IDS),
  entryPoint: z.enum(ENTRY_POINT_IDS),
  rootCauseExplanation: text(20, 1000),
  keyEvidenceIds: z.array(z.string().regex(EVIDENCE_ID_RE)).min(2).max(MAX_EVIDENCE),
  attackChainEventIds: z.array(z.string().regex(EVENT_ID_RE)).min(3).max(10),
});

export const GeneratedCaseSchema = z.object({
  title: text(5, 120, { singleLine: true }),
  summary: text(20, 600),
  organization: z.object({
    name: text(1, 80, { singleLine: true }),
    industry: text(1, 80, { singleLine: true }),
    description: text(10, 400),
  }),
  category: z.enum(CATEGORY_IDS),
  difficulty: z.enum(DIFFICULTY_IDS),
  objectives: z.array(text(5, 200, { singleLine: true })).min(2).max(5),
  events: z.array(generatedEvent).min(1).max(MAX_EVENTS),
  evidence: z.array(generatedEvidence).min(1).max(MAX_EVIDENCE),
  answerKey: generatedAnswerKey,
  hints: z.array(generatedHint).min(1).max(5),
  explanation: text(50, 2000),
  recommendations: z.array(text(10, 300)).min(3).max(6),
});

/**
 * Full validation: Zod shape (stage 1) then consistency checks (stage 2).
 * @returns {{success:true, data:object} | {success:false, issues:{path:string,message:string}[]}}
 */
export function validateGeneratedCase(raw, expected = {}) {
  const parsed = GeneratedCaseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  const issues = crossValidateGeneratedCase(parsed.data, expected);
  if (issues.length > 0) return { success: false, issues };
  return { success: true, data: parsed.data };
}
