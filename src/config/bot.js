// ============================================================
//  config/bot.js
//  Comportamento do bot: grupos permitidos, cooldown, cache, etc.
// ============================================================

import { env, toInt, toList } from './env.js';

export const botConfig = Object.freeze({
  allowedGroups: env('ALLOWED_GROUPS', { defaultValue: '', parse: toList }),
  cooldownMs: env('COOLDOWN_MS', { defaultValue: 1500, parse: toInt }),
  cacheTtlSeconds: env('CACHE_TTL_SECONDS', { defaultValue: 604800, parse: toInt }),
  maxQuestionLength: env('MAX_QUESTION_LENGTH', { defaultValue: 300, parse: toInt }),
});
