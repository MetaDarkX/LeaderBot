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
 * Junta legenda + conteúdo extraído da mídia em um texto só.
 * A legenda pode ser a pergunta ("Qual a capital...?") ou só um rótulo
 * ("pergunta 6") — em ambos os casos o conteúdo da mídia complementa.
 */
function combine(caption, extracted) {
  const a = (caption || '').trim();
  const b = (extracted || '').trim();
  if (a && b) return `${a}\n${b}`;
  return a || b;
}

/**
 * @param {object} message  Mensagem do whatsapp-web.js
 * @returns {Promise<string>} texto (vazio se não conseguir extrair)
 */
export async function extractText(message) {
  const caption = (message.body || '').trim();

  // Sem mídia: o texto da mensagem é tudo que existe.
  if (!message.hasMedia) return caption;

  try {
    const media = await message.downloadMedia();
    if (!media?.data) return caption;

    const buffer = Buffer.from(media.data, 'base64');
    if (media.mimetype?.startsWith('image/')) {
      // Mesmo com legenda, analisamos a imagem: a pergunta pode estar
      // no print e a legenda ser só "pergunta 6" (ou vice-versa).
      const text = await extractTextFromImage(buffer, media.mimetype);
      return combine(caption, text);
    }
    if (media.mimetype?.startsWith('audio/')) {
      const text = await transcribeAudio(buffer, media.mimetype);
      return combine(caption, text);
    }
  } catch (err) {
    logger.warn(`[media] falha ao baixar mídia: ${err.message}`);
  }
  return caption;
}
