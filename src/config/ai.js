// ============================================================
//  config/ai.js
//  Configuração dos provedores de IA (OpenAI / Gemini).
// ============================================================

import { env, toInt } from './env.js';

const provider = (env('AI_PROVIDER', { defaultValue: 'openai' }) || 'openai').toLowerCase();
if (!['openai', 'gemini'].includes(provider)) {
  throw new Error(`AI_PROVIDER inválido: "${provider}". Use "openai" ou "gemini".`);
}

if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
  throw new Error('AI_PROVIDER=openai exige OPENAI_API_KEY no .env');
}
if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
  throw new Error('AI_PROVIDER=gemini exige GEMINI_API_KEY no .env');
}

export const aiConfig = Object.freeze({
  provider,
  openai: Object.freeze({
    apiKey: env('OPENAI_API_KEY'),
    model: env('OPENAI_MODEL', { defaultValue: 'gpt-4o-mini' }),
  }),
  gemini: Object.freeze({
    apiKey: env('GEMINI_API_KEY'),
    model: env('GEMINI_MODEL', { defaultValue: 'gemini-1.5-flash-8b' }),
  }),
  maxRetries: env('AI_MAX_RETRIES', { defaultValue: 2, parse: toInt }),
  timeoutMs: env('AI_TIMEOUT_MS', { defaultValue: 5000, parse: toInt }),
  fallbackAnswer: env('FALLBACK_ANSWER', {
    defaultValue: 'Não consegui responder agora.',
  }),
});
