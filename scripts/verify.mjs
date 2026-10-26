#!/usr/bin/env node
// Dependency-free verification: runs with plain Node, BEFORE `npm install`.
//
//   node scripts/verify.mjs      (or: npm run verify)
//
// It checks what can be checked without third-party packages:
//   1. every server source file parses (node --check)
//   2. text sanitiser behaviour
//   3. scoring formula and evaluation helpers (pure logic)
//   4. all 15 curated demo variants (5 categories x 3 difficulties) against the same
//      consistency rules used for Gemini output, plus an approximate shape check
//
// It does NOT replace the Vitest suites (Zod parsing, HTTP, MongoDB, React): run
// `npm test` for those after `npm install`.

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'server');
const imp = (rel) => import(pathToFileURL(join(server, rel)).href);

let passed = 0;
let failed = 0;
const section = (name) => console.log(`\n== ${name}`);
function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js') || p.endsWith('.mjs')) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
section('1. Syntax of server source files (node --check)');
{
  const files = [join(server, 'server.js'), ...walk(join(server, 'src')), ...walk(join(server, 'tests'))];
  let bad = 0;
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) {
      bad += 1;
      console.log(`  FAIL  ${f.replace(root, '.')}\n        ${r.stderr.split('\n')[0]}`);
    }
  }
  check(`${files.length} files parse`, bad === 0);
}

// ---------------------------------------------------------------------------
section('2. Sanitiser');
{
  const { sanitizeText } = await imp('src/utils/sanitize.js');
  check('strips <script> tags', sanitizeText('a<script>x</script>b') === 'axb');
  check('keeps mail-style <user@example.com>', sanitizeText('From <a@example.com>') === 'From <a@example.com>');
  check('collapses nested tag tricks', sanitizeText('<scr<script>ipt>x</scr</script>ipt>') === 'x');
  check('single-line mode', sanitizeText('a \n b', { singleLine: true }) === 'a b');
}

// ---------------------------------------------------------------------------
section('3. Scoring formula (SPEC §11.2)');
const scoring = await imp('src/services/scoringService.js');
{
  const { computeScore, computeProvisionalScore } = scoring;
  const t = (name, input, expected) => check(name, computeScore(input).total === expected, `got ${computeScore(input).total}, want ${expected}`);
  t('perfect: 100 + 50 + 6 evidence (30) = 180', { classificationCorrect: true, rootCauseCorrect: true, uniqueEvidenceCount: 6 }, 180);
  t('evidence is capped at 6 items (+30)', { classificationCorrect: true, rootCauseCorrect: true, uniqueEvidenceCount: 20 }, 180);
  t('one hint costs 10', { classificationCorrect: true, rootCauseCorrect: true, uniqueEvidenceCount: 6, hintCount: 1 }, 170);
  t('wrong classification: -15 and no answer points', { rootCauseCorrect: true, uniqueEvidenceCount: 4, wrongSubmissionCount: 1 }, 55);
  t('score never goes below 0', { hintCount: 5, wrongSubmissionCount: 1 }, 0);
  t('classification only', { classificationCorrect: true }, 100);
  t('root cause only', { rootCauseCorrect: true }, 50);
  t('negative / junk inputs are clamped', { classificationCorrect: true, hintCount: -3, uniqueEvidenceCount: Number.NaN }, 100);
  t('truthy-but-not-true flags earn nothing', { classificationCorrect: 'yes', rootCauseCorrect: 1 }, 0);
  check('provisional score ignores answer points', computeProvisionalScore({ uniqueEvidenceCount: 3, hintCount: 1 }) === 5);
  const b = computeScore({ classificationCorrect: true, rootCauseCorrect: false, uniqueEvidenceCount: 3, hintCount: 2, wrongSubmissionCount: 0 });
  check('breakdown fields add up', b.classificationPoints + b.rootCausePoints + b.evidencePoints - b.hintPenalty - b.wrongSubmissionPenalty === b.total);
}

// ---------------------------------------------------------------------------
section('4. Evaluation helpers');
{
  const { lcsLength, evaluateTimeline, evaluateEvidenceCoverage, evaluateFindings } = await imp('src/services/evaluationService.js');
  check('LCS basic', lcsLength(['a', 'b', 'c', 'd'], ['b', 'd']) === 2);
  check('LCS empty', lcsLength([], ['a']) === 0);
  const chain = ['evt-03', 'evt-04', 'evt-06', 'evt-08'];
  check('timeline: perfect order = 1', evaluateTimeline(['evt-03', 'evt-04', 'evt-06', 'evt-08'], chain).accuracy === 1);
  check('timeline: reversed = 0.25', evaluateTimeline([...chain].reverse(), chain).accuracy === 0.25);
  check('timeline: non-chain events ignored', evaluateTimeline(['evt-01', 'evt-03', 'evt-05', 'evt-04'], chain).accuracy === 0.5);
  check('timeline: none provided', eq([evaluateTimeline([], chain).provided, evaluateTimeline([], chain).accuracy], [false, null]));
  const cov = evaluateEvidenceCoverage(['ev-01', 'ev-04'], ['ev-01', 'ev-02', 'ev-03']);
  check('coverage matched/missed/extra', eq([cov.matched, cov.missed, cov.extra, cov.ratio], [['ev-01'], ['ev-02', 'ev-03'], ['ev-04'], 0.33]));
  const key = { classification: 'a', rootCause: 'b', entryPoint: 'c', keyEvidenceIds: ['ev-01'], attackChainEventIds: ['evt-01'] };
  const wrong = evaluateFindings({ findings: { classification: 'x', rootCause: 'b', entryPoint: 'c', evidenceIds: ['ev-01'] }, answerKey: key, timeline: [] });
  check('wrong classification => wrongSubmissionCount 1', wrong.wrongSubmissionCount === 1 && wrong.rootCauseCorrect === true);
  const right = evaluateFindings({ findings: { classification: 'a', rootCause: 'x', entryPoint: 'c', evidenceIds: ['ev-01'] }, answerKey: key, timeline: [] });
  check('right classification => wrongSubmissionCount 0', right.wrongSubmissionCount === 0 && right.rootCauseCorrect === false);
}

