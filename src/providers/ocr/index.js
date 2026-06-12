// ============================================================
//  providers/ocr/index.js
//  Extração de texto de imagens (prints de pergunta da gincana)
//  usando o provedor de IA já configurado:
//   - Gemini: imagem inline no próprio flash (multimodal nativo)
//   - OpenAI: vision via chat completions
// ============================================================

import { config } from '#config';
import { logger } from '#platform/logger';
import { askAIMedia } from '#providers/ai';

// Acima disso o upload fica caro/lento e dificilmente é uma pergunta.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const OCR_PROMPT =
  'Transcreva TODO o texto visível nesta imagem, em português, preservando ' +
  'quebras de linha e alternativas (A, B, C…). Responda SOMENTE com o texto ' +
  'transcrito, sem comentários. Se não houver texto legível, responda VAZIO.';

/**
 * Extrai texto de um buffer de imagem.
 * @param {Buffer} imageBuffer  Buffer com a imagem (jpg/png/webp)
 * @param {string} [mimetype]   Ex.: "image/jpeg"
 * @returns {Promise<string|null>}
 */
export async function extractTextFromImage(imageBuffer, mimetype = 'image/jpeg') {
  if (!config.bot.ocrEnabled) return null;
  if (!imageBuffer?.length) return null;
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    logger.warn(`[ocr] imagem muito grande (${Math.round(imageBuffer.length / 1024)}KB), ignorando`);
    return null;
  }

  const result = await askAIMedia(
    OCR_PROMPT,
    { mimeType: mimetype, dataBase64: imageBuffer.toString('base64') },
    { maxOutputTokens: 1024, label: 'ocr' }
  );

  const text = result?.answer?.trim();
  if (!text || /^vazio$/i.test(text)) return null;

  logger.info(
    `[ocr] ${text.length} chars extraídos via ${result.provider}/${result.model} ` +
      `($${(result.costUsd ?? 0).toFixed(6)})`
  );
  return text;
}
