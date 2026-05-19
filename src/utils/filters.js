// ============================================================
//  utils/filters.js
//  Heurísticas para decidir se uma mensagem é, de fato,
//  uma pergunta válida da gincana.
//
//  Os filtros leem o `stateService` para que líderes e grupos
//  possam ser editados em tempo real via dashboard.
// ============================================================

import { stateService } from '../services/stateService.js';

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

export function normalizePhone(input) {
  return String(input ?? '').replace(/\D/g, '');
}

export function isLeader(authorId) {
  if (!authorId) return false;
  const phone = normalizePhone(authorId.split('@')[0]);
  return stateService.runtime.leaderNumbers.includes(phone);
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
