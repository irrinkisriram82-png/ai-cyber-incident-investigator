import { databaseStatus } from '../config/database.js';

// Reports status only. Never exposes keys, URIs, hostnames or versions.
export function createHealthHandler(env) {
  return (req, res) => {
    const database = databaseStatus();
    const ok = database === 'connected';
    res.status(ok ? 200 : 503).json({
      success: ok,
      data: {
        status: ok ? 'ok' : 'degraded',
        uptimeSeconds: Math.round(process.uptime()),
        database,
        aiConfigured: env.gemini.enabled,
        time: new Date().toISOString(),
      },
    });
  };
}
