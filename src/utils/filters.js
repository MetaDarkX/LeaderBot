// ============================================================
//  utils/filters.js
//  Heurísticas para decidir se uma mensagem é, de fato,
//  uma pergunta válida da gincana.
//
//  Os filtros leem o `stateService` para que líderes e grupos
//  possam ser editados em tempo real via dashboard.
// ============================================================

import { stateService } from '../services/stateService.js';
import { groupService } from '../services/groupService.js';
import { normalizePhone } from './helpers.js';

export { normalizePhone };

const QUESTION_KEYWORDS = [
  'qual', 'quais', 'quem', 'quando', 'onde', 'como', 'porque', 'por que',
  'quanto', 'quantos', 'quantas', 'o que', 'cite', 'diga', 'explique',
  'defina', 'nome', 'capital', 'verdadeiro ou falso', 'v ou f',
];

export function looksLikeQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim().toLowerCase();
  if (t.length < 3) return false;
  if (t.includes('?')) return true;
  return QUESTION_KEYWORDS.some((kw) => t.startsWith(kw + ' ') || t.includes(' ' + kw + ' '));
}

/**
 * Verifica se o autor é líder de um determinado grupo.
 * Líderes agora são definidos POR grupo no banco (via dashboard).
 * Aceita tanto `authorId` (com sufixo @c.us) quanto telefone "cru".
 */
export function isLeaderOfGroup(authorId, groupId) {
  if (!authorId || !groupId) return false;
  const phone = normalizePhone(String(authorId).split('@')[0]);
  return groupService.isLeaderOfGroup(groupId, phone);
}

export function isAllowedGroup(groupId) {
  const list = stateService.runtime.allowedGroups;
  if (!list.length) return true;
  return list.includes(groupId);
}

export function validateQuestion(text) {
  const max = stateService.runtime.maxQuestionLength;
  if (!text) return { ok: false, reason: 'mensagem vazia' };
  if (text.length > max) {
    return { ok: false, reason: `mensagem maior que ${max} caracteres` };
  }
  if (!looksLikeQuestion(text)) {
    return { ok: false, reason: 'não parece pergunta' };
  }
  return { ok: true };
}
