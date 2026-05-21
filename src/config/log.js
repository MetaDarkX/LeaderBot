// ============================================================
//  config/log.js
// ============================================================

import { env } from './env.js';

export const logConfig = Object.freeze({
  level: (env('LOG_LEVEL', { defaultValue: 'info' }) || 'info').toLowerCase(),
});
