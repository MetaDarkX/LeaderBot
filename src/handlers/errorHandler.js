// ============================================================
//  handlers/errorHandler.js
//  Captura erros globais não tratados sem matar o processo
//  (para o PM2 não ficar reiniciando à toa).
// ============================================================

import { logger } from '../utils/logger.js';

export function installGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason) => {
    logger.error('[unhandledRejection]', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('[uncaughtException]', err);
  });
}
