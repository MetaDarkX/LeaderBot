// ============================================================
//  services/ocrService.js
//  Placeholder para extração de texto a partir de imagens.
//
//  ▸ Suporte FUTURO. Hoje retorna null.
//  ▸ Quando quiser ativar, instale uma das opções abaixo
//    e implemente `extractTextFromImage`:
//      - tesseract.js                (offline, mais lento)
//      - @google-cloud/vision        (Google Vision API)
//      - openai (gpt-4o vision)      (já está instalado!)
// ============================================================

import { logger } from '../utils/logger.js';

/**
 * Extrai texto de um buffer de imagem.
 * @param {Buffer} _imageBuffer  Buffer com a imagem (jpg/png)
 * @param {string} [_mimetype]   Ex.: "image/jpeg"
 * @returns {Promise<string|null>}
 */
// eslint-disable-next-line no-unused-vars
export async function extractTextFromImage(_imageBuffer, _mimetype) {
  logger.debug('[ocr] OCR ainda não implementado — retornando null.');
  return null;

  /* ─────────────────────────────────────────────────────────────
   * EXEMPLO usando OpenAI Vision (descomente e adapte):
   *
   * import OpenAI from 'openai';
   * import { config } from '../config.js';
   * const openai = new OpenAI({ apiKey: config.ai.openai.apiKey });
   * const b64 = _imageBuffer.toString('base64');
   * const res = await openai.chat.completions.create({
   *   model: 'gpt-4o-mini',
   *   messages: [{
   *     role: 'user',
   *     content: [
   *       { type: 'text', text: 'Extraia o texto desta imagem. Responda só com o texto.' },
   *       { type: 'image_url', image_url: { url: `data:${_mimetype};base64,${b64}` } },
   *     ],
   *   }],
   * });
   * return res.choices?.[0]?.message?.content ?? null;
   * ───────────────────────────────────────────────────────────── */
}
