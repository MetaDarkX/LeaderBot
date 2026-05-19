// ============================================================
//  utils/retry.js
//  Retry com backoff exponencial + timeout por tentativa.
// ============================================================

import { logger } from './logger.js';

/** Promise.race com timeout que rejeita após `ms`. */
export function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timeout de ${ms}ms excedido em "${label}"`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Executa `fn` com retries e backoff exponencial.
 * @param {() => Promise<T>} fn  Função assíncrona a executar
 * @param {object} opts
 * @param {number} opts.retries     Número de tentativas adicionais (padrão 2)
 * @param {number} opts.baseDelayMs Delay base entre tentativas (padrão 300ms)
 * @param {number} opts.timeoutMs   Timeout por tentativa (padrão 8000ms)
 * @param {string} opts.label       Rótulo para logs
 * @returns {Promise<T>}
 */
export async function retry(fn, { retries = 2, baseDelayMs = 300, timeoutMs = 8000, label = 'task' } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      lastErr = err;
      const isLast = attempt === retries;
      logger.warn(
        `[retry] "${label}" falhou (tentativa ${attempt + 1}/${retries + 1}): ${err.message}`
      );
      if (isLast) break;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
