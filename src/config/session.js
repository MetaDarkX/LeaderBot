// ============================================================
//  config/session.js
//  Sessão do WhatsApp + Puppeteer.
// ============================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultDataPath = path.resolve(__dirname, '..', '..', '.wwebjs_auth');

export const sessionConfig = Object.freeze({
  name: env('SESSION_NAME', { defaultValue: 'wppbot-session' }),
  // Em Docker/EasyPanel monte um volume em /app/.wwebjs_auth (ou defina WWEBJS_AUTH_PATH).
  dataPath: env('WWEBJS_AUTH_PATH', { defaultValue: defaultDataPath }),
  chromePath: env('CHROME_PATH', { defaultValue: '' }) || undefined,
});
