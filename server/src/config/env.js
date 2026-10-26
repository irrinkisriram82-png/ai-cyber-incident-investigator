import { z } from 'zod';

// Treat unset and empty variables the same way.
function compact(source) {
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}

const booleanish = z.preprocess((value) => {
  if (typeof value === 'string') {
    const s = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'off'].includes(s)) return false;
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(20000),
  AI_FALLBACK_ENABLED: booleanish.default(true),
  REQUEST_BODY_LIMIT: z.string().default('10kb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
  RATE_LIMIT_GENERATE_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_MUTATION_MAX: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).default(300),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

function parseOrigins(raw) {
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s === '*') throw new Error('CLIENT_URL must be an explicit origin, not "*"');
      let url;
      try {
        url = new URL(s);
      } catch {
        throw new Error('CLIENT_URL contains an entry that is not a valid URL');
      }
      return url.origin;
    });
  if (origins.length === 0) throw new Error('CLIENT_URL must contain at least one origin');
  return origins;
}

/**
 * Validate and normalise environment variables.
 * Error messages name the offending variables only - never their values.
 */
export function loadEnv(source = process.env) {
  const parsed = envSchema.safeParse(compact(source));
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? 'env')))];
    throw new Error(`Invalid or missing environment variables: ${names.join(', ')}`);
  }
  const v = parsed.data;

  const key = v.GEMINI_API_KEY;
  const keyLooksReal = Boolean(key) && !/^your_/i.test(key) && key.length >= 10;

  return Object.freeze({
    nodeEnv: v.NODE_ENV,
    isProduction: v.NODE_ENV === 'production',
    isDevelopment: v.NODE_ENV === 'development',
    isTest: v.NODE_ENV === 'test',
    port: v.PORT,
    mongodbUri: v.MONGODB_URI,
    clientOrigins: parseOrigins(v.CLIENT_URL),
    gemini: Object.freeze({
      apiKey: keyLooksReal ? key : null,
      enabled: keyLooksReal,
      model: v.GEMINI_MODEL,
      timeoutMs: v.GEMINI_TIMEOUT_MS,
    }),
    aiFallbackEnabled: v.AI_FALLBACK_ENABLED,
    bodyLimit: v.REQUEST_BODY_LIMIT,
    rateLimit: Object.freeze({
      windowMs: v.RATE_LIMIT_WINDOW_MS,
      generateMax: v.RATE_LIMIT_GENERATE_MAX,
      mutationMax: v.RATE_LIMIT_MUTATION_MAX,
      globalMax: v.RATE_LIMIT_GLOBAL_MAX,
    }),
    trustProxy: v.TRUST_PROXY,
  });
}
