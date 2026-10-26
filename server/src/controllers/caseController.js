import * as service from '../services/investigationService.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

/**
 * Thin HTTP layer: read validated input from req.valid, call the service, shape the response.
 * `gemini` is injectable so tests can substitute a mock (no key, no network).
 */
export function createCaseController({ env, gemini, logger = console }) {
  return {
    create: async (req, res) => {
      const data = await service.createCase(req.valid.body, { env, gemini, logger });
      ok(res, data, 201);
    },
    list: async (req, res) => ok(res, await service.listCases(req.valid.query)),
    get: async (req, res) => ok(res, await service.getCase(req.valid.params.id)),
    discover: async (req, res) => {
      const { id, evidenceId } = req.valid.params;
      ok(res, await service.discoverEvidence(id, evidenceId));
    },
    hint: async (req, res) => ok(res, await service.requestHint(req.valid.params.id)),
    timeline: async (req, res) =>
      ok(res, await service.saveTimeline(req.valid.params.id, req.valid.body.eventIds)),
    submit: async (req, res) => ok(res, await service.submitFindings(req.valid.params.id, req.valid.body)),
    result: async (req, res) => ok(res, await service.getResult(req.valid.params.id)),
  };
}
