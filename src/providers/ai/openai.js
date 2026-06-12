// ============================================================
//  providers/ai/openai.js
//  Adapter para a OpenAI Chat Completions API.
// ============================================================

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
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

const EMPTY_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

/**
 * Pergunta multimodal: imagem via vision, áudio via Whisper.
 * @param {string} prompt
 * @param {{ mimeType: string, dataBase64: string }} media
 * @param {{ maxOutputTokens?: number, temperature?: number }} [opts]
 * @returns {Promise<{answer: string, model: string, usage: object}>}
 */
export async function askOpenAIMedia(prompt, media, opts = {}) {
  if (media.mimeType.startsWith('audio/')) {
    const ext = media.mimeType.includes('ogg') ? 'ogg' : 'mp3';
    const file = await toFile(Buffer.from(media.dataBase64, 'base64'), `audio.${ext}`, {
      type: media.mimeType,
    });
    const tr = await client().audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'pt',
    });
    return { answer: tr.text?.trim() ?? '', model: 'whisper-1', usage: { ...EMPTY_USAGE } };
  }

  const model = config.ai.openai.model;
  const res = await client().chat.completions.create({
    model,
    temperature: opts.temperature ?? 0,
    max_tokens: opts.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:${media.mimeType};base64,${media.dataBase64}` },
          },
        ],
      },
    ],
  });
  return {
    answer: res.choices?.[0]?.message?.content?.trim() ?? '',
    model,
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
      totalTokens: res.usage?.total_tokens ?? 0,
    },
  };
}
