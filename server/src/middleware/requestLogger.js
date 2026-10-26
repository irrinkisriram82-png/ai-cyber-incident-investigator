// Minimal access log: method, path (no query string), status, duration.
// Bodies, headers and secrets are never logged.
export function requestLogger({ enabled = true } = {}) {
  return (req, res, next) => {
    if (!enabled) return next();
    const start = process.hrtime.bigint();
    const path = req.originalUrl.split('?')[0]; // captured now: req.path changes after routing
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    return next();
  };
}
