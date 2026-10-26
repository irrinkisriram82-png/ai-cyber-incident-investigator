import { DEMO_TEMPLATES } from '../data/demoTemplates.js';
import { DIFFICULTY_CONFIG } from '../config/difficulty.js';

const MAX_TIER = { easy: 1, medium: 2, hard: 3 };

const pad = (n) => String(n).padStart(2, '0');

/**
 * Derive a difficulty variant of a curated template.
 * Output has exactly the same shape as validated Gemini output (GeneratedCaseSchema),
 * so the rest of the pipeline treats both identically.
 */
export function buildDemoCase(category, difficulty) {
  const template = DEMO_TEMPLATES.find((t) => t.category === category);
  if (!template) throw new Error(`No demo template for category "${category}"`);
  const cfg = DIFFICULTY_CONFIG[difficulty];
  if (!cfg) throw new Error(`Unknown difficulty "${difficulty}"`);

  const maxTier = MAX_TIER[difficulty];
  const source = structuredClone(template); // never mutate shared template data

  const events = source.events
    .filter((e) => e.tier <= maxTier)
    .map(({ tier, ...rest }) => rest); // eslint-disable-line no-unused-vars
  const keptEventIds = new Set(events.map((e) => e.id));

  const evidence = source.evidence
    .filter((e) => e.tier <= maxTier)
    .map(({ tier, relatedEventIds, ...rest }) => ({
      // eslint-disable-line no-unused-vars
      ...rest,
      relatedEventIds: relatedEventIds.filter((id) => keptEventIds.has(id)),
    }));

  const hints = source.hints.slice(0, cfg.hints).map((h, i) => ({
    id: `hint-${pad(i + 1)}`,
    level: i + 1,
    text: h.text,
  }));

  return {
    title: source.title,
    summary: source.summary,
    organization: source.organization,
    category: source.category,
    difficulty,
    objectives: source.objectives,
    events,
    evidence,
    answerKey: source.answerKey,
    hints,
    explanation: source.explanation,
    recommendations: source.recommendations,
  };
}

export const DEMO_CATEGORIES = DEMO_TEMPLATES.map((t) => t.category);
