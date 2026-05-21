// ============================================================
//  modules/cache/index.js
//  Cache de respostas em duas camadas:
//   L1 = NodeCache em memória (rápido, p/ a mesma instância)
//   L2 = Postgres (sobrevive a restarts/deploys)
//
//  Cada hit aqui = uma chamada de API economizada.
// ============================================================

import NodeCache from 'node-cache';
import { config } from '#config';
import { hashKey, normalizeForHash } from '#core/normalize';
import { logger } from '#platform/logger';
import { isReady as dbReady } from '#infra/db';
import {
  getCacheEntry,
  upsertCacheEntry,
  bumpCacheHit,
  clearCacheTable,
} from '#infra/db/repositories/cacheRepo';

const l1 = new NodeCache({
  stdTTL: config.bot.cacheTtlSeconds,
  checkperiod: Math.max(60, Math.floor(config.bot.cacheTtlSeconds / 4)),
  useClones: false,
});

const stats = { l1Hits: 0, l2Hits: 0, misses: 0, writes: 0 };

/**
 * Tenta resolver pelo cache (L1 → L2).
 * @returns {Promise<string|null>} resposta cacheada ou null se miss.
 */
export async function getCachedAnswer(question) {
  const key = hashKey(question);

  const memHit = l1.get(key);
  if (memHit) {
    stats.l1Hits += 1;
    logger.debug(`[cache] L1 HIT "${question.slice(0, 40)}"`);
    return memHit;
  }

  if (dbReady()) {
    try {
      const row = await getCacheEntry(key);
      if (row?.answer) {
        stats.l2Hits += 1;
        l1.set(key, row.answer); // promove p/ L1
        bumpCacheHit(key).catch(() => {});
        logger.debug(`[cache] L2 HIT "${question.slice(0, 40)}"`);
        return row.answer;
      }
    } catch (err) {
      logger.warn(`[cache] L2 lookup falhou: ${err.message}`);
    }
  }

  stats.misses += 1;
  return null;
}

export async function setCachedAnswer(question, answer, meta = {}) {
  if (!answer) return;
  const key = hashKey(question);
  l1.set(key, answer);
  stats.writes += 1;

  if (dbReady()) {
    upsertCacheEntry({
      key,
      question: normalizeForHash(question),
      answer,
      provider: meta.provider ?? null,
      model: meta.model ?? null,
      ttlSeconds: config.bot.cacheTtlSeconds || null,
    }).catch((err) => logger.warn(`[cache] L2 write falhou: ${err.message}`));
  }
}

export async function clearCache() {
  l1.flushAll();
  if (dbReady()) {
    try {
      await clearCacheTable();
    } catch (err) {
      logger.warn(`[cache] L2 clear falhou: ${err.message}`);
    }
  }
}

export function cacheStats() {
  return {
    ...l1.getStats(),
    l1Hits: stats.l1Hits,
    l2Hits: stats.l2Hits,
    misses: stats.misses,
    writes: stats.writes,
    keys: l1.keys().length,
  };
}
