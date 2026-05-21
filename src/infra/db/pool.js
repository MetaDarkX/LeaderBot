// ============================================================
//  infra/db/pool.js
//  Pool de conexão PostgreSQL + helpers de query.
// ============================================================

import pg from 'pg';
import { config } from '#config';
import { logger } from '#platform/logger';

const { Pool } = pg;

let pool = null;
let ready = false;
let lastError = null;

/**
 * Lazily inicializa o pool. Erros aqui são logados, mas não derrubam o
 * processo: a aplicação detecta `isReady()` antes de usar o DB.
 */
export function getPool() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: config.database.url,
    max: config.database.poolMax,
    connectionTimeoutMillis: config.database.connectTimeoutMs,
    idleTimeoutMillis: 30_000,
  });
  pool.on('error', (err) => {
    lastError = err.message;
    logger.error(`[db] erro no pool: ${err.message}`);
  });
  return pool;
}

/** Executa uma query e devolve { rows, rowCount }. */
export async function query(text, params = []) {
  const p = getPool();
  return p.query(text, params);
}

/**
 * Executa um bloco dentro de uma transação. Faz COMMIT no sucesso e
 * ROLLBACK em qualquer erro.
 */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* noop */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Testa a conexão e marca como pronta. */
export async function probe() {
  try {
    const r = await query('SELECT 1 AS ok');
    ready = r.rows?.[0]?.ok === 1;
    lastError = null;
    return ready;
  } catch (err) {
    ready = false;
    lastError = err.message;
    throw err;
  }
}

export function isReady() {
  return ready;
}

export function lastDbError() {
  return lastError;
}

export async function closePool() {
  if (!pool) return;
  await pool.end().catch(() => {});
  pool = null;
  ready = false;
}