// ---------------------------------------------------------------------------
section('5. Curated demo cases: 5 categories x 3 difficulties');
{
  const { buildDemoCase, DEMO_CATEGORIES } = await imp('src/services/demoCaseService.js');
  const { crossValidateGeneratedCase } = await imp('src/validators/generatedCaseChecks.js');
  const { DIFFICULTY_IDS, DIFFICULTY_CONFIG } = await imp('src/config/difficulty.js');
  const { CATEGORY_IDS, EVIDENCE_TYPES, SEVERITIES } = await imp('src/config/taxonomy.js');

  check('one template per category', eq([...DEMO_CATEGORIES].sort(), [...CATEGORY_IDS].sort()));

  // Approximation of GeneratedCaseSchema's field rules (the real check is Zod in the Vitest suite).
  const len = (s, min, max) => typeof s === 'string' && s.trim().length >= min && s.length <= max;
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
  function shapeIssues(c) {
    const out = [];
    const need = (ok, msg) => ok || out.push(msg);
    need(len(c.title, 5, 120), 'title length');
    need(len(c.summary, 20, 600), 'summary length');
    need(len(c.organization.name, 1, 80) && len(c.organization.industry, 1, 80) && len(c.organization.description, 10, 400), 'organization lengths');
    need(c.objectives.length >= 2 && c.objectives.length <= 5 && c.objectives.every((o) => len(o, 5, 200)), 'objectives');
    c.events.forEach((e) => {
      need(/^evt-\d{2}$/.test(e.id), `event id ${e.id}`);
      need(ISO.test(e.timestamp) && !Number.isNaN(Date.parse(e.timestamp)), `timestamp ${e.id}`);
      need(len(e.source, 1, 60) && len(e.summary, 5, 300) && typeof e.details === 'string' && e.details.length <= 500, `event text ${e.id}`);
      need(SEVERITIES.includes(e.severity), `severity ${e.id}`);
    });
    c.evidence.forEach((e) => {
      need(/^ev-\d{2}$/.test(e.id), `evidence id ${e.id}`);
      need(len(e.title, 3, 100) && len(e.description, 10, 800), `evidence text ${e.id}`);
      need(EVIDENCE_TYPES.includes(e.type), `evidence type ${e.id}`);
      need(e.relatedEventIds.length >= 1 && e.relatedEventIds.length <= 6, `relatedEventIds ${e.id}`);
    });
    c.hints.forEach((h) => need(/^hint-\d{2}$/.test(h.id) && len(h.text, 10, 300), `hint ${h.id}`));
    need(len(c.answerKey.rootCauseExplanation, 20, 1000), 'rootCauseExplanation');
    need(c.answerKey.keyEvidenceIds.length >= 2 && c.answerKey.attackChainEventIds.length >= 3, 'answer key sizes');
    need(len(c.explanation, 50, 2000), 'explanation');
    need(c.recommendations.length >= 3 && c.recommendations.length <= 6 && c.recommendations.every((r) => len(r, 10, 300)), 'recommendations');
    return out;
  }

  for (const category of CATEGORY_IDS) {
    for (const difficulty of DIFFICULTY_IDS) {
      const c = buildDemoCase(category, difficulty);
      const cfg = DIFFICULTY_CONFIG[difficulty];
      const problems = [...shapeIssues(c), ...crossValidateGeneratedCase(c, { category, difficulty }).map((i) => `${i.path}: ${i.message}`)];
      check(
        `${category} / ${difficulty}  (events ${c.events.length}, evidence ${c.evidence.length}, hints ${c.hints.length})`,
        problems.length === 0 && c.events.length >= cfg.events.min && c.evidence.length >= cfg.evidence.min,
        problems.slice(0, 4).join(' | '),
      );
    }
  }

  // Sanity: building a variant must not mutate the shared templates.
  const a = buildDemoCase('suspicious_login', 'hard');
  a.events.pop();
  a.answerKey.classification = 'tampered';
  const b = buildDemoCase('suspicious_login', 'hard');
  check('demo builder returns independent copies', b.events.length === 12 && b.answerKey.classification === 'credential_stuffing');

  // The checker must actually catch problems (guards against a vacuously passing test).
  const bad = buildDemoCase('data_exposure', 'medium');
  bad.hints[0].text = 'This looks like a public storage misconfiguration to me, so check it.';
  check('checker flags an answer-leaking hint', crossValidateGeneratedCase(bad).some((i) => i.message.includes('reveals')));
  const bad2 = buildDemoCase('data_exposure', 'easy');
  bad2.events.reverse();
  check('checker flags non-chronological events', crossValidateGeneratedCase(bad2).some((i) => i.message.includes('chronological')));
  const bad3 = buildDemoCase('data_exposure', 'easy');
  bad3.answerKey.classification = 'credential_stuffing';
  check('checker flags classification/category mismatch', crossValidateGeneratedCase(bad3).some((i) => i.path === 'answerKey.classification'));
}

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}: ${passed} passed, ${failed} failed`);
console.log('Note: this does not run Vitest, MongoDB, Gemini or the client build - see README "Verification status".');
process.exit(failed === 0 ? 0 : 1);
