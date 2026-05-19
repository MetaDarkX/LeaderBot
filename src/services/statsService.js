// ============================================================
//  services/statsService.js
//  Contadores e métricas agregadas usadas pela UI.
// ============================================================

import { EventEmitter } from 'node:events';

class StatsService extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.stats = {
      received: 0,         // toda mensagem que chegou ao handler
      considered: 0,       // passou pelos filtros iniciais (líder + grupo)
      answered: 0,         // bot enviou uma resposta
      cacheHits: 0,
      aiCalls: 0,
      fallbacks: 0,
      ignoredByPause: 0,
      ignoredByCooldown: 0,
      ignoredByFilter: 0,
      totalLatencyMs: 0,   // somatório usado para média
      lastLatencyMs: 0,
      perLeader: {},       // { leaderId: { answered, lastAt } }
    };
    this.emit('change', this.snapshot());
  }

  snapshot() {
    const avgLatencyMs = this.stats.answered
      ? Math.round(this.stats.totalLatencyMs / this.stats.answered)
      : 0;
    return { ...this.stats, avgLatencyMs };
  }

  inc(key, by = 1) {
    if (this.stats[key] === undefined) return;
    this.stats[key] += by;
    this.emit('change', this.snapshot());
  }

  recordAnswer({ leaderId, source, elapsedMs }) {
    this.stats.answered += 1;
    this.stats.totalLatencyMs += elapsedMs || 0;
    this.stats.lastLatencyMs = elapsedMs || 0;
    if (source === 'cache') this.stats.cacheHits += 1;
    if (source === 'ai') this.stats.aiCalls += 1;
    if (source === 'fallback') this.stats.fallbacks += 1;
    if (leaderId) {
      const entry = this.stats.perLeader[leaderId] || { answered: 0, lastAt: 0 };
      entry.answered += 1;
      entry.lastAt = Date.now();
      this.stats.perLeader[leaderId] = entry;
    }
    this.emit('change', this.snapshot());
  }
}

export const statsService = new StatsService();
