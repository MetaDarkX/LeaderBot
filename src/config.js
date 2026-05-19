// ============================================================
//  config.js
//  Carrega e valida variáveis de ambiente, expondo um objeto
//  `config` único e congelado para o restante da aplicação.
// ============================================================

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lê variável de ambiente com fallback e parsing opcional.
 * Lança erro caso seja obrigatória e não esteja definida.
 */
function env(key, { required = false, defaultValue = undefined, parse = (v) => v } = {}) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    if (required) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
    }
    return defaultValue;
  }
  return parse(raw);
}

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`Esperado inteiro, recebi: "${v}"`);
  return n;
};

const toList = (v) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Provedor de IA escolhido
const aiProvider = (env('AI_PROVIDER', { defaultValue: 'openai' }) || 'openai').toLowerCase();
if (!['openai', 'gemini'].includes(aiProvider)) {
  throw new Error(`AI_PROVIDER inválido: "${aiProvider}". Use "openai" ou "gemini".`);
}

// Valida a chave do provedor escolhido
if (aiProvider === 'openai' && !process.env.OPENAI_API_KEY) {
  throw new Error('AI_PROVIDER=openai exige OPENAI_API_KEY no .env');
}
if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
  throw new Error('AI_PROVIDER=gemini exige GEMINI_API_KEY no .env');
}

export const config = Object.freeze({
  ai: Object.freeze({
    provider: aiProvider,
    openai: Object.freeze({
      apiKey: env('OPENAI_API_KEY'),
      model: env('OPENAI_MODEL', { defaultValue: 'gpt-4o-mini' }),
    }),
    gemini: Object.freeze({
      apiKey: env('GEMINI_API_KEY'),
      model: env('GEMINI_MODEL', { defaultValue: 'gemini-1.5-flash' }),
    }),
    maxRetries: env('AI_MAX_RETRIES', { defaultValue: 2, parse: toInt }),
    timeoutMs: env('AI_TIMEOUT_MS', { defaultValue: 8000, parse: toInt }),
    fallbackAnswer: env('FALLBACK_ANSWER', {
      defaultValue: 'Não consegui responder agora.',
    }),
  }),

  bot: Object.freeze({
    // Líderes são guardados sem o sufixo "@c.us" e sem caracteres não-numéricos
    leaderNumbers: env('LEADER_NUMBERS', { defaultValue: '', parse: toList }).map((n) =>
      n.replace(/\D/g, '')
    ),
    allowedGroups: env('ALLOWED_GROUPS', { defaultValue: '', parse: toList }),
    cooldownMs: env('COOLDOWN_MS', { defaultValue: 1500, parse: toInt }),
    cacheTtlSeconds: env('CACHE_TTL_SECONDS', { defaultValue: 3600, parse: toInt }),
    maxQuestionLength: env('MAX_QUESTION_LENGTH', { defaultValue: 500, parse: toInt }),
  }),

  session: Object.freeze({
    name: env('SESSION_NAME', { defaultValue: 'wppbot-session' }),
    // .wwebjs_auth fica na raiz do projeto (um nível acima de /src)
    dataPath: path.resolve(__dirname, '..', '.wwebjs_auth'),
    chromePath: env('CHROME_PATH', { defaultValue: '' }) || undefined,
  }),

  log: Object.freeze({
    level: (env('LOG_LEVEL', { defaultValue: 'info' }) || 'info').toLowerCase(),
  }),

  web: Object.freeze({
    enabled: env('WEB_ENABLED', { defaultValue: 'true' }) !== 'false',
    host: env('WEB_HOST', { defaultValue: '0.0.0.0' }),
    port: env('WEB_PORT', { defaultValue: 3000, parse: toInt }),
    // Token opcional. Quando definido, é exigido em /api/* e no Socket.IO.
    token: env('WEB_TOKEN', { defaultValue: '' }) || null,
  }),
});
