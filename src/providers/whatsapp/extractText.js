// ============================================================
//  providers/whatsapp/extractText.js
//  Extrai texto de uma mensagem do WhatsApp:
//   1. Se tem `body` em texto, devolve direto.
//   2. Caso seja mídia, baixa e tenta:
//      - imagem  → OCR (atualmente no-op em providers/ocr)
//      - áudio   → Whisper (atualmente no-op em providers/audio)
//
//  Mantido como módulo separado porque é uma das partes mais
//  caras do pipeline quando OCR/áudio forem ligados — assim
//  é fácil envolver com cache, métricas ou flags de feature.
// ============================================================

import { logger } from '#platform/logger';
import { extractTextFromImage } from '#providers/ocr';
import { transcribeAudio } from '#providers/audio';

/**
 * @param {object} message  Mensagem do whatsapp-web.js
 * @returns {Promise<string>} texto (vazio se não conseguir extrair)
 */
export async function extractText(message) {
  if (message.body && message.body.trim()) return message.body.trim();
  if (!message.hasMedia) return '';

  try {
    const media = await message.downloadMedia();
    if (!media?.data) return '';

    const buffer = Buffer.from(media.data, 'base64');
    if (media.mimetype?.startsWith('image/')) {
      const text = await extractTextFromImage(buffer, media.mimetype);
      return text?.trim() ?? '';
    }
    if (media.mimetype?.startsWith('audio/')) {
      const text = await transcribeAudio(buffer, media.mimetype);
      return text?.trim() ?? '';
    }
  } catch (err) {
    logger.warn(`[media] falha ao baixar mídia: ${err.message}`);
  }
  return '';
}
