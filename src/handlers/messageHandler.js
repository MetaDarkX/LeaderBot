// ============================================================
//  handlers/messageHandler.js
//  Cérebro do bot: recebe TODAS as mensagens do WhatsApp e
//  decide se deve respondê-las. Cada decisão é registrada
//  no activityService para aparecer no feed ao vivo da UI.
// ============================================================

import { logger } from '../utils/logger.js';
import { isAllowedGroup, isLeader, validateQuestion, normalizePhone } from '../utils/filters.js';
import { canReply, markReplied } from '../services/cooldownService.js';
import { resolveQuestion } from './questionHandler.js';
import { extractTextFromImage } from '../services/ocrService.js';
import { transcribeAudio } from '../services/audioService.js';
import { stateService } from '../services/stateService.js';
import { statsService } from '../services/statsService.js';
import { historyService } from '../services/historyService.js';
import { activityService, ACTIONS } from '../services/activityService.js';
import { truncate } from '../utils/helpers.js';

async function extractText(message) {
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

/**
 * Helper para gravar atividade + log curto e padronizado.
 */
function track(action, ctx, reason) {
  activityService.add({
    action,
    groupName: ctx.groupName,
    author: ctx.author,
    isLeader: ctx.isLeader,
    body: ctx.body,
    reason,
  });
  // Log resumido para o terminal/UI
  const tag = action.replace('ignored:', '');
  const leader = ctx.isLeader ? '👑' : '·';
  const where = ctx.groupName ? `[${ctx.groupName}]` : '[DM]';
  const who = ctx.author || '?';
  const body = ctx.body ? `"${truncate(ctx.body, 60)}"` : '';
  logger.info(`📨 ${where} ${leader} ${who} → ${tag.toUpperCase()} ${body}${reason ? ` (${reason})` : ''}`);
}

export function createMessageHandler(_client) {
  return async function onMessage(message) {
    // Contexto mínimo (preenchemos mais conforme descobrimos coisas)
    const ctx = {
      groupName: null,
      author: null,
      isLeader: false,
      body: message.body || '',
    };

    try {
      statsService.inc('received');

      // 1) mensagens próprias: ignora silenciosamente (não enche o feed)
      if (message.fromMe) return;

      // 2) Pega chat para saber se é grupo e o nome
      let chat;
      try {
        chat = await message.getChat();
      } catch (err) {
        logger.warn(`[msg] erro ao obter chat: ${err.message}`);
        return;
      }

      const authorId = message.author || message.from;
      ctx.author = normalizePhone((authorId || '').split('@')[0]);
      ctx.isLeader = isLeader(authorId);

      if (!chat.isGroup) {
        // DMs ficam de fora da gincana, mas registramos para visibilidade
        track(ACTIONS.IGNORED_DM, ctx);
        statsService.inc('ignoredByFilter');
        return;
      }

      ctx.groupName = chat.name;

      // 3) Grupo não está na allowlist
      if (!isAllowedGroup(chat.id._serialized)) {
        track(ACTIONS.IGNORED_GROUP, ctx, `id=${chat.id._serialized}`);
        statsService.inc('ignoredByFilter');
        return;
      }

      // 4) Autor não é líder — REGISTRAMOS no feed, para o usuário ver
      // que o bot está "ouvindo" o grupo
      if (!ctx.isLeader) {
        track(ACTIONS.IGNORED_LEADER, ctx);
        return;
      }

      // 5) Pausa via dashboard
      if (stateService.paused) {
        track(ACTIONS.IGNORED_PAUSED, ctx);
        statsService.inc('ignoredByPause');
        return;
      }

      statsService.inc('considered');

      // 6) Extrai texto (com hook para OCR / áudio)
      const text = await extractText(message);
      ctx.body = text;

      if (!text) {
        track(ACTIONS.IGNORED_NO_TEXT, ctx, 'sem texto/OCR/transcrição');
        return;
      }

      // 7) Filtros (parece pergunta? tamanho ok?)
      const validation = validateQuestion(text);
      if (!validation.ok) {
        track(ACTIONS.IGNORED_FILTER, ctx, validation.reason);
        statsService.inc('ignoredByFilter');
        return;
      }

      // 8) Cooldown por líder
      const cd = canReply(authorId);
      if (!cd.ok) {
        track(ACTIONS.IGNORED_COOLDOWN, ctx, `aguarda ${cd.waitMs}ms`);
        statsService.inc('ignoredByCooldown');
        return;
      }

      // 9) Tudo certo — vai responder
      logger.info(`❓ ${ctx.groupName} · líder ${ctx.author}: ${truncate(text, 80)}`);

      chat.sendSeen?.().catch(() => {});
      chat.sendStateTyping?.().catch(() => {});

      const { answer, source, elapsedMs } = await resolveQuestion(text);

      await message.reply(answer);
      markReplied(authorId);
      chat.clearState?.().catch(() => {});

      statsService.recordAnswer({ leaderId: authorId, source, elapsedMs });
      historyService.add({
        groupName: ctx.groupName,
        groupId: chat.id._serialized,
        leaderId: authorId,
        question: text,
        answer,
        source,
        elapsedMs,
      });
      activityService.add({
        action: ACTIONS.ANSWERED,
        groupName: ctx.groupName,
        author: ctx.author,
        isLeader: true,
        body: text,
        reason: `${source} · ${elapsedMs}ms`,
      });

      logger.success(
        `✓ respondido em ${elapsedMs}ms via ${source.toUpperCase()}: "${truncate(answer, 80)}"`
      );
    } catch (err) {
      logger.error('[messageHandler] erro inesperado:', err);
      activityService.add({
        action: ACTIONS.ERROR,
        groupName: ctx.groupName,
        author: ctx.author,
        isLeader: ctx.isLeader,
        body: ctx.body,
        reason: err.message,
      });
    }
  };
}
