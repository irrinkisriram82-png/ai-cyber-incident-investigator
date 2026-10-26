import 'dotenv/config';
import { loadEnv } from './src/config/env.js';
import { connectDatabase, disconnectDatabase } from './src/config/database.js';
import { createApp } from './src/app.js';

// Never print connection strings, even inside driver error messages.
const redact = (msg) => String(msg).replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted-uri]');

async function main() {
  const env = loadEnv();

  await connectDatabase(env.mongodbUri);
  console.log('[db] connected');

  const app = createApp(env);
  const server = app.listen(env.port, () => {
    console.log(
      `[api] listening on port ${env.port} (${env.nodeEnv}) - AI ${
        env.gemini.enabled ? 'enabled' : 'disabled: curated demo cases only'
      }`,
    );
  });

  // Request/connection timeouts (SPEC §12).
  server.requestTimeout = 60_000;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 65_000;

  const shutdown = (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection:', redact(reason?.message ?? reason));
});

main().catch((err) => {
  console.error('[api] failed to start:', redact(err?.message ?? err));
  process.exit(1);
});
