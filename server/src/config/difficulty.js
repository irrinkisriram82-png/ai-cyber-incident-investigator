// Single server-side configuration module for difficulty rules (SPEC §11.1).
// Scoring points live in scoringService.js, not here.

export const DIFFICULTY_IDS = ['easy', 'medium', 'hard'];

export const DIFFICULTY_CONFIG = Object.freeze({
  easy: Object.freeze({
    label: 'Easy',
    evidence: Object.freeze({ min: 3, max: 4 }),
    events: Object.freeze({ min: 5, max: 7 }),
    hints: 2,
  }),
  medium: Object.freeze({
    label: 'Medium',
    evidence: Object.freeze({ min: 5, max: 6 }),
    events: Object.freeze({ min: 8, max: 10 }),
    hints: 3,
  }),
  hard: Object.freeze({
    label: 'Hard',
    evidence: Object.freeze({ min: 7, max: 8 }),
    events: Object.freeze({ min: 10, max: 14 }),
    hints: 3,
  }),
});

export function getDifficulty(id) {
  const cfg = DIFFICULTY_CONFIG[id];
  if (!cfg) throw new Error(`Unknown difficulty: ${id}`);
  return cfg;
}

export function hintLimitFor(difficulty) {
  return getDifficulty(difficulty).hints;
}
