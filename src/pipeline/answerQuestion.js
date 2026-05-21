// ============================================================
//  pipeline/answerQuestion.js
//  Use-case: dada uma pergunta já filtrada, devolve a resposta.
//   1. Tenta o cache (L1 mem + L2 Postgres).
//   2. Cai para a IA (com retry interno).
//   3. Em último caso, devolve fallback configurado.
// ============================================================

import { askAI } from '#providers/ai';
import { getCachedAnswer, setCachedAnswer } from '#modules/cache';
import { logger } from '#platform/logger';
import { timed, truncate } from '#platform/helpers';

const EMPTY_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

/**
 * @param {string} question
 * @returns {Promise<{
 *   answer: string,
 *   source: 'cache'|'ai'|'fallback',
 *   elapsedMs: number,
 *   provider: string|null,
 *   model: string|null,
 *   usage: {inputTokens:number, outputTokens:number, totalTokens:number},
 *   costUsd: number,
 * }>}
 */
export async function answerQuestion(question) {
  const cached = await getCachedAnswer(question);
  if (cached) {
    return {
      answer: cached,
      source: 'cache',
      elapsedMs: 0,
      provider: null,
      model: null,
      usage: EMPTY_USAGE,
      costUsd: 0,
    };
  }

  const { value, elapsedMs } = await timed(askAI(question));

  if (value.fallback) {
    return {
      answer: value.answer,
      source: 'fallback',
      elapsedMs,
      provider: value.provider,
      model: value.model,
      usage: value.usage ?? EMPTY_USAGE,
      costUsd: value.costUsd ?? 0,
    };
  }

  setCachedAnswer(question, value.answer, {
    provider: value.provider,
    model: value.model,
  });

  logger.debug(
    `[ai] ${value.provider}/${value.model} ${value.usage?.totalTokens ?? '?'}tk ` +
      `${elapsedMs}ms: "${truncate(value.answer, 60)}"`
  );

  return {
    answer: value.answer,
    source: 'ai',
    elapsedMs,
    provider: value.provider,
    model: value.model,
    usage: value.usage ?? EMPTY_USAGE,
    costUsd: value.costUsd ?? 0,
  };
}
