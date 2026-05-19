// ============================================================
//  utils/helpers.js
//  Helpers gerais e pequenos utilitários compartilhados.
// ============================================================

import crypto from 'node:crypto';

/** Gera uma chave hash curta para uma string (usada no cache). */
export function hashKey(text) {
  return crypto.createHash('sha1').update(text.trim().toLowerCase()).digest('hex').slice(0, 16);
}

/** Trunca uma string adicionando reticências. */
export function truncate(text, max = 80) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/** Sleep promisificado. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mede o tempo de uma Promise e retorna {value, elapsedMs}. */
export async function timed(promise) {
  const t0 = Date.now();
  const value = await promise;
  return { value, elapsedMs: Date.now() - t0 };
}
