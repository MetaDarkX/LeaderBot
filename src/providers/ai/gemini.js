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

let _defaultModel = null;

function getModel(systemInstruction) {
  const genAI = new GoogleGenerativeAI(config.ai.gemini.apiKey);
  return genAI.getGenerativeModel({
    model: config.ai.gemini.model,
    systemInstruction,
  });
}

function defaultModel() {
  if (!_defaultModel) _defaultModel = getModel(SYSTEM_PROMPT);
  return _defaultModel;
}

/** Modelos 2.5 Flash (não Lite) gastam tokens em "thinking" por padrão — desligamos. */
function needsThinkingOff(modelName) {
  return /gemini-2\.5-flash(?!-lite)/i.test(modelName || '');
}

function buildGenerationConfig(opts) {
  const generationConfig = {
    temperature: opts.temperature ?? TEMPERATURE,
    maxOutputTokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
  };
  if (needsThinkingOff(config.ai.gemini.model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  return generationConfig;
}

/**
 * Faz uma pergunta para o Google Gemini.
 * @param {string} question
 * @param {{ systemPrompt?: string, maxOutputTokens?: number, temperature?: number }} [opts]
 * @returns {Promise<{answer: string, model: string, usage: object}>}
 */
export async function askGemini(question, opts = {}) {
  const model = opts.systemPrompt ? getModel(opts.systemPrompt) : defaultModel();
  const modelName = config.ai.gemini.model;
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: buildGenerationConfig(opts),
  });
  const response = result?.response;
  const answer = extractGeminiText(response);
  const finishReason = response?.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    logger.warn(
      `[gemini] resposta pode ter sido cortada (MAX_TOKENS, ${answer.length} chars). ` +
        'Prefira gemini-2.5-flash-lite ou aumente maxOutputTokens; em 2.5-flash use thinkingBudget=0.'
    );
  }
  const um = response?.usageMetadata ?? {};
  const usage = {
    inputTokens: um.promptTokenCount ?? 0,
    outputTokens: um.candidatesTokenCount ?? 0,
    totalTokens: um.totalTokenCount ?? 0,
  };
  return { answer, model: modelName, usage };
}
