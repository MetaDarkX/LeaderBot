// ============================================================
//  config/index.js
//  Entry point da configuração: agrega todos os domínios em um
//  único objeto `config` (compatível com o uso histórico).
//
//  Use `import { config } from '#config'` em código novo.
//  Subconjuntos também podem ser importados diretamente:
//    import { aiConfig } from '#config/ai'
// ============================================================

import { aiConfig } from './ai.js';
import { botConfig } from './bot.js';
import { databaseConfig } from './database.js';
import { sessionConfig } from './session.js';
import { webConfig } from './web.js';
import { logConfig } from './log.js';

export const config = Object.freeze({
  ai: aiConfig,
  bot: botConfig,
  database: databaseConfig,
  session: sessionConfig,
  web: webConfig,
  log: logConfig,
});

export { aiConfig, botConfig, databaseConfig, sessionConfig, webConfig, logConfig };
