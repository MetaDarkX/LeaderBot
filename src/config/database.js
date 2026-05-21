// ============================================================
//  config/database.js
// ============================================================

import { env, toInt } from './env.js';

export const databaseConfig = Object.freeze({
  url: env('DATABASE_URL', {
    defaultValue: 'postgres://wppbot:wppbot@localhost:5432/wppbot',
  }),
  poolMax: env('DATABASE_POOL_MAX', { defaultValue: 10, parse: toInt }),
  connectTimeoutMs: env('DATABASE_CONNECT_TIMEOUT_MS', { defaultValue: 5000, parse: toInt }),
});
