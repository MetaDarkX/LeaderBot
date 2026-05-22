// ============================================================
//  modules/chatBuffer/index.js
//  Buffer circular por grupo: últimas N mensagens para contexto
//  na classificação de perguntas da gincana.
// ============================================================

import { config } from '#config';

/** @type {Map<string, Array<{id: string, author: string, isLeader: boolean, text: string, at: number}>>} */
const buffers = new Map();

function maxSize() {
  return Math.max(1, config.bot.chatBufferSize || 10);
}

/**
 * @param {string} groupId
 * @param {{ id: string, author: string, isLeader: boolean, text: string }} entry
 */
export function append(groupId, entry) {
  const text = (entry.text || '').trim();
  if (!groupId || !text) return;

  const buf = buffers.get(groupId) || [];
  const next = buf.filter((e) => e.id !== entry.id);
  next.push({
    id: entry.id,
    author: entry.author || '?',
    isLeader: Boolean(entry.isLeader),
    text,
    at: Date.now(),
  });
  while (next.length > maxSize()) next.shift();
  buffers.set(groupId, next);
}

/**
 * Atualiza o texto de uma entrada já no buffer (ex.: após OCR).
 */
export function amend(groupId, messageId, text) {
  const t = (text || '').trim();
  if (!groupId || !messageId || !t) return;
  const buf = buffers.get(groupId);
  if (!buf) return;
  const idx = buf.findIndex((e) => e.id === messageId);
  if (idx === -1) return;
  buf[idx] = { ...buf[idx], text: t, at: Date.now() };
}

/** @returns {ReadonlyArray<{id: string, author: string, isLeader: boolean, text: string, at: number}>} */
export function window(groupId) {
  return buffers.get(groupId) || [];
}

/** Limpa o buffer de um grupo (útil em testes). */
export function clear(groupId) {
  if (groupId) buffers.delete(groupId);
  else buffers.clear();
}
