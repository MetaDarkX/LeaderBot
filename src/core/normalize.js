// ============================================================
//  core/normalize.js
//  Normalização e hash de texto (para cache).
//  Função PURA — sem efeitos colaterais.
// ============================================================

import crypto from 'node:crypto';

/**
 * Normaliza um texto para fins de cache:
 *   - tira acentos (NFD)
 *   - lowercase
 *   - remove pontuação comum
 *   - colapsa espaços
 * Aumenta drasticamente o hit-rate quando a mesma pergunta chega
 * com variações triviais de escrita.
 */
export function normalizeForHash(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:"'`´()\[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gera uma chave hash curta para uma string (usada no cache). */
export function hashKey(text) {
  return crypto.createHash('sha1').update(normalizeForHash(text)).digest('hex').slice(0, 16);
}

/** Mantém somente os dígitos — útil para padronizar telefones. */
export function normalizePhone(input) {
  return String(input ?? '').replace(/\D/g, '');
}
