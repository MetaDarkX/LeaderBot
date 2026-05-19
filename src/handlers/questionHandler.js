// ============================================================
//  handlers/questionHandler.js
//  Recebe a pergunta já filtrada e devolve a resposta da IA,
//  passando pelo cache antes de qualquer chamada externa.
// ============================================================

import { askAI } from '../services/aiService.js';
import { getCachedAnswer, setCachedAnswer } from '../services/cacheService.js';
import { logger } from '../utils/logger.js';
import { timed, truncate } from '../utils/helpers.js';

/**
 * Resolve uma pergunta:
 *   1. Tenta o cache.
 *   2. Cai para a IA (com retry interno).
 *   3. Em último caso, devolve fallback.
 *
 * @param {string} question
 * @returns {Promise<{answer: string, source: 'cache'|'ai'|'fallback', elapsedMs: number}>}
 */
export async function resolveQuestion(question) {
  const cached = getCachedAnswer(question);
  if (cached) {
    return { answer: cached, source: 'cache', elapsedMs: 0 };
  }

  const { value, elapsedMs } = await timed(askAI(question));

  if (value.fallback) {
    return { answer: value.answer, source: 'fallback', elapsedMs };
  }

  setCachedAnswer(question, value.answer);
  logger.debug(
    `[ai] ${value.provider} respondeu em ${elapsedMs}ms: "${truncate(value.answer, 60)}"`
  );
  return { answer: value.answer, source: 'ai', elapsedMs };
}
