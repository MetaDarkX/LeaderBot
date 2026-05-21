// ============================================================
//  infra/db/migrate.js
//  Aplica o schema.sql no startup. É idempotente (usa
//  CREATE IF NOT EXISTS), então pode rodar a cada boot.
// ============================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPool, probe } from './pool.js';
import { logger } from '#platform/logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Conecta no Postgres com retry exponencial leve (o docker pode estar
 * subindo) e aplica o schema.sql.
 */
export async function migrate({ retries = 5, baseDelayMs = 800 } = {}) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      await probe();
      await getPool().query(sql);
      logger.success('[db] schema aplicado com sucesso');
      return true;
    } catch (err) {
      lastErr = err;
      attempt += 1;
      if (attempt > retries) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      logger.warn(
        `[db] tentativa ${attempt}/${retries} falhou (${err.message}). Repetindo em ${delay}ms…`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
