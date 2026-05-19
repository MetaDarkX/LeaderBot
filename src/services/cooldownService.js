// ============================================================
//  services/cooldownService.js
//  Garante um intervalo mínimo entre respostas a um mesmo líder,
//  reduzindo o risco de o WhatsApp banir a conta por flood.
// ============================================================

import { config } from '../config.js';

const lastReply = new Map(); // leaderId -> timestamp em ms

/**
 * Verifica se podemos responder ao líder agora.
 * @returns {{ok: boolean, waitMs: number}}
 */
export function canReply(leaderId) {
  const now = Date.now();
  const prev = lastReply.get(leaderId) ?? 0;
  const diff = now - prev;
  if (diff >= config.bot.cooldownMs) {
    return { ok: true, waitMs: 0 };
  }
  return { ok: false, waitMs: config.bot.cooldownMs - diff };
}

/** Marca o instante atual como última resposta enviada a este líder. */
export function markReplied(leaderId) {
  lastReply.set(leaderId, Date.now());
}

/** Reseta o cooldown (útil em testes). */
export function resetCooldown(leaderId) {
  if (leaderId) lastReply.delete(leaderId);
  else lastReply.clear();
}
