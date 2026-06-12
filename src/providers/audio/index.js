// ============================================================
//  providers/audio/index.js
//  Transcrição de áudios (pergunta ditada por voz) usando o
//  provedor de IA já configurado:
//   - Gemini: áudio inline no próprio flash (multimodal nativo)
//   - OpenAI: Whisper (audio.transcriptions)
// ============================================================

import { config } from '#config';
import { logger } from '#platform/logger';
import { askAIMedia } from '#providers/ai';

// Voice notes do WhatsApp são pequenas; acima disso é música/podcast.
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

const TRANSCRIBE_PROMPT =
  'Transcreva este áudio em português. Responda SOMENTE com a transcrição, ' +
  'sem comentários. Se não houver fala compreensível, responda VAZIO.';

/**
 * Transcreve um áudio para texto.
 * @param {Buffer} audioBuffer  Buffer com o áudio (ogg/opus geralmente, do WhatsApp)
 * @param {string} [mimetype]
 * @returns {Promise<string|null>}
 */
export async function transcribeAudio(audioBuffer, mimetype = 'audio/ogg') {
  if (!config.bot.audioEnabled) return null;
  if (!audioBuffer?.length) return null;
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    logger.warn(`[audio] áudio muito grande (${Math.round(audioBuffer.length / 1024)}KB), ignorando`);
    return null;
  }

  // O WhatsApp manda "audio/ogg; codecs=opus" — a API só quer o mime base.
  const mimeType = (mimetype || 'audio/ogg').split(';')[0].trim();

  const result = await askAIMedia(
    TRANSCRIBE_PROMPT,
    { mimeType, dataBase64: audioBuffer.toString('base64') },
    { maxOutputTokens: 1024, label: 'transcribe' }
  );

  const text = result?.answer?.trim();
  if (!text || /^vazio$/i.test(text)) return null;

  logger.info(
    `[audio] ${text.length} chars transcritos via ${result.provider}/${result.model} ` +
      `($${(result.costUsd ?? 0).toFixed(6)})`
  );
  return text;
}
