// ONE centralised API client (SPEC §6). Every network call in the app goes through here.
// Errors are normalised to ApiClientError { code, message, status, details }.

import axios from 'axios';

const baseURL = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export class ApiClientError extends Error {
  constructor({ code, message, status = 0, details }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Turn any axios failure into an ApiClientError with a user-friendly message. Exported for tests. */
export function normalizeError(err) {
  if (err instanceof ApiClientError) return err;

  const body = err?.response?.data;
  if (body?.error?.code) {
    return new ApiClientError({
      code: body.error.code,
      message: body.error.message || 'Something went wrong.',
      status: err.response.status,
      details: body.error.details,
    });
  }
  if (err?.response) {
    const status = err.response.status;
    return new ApiClientError({
      code: status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR',
      message:
        status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : `The server responded with an unexpected error (${status}).`,
      status,
    });
  }
  if (err?.code === 'ECONNABORTED') {
    return new ApiClientError({
      code: 'TIMEOUT',
      message: 'The request took too long. Please try again.',
    });
  }
  return new ApiClientError({
    code: 'NETWORK_ERROR',
    message: "Can't reach the server. Check your connection and try again.",
  });
}

const http = axios.create({
  baseURL,
  timeout: 60_000, // case generation (Gemini + one retry) can take a while
  headers: { 'Content-Type': 'application/json' },
});

async function call(config) {
  try {
    const res = await http.request(config);
    return res.data.data; // envelope: { success: true, data }
  } catch (err) {
    throw normalizeError(err);
  }
}

export const api = {
  createCase: (body) => call({ method: 'post', url: '/cases', data: body }),
  listCases: ({ page = 1, limit = 9 } = {}) => call({ method: 'get', url: '/cases', params: { page, limit } }),
  getCase: (id) => call({ method: 'get', url: `/cases/${id}` }),
  discoverEvidence: (id, evidenceId) =>
    call({ method: 'post', url: `/cases/${id}/evidence/${evidenceId}/discover` }),
  requestHint: (id) => call({ method: 'post', url: `/cases/${id}/hints` }),
  saveTimeline: (id, eventIds) => call({ method: 'post', url: `/cases/${id}/timeline`, data: { eventIds } }),
  submitFindings: (id, findings) => call({ method: 'post', url: `/cases/${id}/submit`, data: findings }),
  getResult: (id) => call({ method: 'get', url: `/cases/${id}/result` }),
};
