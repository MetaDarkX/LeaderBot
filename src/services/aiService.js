// ============================================================
//  services/aiService.js
//  Camada de abstração para provedores de IA.
//  Hoje suporta OpenAI e Google Gemini, escolhidos via config.
// ============================================================

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';

const SYSTEM_PROMPT = `Você é um assistente que participa de uma gincana no WhatsApp.
Regras:
- Responda em PORTUGUÊS, de forma DIRETA e CURTA (idealmente 1 a 2 frases).
- Vá direto à resposta, sem "vamos lá", "claro!", "ótima pergunta" etc.
- Quando a pergunta pedir um único dado (nome, número, ano, lugar), responda APENAS com esse dado.
- Se for V/F ou múltipla escolha, responda só com a alternativa correta.
- Se não souber com razoável certeza, responda exatamente: "Não sei".`;

/** Cliente OpenAI (criado sob demanda). */
let _openai = null;
function openaiClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: config.ai.openai.apiKey });
  return _openai;
}

/** Cliente Gemini (criado sob demanda). */
let _gemini = null;
function geminiClient() {
  if (!_gemini) {
    const genAI = new GoogleGenerativeAI(config.ai.gemini.apiKey);
    _gemini = genAI.getGenerativeModel({
      model: config.ai.gemini.model,
      systemInstruction: SYSTEM_PROMPT,
    });
  }
  return _gemini;
}

/** Chama OpenAI Chat Completions. */
async function askOpenAI(question) {
  const res = await openaiClient().chat.completions.create({
    model: config.ai.openai.model,
    temperature: 0.2,
    max_tokens: 200,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question },
    ],
  });
  return res.choices?.[0]?.message?.content?.trim() ?? '';
}

/** Chama Google Gemini. */
async function askGemini(question) {
  const result = await geminiClient().generateContent({
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
  });
  return result?.response?.text?.()?.trim() ?? '';
}

/**
 * Pergunta para a IA configurada com retry e timeout.
 * Em caso de falha total, retorna config.ai.fallbackAnswer.
 *
 * @param {string} question  Texto da pergunta
 * @returns {Promise<{answer: string, provider: string, fallback: boolean}>}
 */
export async function askAI(question) {
  const provider = config.ai.provider;
  const fn = provider === 'gemini' ? askGemini : askOpenAI;

  try {
    const answer = await retry(() => fn(question), {
      retries: config.ai.maxRetries,
      baseDelayMs: 300,
      timeoutMs: config.ai.timeoutMs,
      label: `ai:${provider}`,
    });

    if (!answer) {
      logger.warn(`[ai] resposta vazia de ${provider}, usando fallback.`);
      return { answer: config.ai.fallbackAnswer, provider, fallback: true };
    }
    return { answer, provider, fallback: false };
  } catch (err) {
    logger.error(`[ai] todas as tentativas falharam (${provider}): ${err.message}`);
    return { answer: config.ai.fallbackAnswer, provider, fallback: true };
  }
}
