// Thin wrapper around the official Google Gen AI SDK (@google/genai).
// Server-side only. Returns RAW TEXT: parsing and validation happen in
// caseGeneratorService.js - model output is never trusted.

let cachedClient = null;
let cachedKey = null;

export class GeminiError extends Error {
  /**
   * @param {'timeout'|'request'|'empty'} kind
   * @param {number} [status] HTTP status reported by the API, if any
   */
  constructor(kind, message, status) {
    super(message);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = status;
  }
}

async function getClient(apiKey) {
  if (cachedClient && cachedKey === apiKey) return cachedClient;
  // Imported lazily so the app (and demo mode) still starts when AI is not configured.
  const { GoogleGenAI } = await import('@google/genai');
  cachedClient = new GoogleGenAI({ apiKey });
  cachedKey = apiKey;
  return cachedClient;
}

/**
 * Ask Gemini for a JSON document.
 * @param {object} p
 * @param {string} p.apiKey
 * @param {string} p.model
 * @param {number} p.timeoutMs
 * @param {string} p.systemInstruction
 * @param {string} p.prompt
 * @param {object|null} [p.jsonSchema] JSON Schema sent as a structured-output hint
 * @returns {Promise<string>} raw response text
 */
export async function generateJson({ apiKey, model, timeoutMs, systemInstruction, prompt, jsonSchema = null }) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new GeminiError('timeout', 'Gemini request timed out')), timeoutMs + 1000);
  });

  try {
    const ai = await getClient(apiKey);
    const config = {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.8,
      httpOptions: { timeout: timeoutMs },
      ...(jsonSchema ? { responseJsonSchema: jsonSchema } : {}),
    };
    const response = await Promise.race([ai.models.generateContent({ model, contents: prompt, config }), timeout]);
    const text = response?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      throw new GeminiError('empty', 'Gemini returned no text');
    }
    return text;
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    // Do not forward SDK error text: keep only a status code, never keys or payloads.
    const status = Number.isInteger(err?.status) ? err.status : Number.isInteger(err?.code) ? err.code : undefined;
    throw new GeminiError('request', 'Gemini request failed', status);
  } finally {
    clearTimeout(timer);
  }
}
