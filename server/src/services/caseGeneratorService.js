import * as defaultGemini from './geminiService.js';
import { SYSTEM_INSTRUCTION, buildPrompt } from './promptBuilder.js';
import { buildDemoCase } from './demoCaseService.js';
import { buildGeneratedCaseJsonSchema } from '../validators/geminiJsonSchema.js';
import { validateGeneratedCase } from '../validators/caseSchemas.js';
import { errors } from '../utils/apiError.js';

const MAX_ATTEMPTS = 2; // first try + ONE retry (SPEC §9) - never loop indefinitely

/** Models sometimes wrap JSON in markdown fences even when asked not to. */
export function parseModelJson(raw) {
  const cleaned = String(raw)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

function demoResult(input, reason, fallbackUsed) {
  const generated = buildDemoCase(input.category, input.difficulty);
  // Safety net: demo data must satisfy exactly the same rules as AI output.
  const checked = validateGeneratedCase(generated, { category: input.category, difficulty: input.difficulty });
  if (!checked.success) {
    throw new Error(`Curated demo case failed validation: ${checked.issues[0]?.path}`);
  }
  return { generated: checked.data, source: 'demo', fallbackUsed, fallbackReason: reason };
}

/** Transport failures worth one retry. Timeouts and client errors (quota, auth) are not. */
function isRetryable(err, attempt) {
  if (err.kind === 'timeout') return false; // do not double the user's wait
  if (err.status === 400 && attempt === 1) return true; // schema hint rejected -> retry without it
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) return false;
  return true;
}

/**
 * Produce a validated case: Gemini first, curated demo as the safety net.
 *
 * @param {{category:string, difficulty:string, organizationTheme?:string, premise?:string, useDemo?:boolean}} input
 * @param {{env:object, gemini?:object, logger?:{warn:Function}}} deps
 * @returns {Promise<{generated:object, source:'gemini'|'demo', fallbackUsed:boolean, fallbackReason:string|null}>}
 */
export async function generateCase(input, { env, gemini = defaultGemini, logger = console } = {}) {
  if (input.useDemo) return demoResult(input, 'DEMO_REQUESTED', false);

  if (!env.gemini.enabled) {
    if (!env.aiFallbackEnabled) throw errors.aiUnavailable();
    return demoResult(input, 'AI_NOT_CONFIGURED', true);
  }

  let reason = 'AI_UNAVAILABLE';
  let issues = null;
  let useSchemaHint = true;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const prompt = buildPrompt({ ...input, previousIssues: attempt > 1 ? issues : null });

    let raw;
    try {
      raw = await gemini.generateJson({
        apiKey: env.gemini.apiKey,
        model: env.gemini.model,
        timeoutMs: env.gemini.timeoutMs,
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        jsonSchema: useSchemaHint
          ? buildGeneratedCaseJsonSchema({ category: input.category, difficulty: input.difficulty })
          : null,
      });
    } catch (err) {
      reason = 'AI_UNAVAILABLE';
      issues = null;
      logger.warn(`[ai] attempt ${attempt} failed: ${err?.kind ?? 'error'}${err?.status ? ` (${err.status})` : ''}`);
      if (err?.status === 400) useSchemaHint = false; // retry once without the schema hint
      if (!isRetryable(err ?? {}, attempt)) break;
      continue;
    }

    let parsed;
    try {
      parsed = parseModelJson(raw);
    } catch {
      reason = 'AI_INVALID_OUTPUT';
      issues = [{ path: 'root', message: 'The response was not valid JSON' }];
      logger.warn(`[ai] attempt ${attempt} failed: response was not valid JSON`);
      continue;
    }

    const result = validateGeneratedCase(parsed, { category: input.category, difficulty: input.difficulty });
    if (result.success) {
      return { generated: result.data, source: 'gemini', fallbackUsed: false, fallbackReason: null };
    }
    reason = 'AI_INVALID_OUTPUT';
    issues = result.issues;
    // Log only paths + messages (never the generated answer key).
    logger.warn(`[ai] attempt ${attempt} failed validation: ${result.issues.slice(0, 3).map((i) => i.path).join(', ')}`);
  }

  if (!env.aiFallbackEnabled) throw errors.aiUnavailable();
  return demoResult(input, reason, true);
}
