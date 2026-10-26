import { DIFFICULTY_CONFIG } from '../config/difficulty.js';
import {
  CLASSIFICATIONS_BY_CATEGORY,
  ROOT_CAUSE_IDS,
  ENTRY_POINT_IDS,
  EVIDENCE_TYPES,
  SEVERITIES,
} from '../config/taxonomy.js';

/**
 * Hand-written JSON Schema sent to Gemini as the structured-output hint.
 * (Written by hand rather than derived from Zod because the Zod schema contains
 * transforms, which do not map cleanly to JSON Schema.)
 * The server still re-validates the response with Zod + consistency checks, so this
 * schema only steers the model - it is never trusted.
 */
export function buildGeneratedCaseJsonSchema({ category, difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const string = (description) => ({ type: 'string', description });
  const stringArray = (description, minItems, maxItems) => ({
    type: 'array',
    description,
    minItems,
    maxItems,
    items: { type: 'string' },
  });

  return {
    type: 'object',
    properties: {
      title: string('Short case title'),
      summary: string('2-3 sentence public summary. Must not reveal the answer.'),
      organization: {
        type: 'object',
        properties: {
          name: string('Fictional organisation name'),
          industry: string('Industry'),
          description: string('One or two sentences about the organisation'),
        },
        required: ['name', 'industry', 'description'],
      },
      category: { type: 'string', enum: [category] },
      difficulty: { type: 'string', enum: [difficulty] },
      objectives: stringArray('2-5 investigation objectives', 2, 5),
      events: {
        type: 'array',
        minItems: cfg.events.min,
        maxItems: cfg.events.max,
        items: {
          type: 'object',
          properties: {
            id: string('evt-01, evt-02, ... in order'),
            timestamp: string('ISO-8601 UTC timestamp, chronological'),
            source: string('Log source, e.g. vpn-gateway'),
            severity: { type: 'string', enum: SEVERITIES },
            summary: string('One-line log summary'),
            details: string('Optional extra detail'),
          },
          required: ['id', 'timestamp', 'source', 'severity', 'summary', 'details'],
        },
      },
      evidence: {
        type: 'array',
        minItems: cfg.evidence.min,
        maxItems: cfg.evidence.max,
        items: {
          type: 'object',
          properties: {
            id: string('ev-01, ev-02, ...'),
            title: string('Short evidence title'),
            type: { type: 'string', enum: EVIDENCE_TYPES },
            description: string('What the analyst sees when inspecting this evidence'),
            relatedEventIds: stringArray('Event ids this evidence relates to', 1, 6),
          },
          required: ['id', 'title', 'type', 'description', 'relatedEventIds'],
        },
      },
      answerKey: {
        type: 'object',
        properties: {
          classification: { type: 'string', enum: CLASSIFICATIONS_BY_CATEGORY[category] },
          rootCause: { type: 'string', enum: ROOT_CAUSE_IDS },
          entryPoint: { type: 'string', enum: ENTRY_POINT_IDS },
          rootCauseExplanation: string('Why this is the root cause'),
          keyEvidenceIds: stringArray('Evidence ids that prove the conclusion (at least 2)', 2, 8),
          attackChainEventIds: stringArray('Chronological event ids forming the incident chain (at least 3)', 3, 10),
        },
        required: [
          'classification',
          'rootCause',
          'entryPoint',
          'rootCauseExplanation',
          'keyEvidenceIds',
          'attackChainEventIds',
        ],
      },
      hints: {
        type: 'array',
        minItems: cfg.hints,
        maxItems: cfg.hints,
        items: {
          type: 'object',
          properties: {
            id: string('hint-01, hint-02, ...'),
            level: { type: 'integer', minimum: 1, maximum: 5 },
            text: string('Progressively more specific hint that does NOT state the answer'),
          },
          required: ['id', 'level', 'text'],
        },
      },
      explanation: string('Educational walkthrough of what happened'),
      recommendations: stringArray('3-6 defensive recommendations', 3, 6),
    },
    required: [
      'title',
      'summary',
      'organization',
      'category',
      'difficulty',
      'objectives',
      'events',
      'evidence',
      'answerKey',
      'hints',
      'explanation',
      'recommendations',
    ],
  };
}
