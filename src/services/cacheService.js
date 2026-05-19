// ============================================================
//  services/cacheService.js
//  Cache em memória para evitar chamadas repetidas à IA quando
//  o líder envia a mesma pergunta múltiplas vezes.
// ============================================================

import NodeCache from 'node-cache';
import { config } from '../config.js';
import { hashKey } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const cache = new NodeCache({
  stdTTL: config.bot.cacheTtlSeconds,
  checkperiod: Math.max(60, Math.floor(config.bot.cacheTtlSeconds / 4)),
  useClones: false,
});

export function getCachedAnswer(question) {
  const key = hashKey(question);
  const hit = cache.get(key);
  if (hit) logger.debug(`[cache] HIT para "${question.slice(0, 40)}..."`);
  return hit;
}

export function setCachedAnswer(question, answer) {
  if (!answer) return;
  cache.set(hashKey(question), answer);
}

export function clearCache() {
  cache.flushAll();
}

export function cacheStats() {
  return cache.getStats();
}
