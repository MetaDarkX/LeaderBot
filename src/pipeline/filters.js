// ============================================================
//  pipeline/filters.js
//  Adapter entre o domínio puro (`#core/questionFilter`) e o
//  estado runtime do bot (líderes, grupos permitidos, etc.).
//
//  As heurísticas em si vivem em `#core/questionFilter` —
//  aqui só conectamos com `#modules/state` / `#modules/groups`.
// ============================================================

import { stateService } from '#modules/state';
import { groupService } from '#modules/groups';
import { normalizePhone } from '#core/normalize';
import {
  looksLikeQuestion,
  validateQuestion as validateQuestionCore,
} from '#core/questionFilter';

export { normalizePhone, looksLikeQuestion };

/**
 * Verifica se o autor é líder de um determinado grupo.
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
  return validateQuestionCore(text, {
    maxLength: stateService.runtime.maxQuestionLength,
  });
}
