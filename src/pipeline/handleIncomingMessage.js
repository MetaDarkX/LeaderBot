// ============================================================
//  pipeline/handleIncomingMessage.js
//  Cérebro do bot: recebe TODAS as mensagens do WhatsApp e
//  decide se deve respondê-las. Cada decisão é registrada
//  no activityService para aparecer no feed ao vivo da UI.
//
//  Ordem dos filtros (do mais barato pro mais caro):
//    1. fromMe                     (ignora silenciosamente)
//    2. getChat (DM vs grupo)
//    3. allowlist do grupo
//    4. é líder do grupo?
//    5. bot está pausado?
//    6. cooldown do líder            ← ANTES de OCR/áudio
//    7. extrai texto (texto + OCR + áudio)
//    8. parece pergunta? (heurística)
//    9. classifica com IA + buffer de contexto
//   10. resolveQuestion (cache → IA)
// ============================================================

import { logger } from '#platform/logger';
import {
  isAllowedGroup,
  isLeaderOfGroup,
  validateQuestion,
  normalizeMemberId,
} from './filters.js';
import { canReply, markReplied } from '#modules/cooldown';
import { answerQuestion } from './answerQuestion.js';
import { classifyGincanaQuestion } from './classifyMessage.js';
import { extractText } from '#providers/whatsapp';
import * as chatBuffer from '#modules/chatBuffer';
import { stateService } from '#modules/state';
import { statsService } from '#modules/stats';
import { historyService } from '#modules/history';
import { activityService, ACTIONS } from '#modules/activity';
import { groupService } from '#modules/groups';
import { truncate } from '#platform/helpers';
import { isReady as dbReady } from '#infra/db';
import { touchGroup } from '#infra/db/repositories/groupRepo';

/**
 * Grava atividade + log curto e padronizado.
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
  const tag = action.replace('ignored:', '');
  const leader = ctx.isLeader ? '👑' : '·';
  const where = ctx.groupName ? `[${ctx.groupName}]` : '[DM]';
  const who = ctx.author || '?';
  const body = ctx.body ? `"${truncate(ctx.body, 60)}"` : '';
  logger.info(`📨 ${where} ${leader} ${who} → ${tag.toUpperCase()} ${body}${reason ? ` (${reason})` : ''}`);
}

function messageId(message) {
  return message.id?._serialized || message.id?.id || String(message.timestamp ?? Date.now());
}

/**
 * Cria o handler de mensagens. O `client` é passado caso passos futuros
 * precisem (ex.: presença, leitura). Hoje a API expõe `message.reply()`
 * e os métodos de chat usados diretamente.
 */
