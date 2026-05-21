// ============================================================
//  config/session.js
//  Sessão do WhatsApp + Puppeteer.
// ============================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const sessionConfig = Object.freeze({
  name: env('SESSION_NAME', { defaultValue: 'wppbot-session' }),
  // .wwebjs_auth fica na raiz do projeto (dois níveis acima de /src/config)
  dataPath: path.resolve(__dirname, '..', '..', '.wwebjs_auth'),
  chromePath: env('CHROME_PATH', { defaultValue: '' }) || undefined,
});
