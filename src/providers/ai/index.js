// ============================================================
//  providers/ai/index.js
//  Dispatcher do provedor de IA. Escolhe entre OpenAI/Gemini
//  baseado em `config.ai.provider`, aplica retry seletivo
//  com timeout e devolve resposta + uso de tokens + custo.
//
//  Para adicionar um novo provedor:
//    1. Crie src/providers/ai/<novo>.js com `ask<Novo>(question)`.
//    2. Adicione um case no `pickProvider()` abaixo.
//    3. Aceite o novo valor em config/ai.js (validação do AI_PROVIDER).
//    4. (Opcional) registre os preços em core/pricing.js.
// ============================================================

import { config } from '#config';
import { logger } from '#platform/logger';
import { retry } from '#platform/retry';
import { estimateCost, isKnownModel } from '#core/pricing';

import { askOpenAI, askOpenAIMedia } from './openai.js';
import { askGemini, askGeminiMedia } from './gemini.js';
import { shouldRetry } from './shouldRetry.js';

// Avisa uma vez por par (provider, model) desconhecido.
const _warnedModels = new Set();
function maybeWarnUnknownModel(provider, model) {
  const key = `${provider}:${model}`;
  if (_warnedModels.has(key)) return;
  _warnedModels.add(key);
  if (!isKnownModel(provider, model)) {
    logger.warn(
      `[ai] modelo "${model}" não reconhecido para ${provider}. ` +
        'Verifique o nome (ex.: gemini-1.5-flash-8b, gpt-4o-mini). ' +
        'O bot vai tentar mesmo assim; se a API rejeitar, todas as respostas cairão no fallback.'
    );
  }
}

/** Valida o modelo configurado no boot (chamado pelo index.js). */
export function validateConfiguredModel() {
  const provider = config.ai.provider;
  const model = provider === 'gemini' ? config.ai.gemini.model : config.ai.openai.model;
  maybeWarnUnknownModel(provider, model);
  return { provider, model };
}

function pickProvider() {
  const provider = config.ai.provider;
  switch (provider) {
    case 'gemini': return { provider, fn: askGemini, model: config.ai.gemini.model };
    case 'openai': return { provider, fn: askOpenAI, model: config.ai.openai.model };
    default:
      // Já validado em config/ai.js, mas defendemos aqui também.
      throw new Error(`AI_PROVIDER inválido: "${provider}"`);
  }
}

const EMPTY_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

/**
 * Pergunta para a IA configurada com retry seletivo e timeout.
 * Em caso de falha total, devolve `config.ai.fallbackAnswer`.
 *
 * @param {string} question
 * @param {{ systemPrompt?: string, maxOutputTokens?: number, temperature?: number, label?: string }} [opts]
 * @returns {Promise<{
 *   answer: string,
 *   provider: string,
 *   model: string,
 *   fallback: boolean,
 *   usage: {inputTokens:number, outputTokens:number, totalTokens:number},
 *   costUsd: number,
 * }>}
 */
export async function askAI(question, opts = {}) {
  const { provider, fn, model: fallbackModel } = pickProvider();
  maybeWarnUnknownModel(provider, fallbackModel);
  const label = opts.label ? `ai:${opts.label}` : `ai:${provider}`;

  try {
    const result = await retry(() => fn(question, opts), {
      retries: config.ai.maxRetries,
      baseDelayMs: 300,
      timeoutMs: config.ai.timeoutMs,
      label,
      shouldRetry,
    });

    const { answer, model, usage } = result;
    if (!answer) {
      logger.warn(`[ai] resposta vazia de ${provider}, usando fallback.`);
      return {
        answer: config.ai.fallbackAnswer,
        provider,
        model,
        fallback: true,
        usage,
        costUsd: estimateCost(provider, model, usage),
      };
    }
    return {
      answer,
      provider,
      model,
      fallback: false,
      usage,
      costUsd: estimateCost(provider, model, usage),
    };
  } catch (err) {
    logger.error(`[ai] todas as tentativas falharam (${provider}): ${err.message}`);
    return {
      answer: config.ai.fallbackAnswer,
      provider,
      model: fallbackModel,
      fallback: true,
      usage: { ...EMPTY_USAGE },
      costUsd: 0,
    };
  }
}

/**
 * Extração multimodal (OCR de imagem / transcrição de áudio) com o
 * provedor configurado. Diferente do askAI, falha total devolve `null` —
 * o caller decide o que fazer com mídia ilegível (geralmente ignorar).
 *
 * @param {string} prompt
 * @param {{ mimeType: string, dataBase64: string }} media
 * @param {{ maxOutputTokens?: number, label?: string }} [opts]
 * @returns {Promise<{answer: string, provider: string, model: string, usage: object, costUsd: number}|null>}
 */
export async function askAIMedia(prompt, media, opts = {}) {
  const provider = config.ai.provider;
  const fn = provider === 'gemini' ? askGeminiMedia : askOpenAIMedia;
  const label = `ai:${opts.label ?? 'media'}`;

  try {
    const result = await retry(() => fn(prompt, media, opts), {
      retries: config.ai.maxRetries,
      baseDelayMs: 300,
      // Mídia demora mais que texto (upload + processamento).
      timeoutMs: Math.max(config.ai.timeoutMs, 15_000),
      label,
      shouldRetry,
    });
    if (!result?.answer) return null;
    return {
      ...result,
      provider,
      costUsd: estimateCost(provider, result.model, result.usage),
    };
  } catch (err) {
    logger.warn(`[ai] extração de mídia falhou (${provider}): ${err.message}`);
    return null;
  }
}
