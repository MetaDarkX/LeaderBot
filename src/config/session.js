// ============================================================
//  config/session.js
//  Sessão do WhatsApp + Puppeteer.
// ============================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, toBool } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultDataPath = path.resolve(__dirname, '..', '..', '.wwebjs_auth');

export const sessionConfig = Object.freeze({
  name: env('SESSION_NAME', { defaultValue: 'wppbot-session' }),
  // Em Docker/EasyPanel monte um volume em /app/.wwebjs_auth (ou defina WWEBJS_AUTH_PATH).
  dataPath: env('WWEBJS_AUTH_PATH', { defaultValue: defaultDataPath }),
  chromePath: env('CHROME_PATH', { defaultValue: '' }) || undefined,
  // Modo leve: bloqueia imagens de UI/avatares/fontes no Chromium.
  // Desative (CHROME_LITE=false) se notar algo estranho no WhatsApp Web.
  chromeLite: env('CHROME_LITE', { defaultValue: true, parse: toBool }),
});