export function createMessageHandler(_client) {
  return async function onMessage(message) {
    const ctx = {
      groupName: null,
      author: null,
      isLeader: false,
      body: message.body || '',
    };

    try {
      statsService.inc('received');

      // 1) Mensagens próprias: ignora silenciosamente (não enche o feed).
      if (message.fromMe) return;

      // 2) Pega chat para saber se é grupo e o nome.
      let chat;
      try {
        chat = await message.getChat();
      } catch (err) {
        logger.warn(`[msg] erro ao obter chat: ${err.message}`);
        return;
      }

      const authorId = message.author || message.from;
      const memberId = normalizeMemberId(authorId);
      ctx.author = memberId || (authorId || '').split('@')[0];

      if (!chat.isGroup) {
        track(ACTIONS.IGNORED_DM, ctx);
        statsService.inc('ignoredByFilter');
        return;
      }

      ctx.groupName = chat.name;
      const groupId = chat.id._serialized;

      // Registra/atualiza o grupo no DB (best-effort).
      if (dbReady()) {
        touchGroup({
          id: groupId,
          name: chat.name,
          participantsCount: chat.participants?.length ?? 0,
        }).catch(() => {});
      }

      ctx.isLeader = isLeaderOfGroup(memberId || authorId, groupId);

      // 3) Grupo não está na allowlist.
      if (!isAllowedGroup(groupId)) {
        track(ACTIONS.IGNORED_GROUP, ctx, `id=${groupId}`);
        statsService.inc('ignoredByFilter');
        return;
      }

      const msgId = messageId(message);
      const preview = (message.body || '').trim();
      if (preview) {
        chatBuffer.append(groupId, {
          id: msgId,
          author: ctx.author,
          isLeader: ctx.isLeader,
          text: preview,
        });
      }

      // 4) Autor não é líder do grupo — REGISTRAMOS no feed para o usuário
      // ver que o bot está "ouvindo" o grupo.
      if (!ctx.isLeader) {
        const ledCount = groupService.leadersOfGroup(groupId).size;
        const reason = ledCount === 0
          ? 'nenhum líder definido para este grupo'
          : undefined;
        track(ACTIONS.IGNORED_LEADER, ctx, reason);
        return;
      }

      // 5) Pausa via dashboard.
      if (stateService.paused) {
        track(ACTIONS.IGNORED_PAUSED, ctx);
        statsService.inc('ignoredByPause');
        return;
      }

      statsService.inc('considered');

      // 6) Cooldown por líder ANTES de tocar em mídia.
      //    Importante: se OCR/Whisper forem ativados, isso evita pagar
      //    extração de texto em mensagens que iriam ser bloqueadas.
      const cd = canReply(memberId || authorId);
      if (!cd.ok) {
        track(ACTIONS.IGNORED_COOLDOWN, ctx, `aguarda ${cd.waitMs}ms`);
        statsService.inc('ignoredByCooldown');
        return;
      }

      // 7) Extrai texto (com hook para OCR / áudio).
      const text = await extractText(message);
      ctx.body = text;

      if (!text) {
        track(ACTIONS.IGNORED_NO_TEXT, ctx, 'sem texto/OCR/transcrição');
        return;
      }

      chatBuffer.amend(groupId, msgId, text);
      if (!chatBuffer.window(groupId).some((e) => e.id === msgId)) {
        chatBuffer.append(groupId, {
          id: msgId,
          author: ctx.author,
          isLeader: true,
          text,
        });
      }

      // 8) Filtros heurísticos (parece pergunta? tamanho ok?)
      const validation = validateQuestion(text);
      if (!validation.ok) {
        track(ACTIONS.IGNORED_FILTER, ctx, validation.reason);
        statsService.inc('ignoredByFilter');
        return;
      }

      // 9) IA classifica a última mensagem usando o buffer de contexto.
      const classification = await classifyGincanaQuestion({
        groupId,
        text,
        author: ctx.author,
        messageId: msgId,
        isLeader: true,
      });
      if (!classification.isGincana) {
        const reason = classification.fallback
          ? 'classificação indisponível'
          : `não é pergunta da gincana (${classification.label})`;
        track(ACTIONS.IGNORED_CLASSIFY, ctx, reason);
        statsService.inc('ignoredByClassify');
        return;
      }

      // 10) Tudo certo — vai responder.
      logger.info(`❓ ${ctx.groupName} · líder ${ctx.author}: ${truncate(text, 80)}`);

      chat.sendSeen?.().catch(() => {});
      chat.sendStateTyping?.().catch(() => {});

      const resolved = await answerQuestion(text);
      const { answer, source, elapsedMs, provider, model, usage, costUsd } = resolved;

      await message.reply(answer);
      markReplied(memberId || authorId);
      chat.clearState?.().catch(() => {});

      statsService.recordAnswer({
        leaderId: memberId || authorId,
        source,
        elapsedMs,
        usage,
        costUsd,
      });
      historyService.add({
        groupName: ctx.groupName,
        groupId,
        leaderId: memberId || authorId,
        question: text,
        answer,
        source,
        elapsedMs,
        provider,
        model,
        tokensIn: usage?.inputTokens ?? 0,
        tokensOut: usage?.outputTokens ?? 0,
        costUsd: costUsd ?? 0,
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
        `✓ respondido em ${elapsedMs}ms via ${source.toUpperCase()}` +
          (source === 'ai' ? ` (${usage?.totalTokens ?? '?'}tk, $${(costUsd ?? 0).toFixed(6)})` : '') +
          `: "${truncate(answer, 80)}"`
      );
    } catch (err) {
      logger.error('[pipeline] erro inesperado:', err);
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
