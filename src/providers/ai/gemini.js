// ============================================================
//  providers/ai/gemini.js
//  Adapter para o Google Gemini (generative-ai SDK).
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '#config';
import { logger } from '#platform/logger';
import { SYSTEM_PROMPT, MAX_OUTPUT_TOKENS, TEMPERATURE } from '#core/prompt';

/** Extrai texto visível; modelos com "thinking" podem quebrar response.text(). */
function extractGeminiText(response) {
  if (!response) return '';
  try {
    const t = response.text()?.trim();
    if (t) return t;
  } catch {
    /* fallback abaixo */
  }
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();
}

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
  const response = result?.response;
  const answer = extractGeminiText(response);
  const finishReason = response?.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    logger.warn(
      `[gemini] resposta pode ter sido cortada (MAX_TOKENS, ${answer.length} chars). ` +
        'Use gemini-1.5-flash-8b ou gemini-2.0-flash se persistir.'
    );
  }
  const um = response?.usageMetadata ?? {};
  const usage = {
    inputTokens: um.promptTokenCount ?? 0,
    outputTokens: um.candidatesTokenCount ?? 0,
    totalTokens: um.totalTokenCount ?? 0,
  };
  return { answer, model, usage };
}
