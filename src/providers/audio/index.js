// ============================================================
//  providers/audio/index.js
//  Placeholder para transcrição de áudios.
//
//  ▸ Suporte FUTURO. Hoje retorna null.
//  ▸ Quando quiser ativar, sugestões:
//      - openai (Whisper)            (já temos `openai` instalado)
//      - @google-cloud/speech        (Google Speech-to-Text)
//      - assemblyai                  (assemblyai.com)
// ============================================================

import { logger } from '#platform/logger';

/**
 * Transcreve um áudio para texto.
 * @param {Buffer} _audioBuffer  Buffer com o áudio (ogg/opus geralmente, do WhatsApp)
 * @param {string} [_mimetype]
 * @returns {Promise<string|null>}
 */
// eslint-disable-next-line no-unused-vars
export async function transcribeAudio(_audioBuffer, _mimetype) {
  logger.debug('[audio] Transcrição ainda não implementada — retornando null.');
  return null;

  /* ─────────────────────────────────────────────────────────────
   * EXEMPLO usando Whisper (OpenAI):
   *
   * import OpenAI from 'openai';
   * import { toFile } from 'openai/uploads';
   * import { config } from '#config';
   * const openai = new OpenAI({ apiKey: config.ai.openai.apiKey });
   * const file = await toFile(_audioBuffer, 'audio.ogg', { type: _mimetype || 'audio/ogg' });
   * const tr = await openai.audio.transcriptions.create({
   *   file,
   *   model: 'whisper-1',
   *   language: 'pt',
   * });
   * return tr.text ?? null;
   * ───────────────────────────────────────────────────────────── */
}
