// ============================================================
//  providers/ai/openai.js
//  Adapter para a OpenAI Chat Completions API.
// ============================================================

import OpenAI from 'openai';
import { config } from '#config';
import { SYSTEM_PROMPT, MAX_OUTPUT_TOKENS, TEMPERATURE } from '#core/prompt';

let _client = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: config.ai.openai.apiKey });
  return _client;
}

/**
 * Faz uma pergunta para o OpenAI Chat Completions.
 * @param {string} question
 * @param {{ systemPrompt?: string, maxOutputTokens?: number, temperature?: number }} [opts]
 * @returns {Promise<{answer: string, model: string, usage: object}>}
 */
export async function askOpenAI(question, opts = {}) {
  const model = config.ai.openai.model;
  const res = await client().chat.completions.create({
    model,
    temperature: opts.temperature ?? TEMPERATURE,
    max_tokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
    messages: [
      { role: 'system', content: opts.systemPrompt ?? SYSTEM_PROMPT },
      { role: 'user', content: question },
    ],
  });
  const answer = res.choices?.[0]?.message?.content?.trim() ?? '';
  const usage = {
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: res.usage?.completion_tokens ?? 0,
    totalTokens: res.usage?.total_tokens ?? 0,
  };
  return { answer, model, usage };
}
