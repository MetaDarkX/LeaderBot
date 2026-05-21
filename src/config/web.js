// ============================================================
//  config/web.js
//  Dashboard web (HTTP + WebSocket).
// ============================================================

import { env, toInt } from './env.js';

export const webConfig = Object.freeze({
  enabled: env('WEB_ENABLED', { defaultValue: 'true' }) !== 'false',
  host: env('WEB_HOST', { defaultValue: '0.0.0.0' }),
  port: env('WEB_PORT', { defaultValue: 3000, parse: toInt }),
  // Token opcional; quando definido, é exigido em /api/* e no Socket.IO.
  token: env('WEB_TOKEN', { defaultValue: '' }) || null,
});
