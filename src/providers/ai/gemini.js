// ============================================================
//  providers/ai/gemini.js
//  Adapter para o Google Gemini (generative-ai SDK).
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '#config';
import { SYSTEM_PROMPT, MAX_OUTPUT_TOKENS, TEMPERATURE } from '#core/prompt';

let _client = null;
function client() {
  if (!_client) {
    const genAI = new GoogleGenerativeAI(config.ai.gemini.apiKey);
    _client = genAI.getGenerativeModel({
      model: config.ai.gemini.model,
      systemInstruction: SYSTEM_PROMPT,
    });
  }
  return _client;
}

/**
 * Faz uma pergunta para o Google Gemini.
 * @param {string} question
 * @returns {Promise<{answer: string, model: string, usage: object}>}
 */
export async function askGemini(question) {
  const model = config.ai.gemini.model;
  const result = await client().generateContent({
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: { temperature: TEMPERATURE, maxOutputTokens: MAX_OUTPUT_TOKENS },
  });
  const answer = result?.response?.text?.()?.trim() ?? '';
  const um = result?.response?.usageMetadata ?? {};
  const usage = {
    inputTokens: um.promptTokenCount ?? 0,
    outputTokens: um.candidatesTokenCount ?? 0,
    totalTokens: um.totalTokenCount ?? 0,
  };
  return { answer, model, usage };
}
