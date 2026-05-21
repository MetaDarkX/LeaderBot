// ============================================================
//  platform/retry.js
//  Retry com backoff exponencial + timeout por tentativa.
//  Aceita predicate `shouldRetry(err)` para abortar cedo em
//  erros não-retryable (4xx que não são 429, etc.) e respeita
//  o cabeçalho `Retry-After` quando presente.
// ============================================================

import { logger } from '#platform/logger';

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

/** Lê Retry-After (segundos ou data HTTP) do erro, se houver. */
function retryAfterMs(err) {
  const headers =
    err?.response?.headers ||
    err?.headers ||
    err?.cause?.headers ||
    null;
  if (!headers) return null;
  const get = typeof headers.get === 'function' ? (k) => headers.get(k) : (k) => headers[k];
  const raw = get('retry-after') || get('Retry-After');
  if (!raw) return null;
  const asInt = Number.parseInt(raw, 10);
  if (Number.isFinite(asInt)) return Math.max(0, asInt * 1000);
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

/**
 * Executa `fn` com retries e backoff exponencial.
 * @param {() => Promise<T>} fn
 * @param {object}   opts
 * @param {number}   [opts.retries=2]
 * @param {number}   [opts.baseDelayMs=300]
 * @param {number}   [opts.timeoutMs=8000]
 * @param {string}   [opts.label='task']
 * @param {(err:any)=>boolean} [opts.shouldRetry]
 * @returns {Promise<T>}
 */
export async function retry(
  fn,
  { retries = 2, baseDelayMs = 300, timeoutMs = 8000, label = 'task', shouldRetry } = {}
) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      lastErr = err;
      const isLast = attempt === retries;
      const retryable = typeof shouldRetry === 'function' ? !!shouldRetry(err) : true;

      logger.warn(
        `[retry] "${label}" falhou (tentativa ${attempt + 1}/${retries + 1}): ${err.message}` +
          (retryable ? '' : ' [não-retryable, abortando]')
      );

      if (isLast || !retryable) break;

      const hinted = retryAfterMs(err);
      const backoff = baseDelayMs * 2 ** attempt;
      const delay = hinted != null ? Math.max(hinted, backoff) : backoff;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
