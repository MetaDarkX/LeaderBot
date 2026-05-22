// ============================================================
//  pipeline/classifyMessage.js
//  IA analisa a janela de contexto e classifica a última mensagem.
// ============================================================

import { config } from '#config';
import { askAI } from '#providers/ai';
import * as chatBuffer from '#modules/chatBuffer';
import {
  CLASSIFY_SYSTEM_PROMPT,
  buildClassifyUserPrompt,
  parseClassifyAnswer,
} from '#core/classifyPrompt';

/**
 * @param {{ groupId: string, text: string, author: string, messageId: string, isLeader?: boolean }} params
 * @returns {Promise<{ isGincana: boolean, label: string, provider?: string, elapsedMs?: number }>}
 */
export async function classifyGincanaQuestion({ groupId, text, author, messageId, isLeader = true }) {
  if (!config.bot.classifyWithAi) {
    return { isGincana: true, label: 'classificação desativada' };
  }

  const entries = chatBuffer.window(groupId);
  const userPrompt = buildClassifyUserPrompt(entries, {
    text,
    author,
    messageId,
    isLeader,
  });

  const t0 = Date.now();
  const result = await askAI(userPrompt, {
    systemPrompt: CLASSIFY_SYSTEM_PROMPT,
    maxOutputTokens: 16,
    temperature: 0,
    label: 'classify',
  });
  const parsed = parseClassifyAnswer(result.answer);

  return {
    ...parsed,
    provider: result.provider,
    elapsedMs: Date.now() - t0,
    fallback: result.fallback,
  };
}
