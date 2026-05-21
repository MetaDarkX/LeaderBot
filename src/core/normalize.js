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

/**
 * Identificador canônico do participante/líder no WhatsApp.
 * Preserva o sufixo (@lid, @c.us, …) — é o que costuma vir em `message.author`.
 *
 * Ex.: "59619045069032@lid" → "59619045069032@lid"
 *      "5511999999999@c.us"  → "5511999999999@c.us"
 *      "5511999999999"       → "5511999999999" (legado, só dígitos)
 */
export function normalizeMemberId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower.includes('@')) {
    const at = lower.indexOf('@');
    const user = lower.slice(0, at);
    const domain = lower.slice(at + 1);
    if (!domain) return user.replace(/\D/g, '') || user;
    const userNorm = /^\d+$/.test(user) ? user : user.replace(/\D/g, '') || user;
    return `${userNorm}@${domain}`;
  }
  return raw.replace(/\D/g, '');
}

/** wa_id completo do participante; fallback telefone@c.us. */
export function memberIdFromParticipant({ waId, wa_id, phone } = {}) {
  const id = waId ?? wa_id;
  if (id) return normalizeMemberId(id);
  const digits = normalizePhone(phone);
  return digits ? normalizeMemberId(`${digits}@c.us`) : '';
}
