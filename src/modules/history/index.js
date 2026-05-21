// ============================================================
//  modules/history/index.js
//  Mantém as últimas N perguntas/respostas (em memória, para
//  resposta instantânea da UI) e persiste tudo no Postgres
//  para histórico de longo prazo.
// ============================================================

import { EventEmitter } from 'node:events';

import { logger } from '#platform/logger';
import { isReady as dbReady } from '#infra/db';
import {
  insertHistory,
  listHistory,
  clearHistory,
} from '#infra/db/repositories/historyRepo';
import { normalizePhone } from '#core/normalize';

const MAX_ITEMS = 100;

class HistoryService extends EventEmitter {
  constructor() {
    super();
    this.items = [];
  }

  /** Recarrega o cache em memória a partir do DB. */
  async loadFromDb() {
    if (!dbReady()) return;
    try {
      const rows = await listHistory({ limit: MAX_ITEMS });
      this.items = rows.map((r) => ({
        id: String(r.id),
        at: new Date(r.created_at).getTime(),
        groupId: r.group_id,
        groupName: r.group_name,
        leaderId: r.leader_phone,
        question: r.question,
        answer: r.answer,
        source: r.source,
        elapsedMs: r.elapsed_ms,
        provider: r.provider ?? null,
        model: r.model ?? null,
        tokensIn: r.tokens_in ?? 0,
        tokensOut: r.tokens_out ?? 0,
        costUsd: Number(r.cost_usd ?? 0),
      }));
      logger.info(`[history] ${this.items.length} entradas carregadas do banco`);
    } catch (err) {
      logger.warn(`[history] falha ao carregar do DB: ${err.message}`);
    }
  }

  add(entry) {
    const phone = normalizePhone(String(entry.leaderId || '').split('@')[0]);
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      ...entry,
      leaderId: phone || entry.leaderId,
    };
    this.items.unshift(item);
    if (this.items.length > MAX_ITEMS) this.items.length = MAX_ITEMS;
    this.emit('add', item);

    if (dbReady()) {
      insertHistory({
        groupId: entry.groupId ?? null,
        groupName: entry.groupName ?? null,
        leaderPhone: phone || null,
        question: entry.question,
        answer: entry.answer,
        source: entry.source,
        elapsedMs: entry.elapsedMs ?? 0,
        provider: entry.provider ?? null,
        model: entry.model ?? null,
        tokensIn: entry.tokensIn ?? 0,
        tokensOut: entry.tokensOut ?? 0,
        costUsd: entry.costUsd ?? 0,
      }).catch((err) => logger.warn(`[history] erro ao persistir: ${err.message}`));
    }

    return item;
  }

  list() {
    return this.items;
  }

  async clear() {
    this.items = [];
    this.emit('clear');
    if (dbReady()) {
      try {
        await clearHistory();
      } catch (err) {
        logger.warn(`[history] falha ao limpar DB: ${err.message}`);
      }
    }
  }
}

export const historyService = new HistoryService();
