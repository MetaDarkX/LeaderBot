// ============================================================
//  platform/crashHandlers.js
//  Captura erros globais não tratados sem matar o processo
//  (para o PM2 não ficar reiniciando à toa).
// ============================================================

import { logger } from '#platform/logger';

export function installCrashHandlers() {
  process.on('unhandledRejection', (reason) => {
    logger.error('[unhandledRejection]', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('[uncaughtException]', err);
  });
}
