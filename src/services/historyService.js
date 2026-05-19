// ============================================================
//  services/historyService.js
//  Mantém em memória as últimas N perguntas/respostas do bot
//  para alimentar a aba "Histórico" da dashboard.
// ============================================================

import { EventEmitter } from 'node:events';

const MAX_ITEMS = 100;

class HistoryService extends EventEmitter {
  constructor() {
    super();
    this.items = [];
  }

  add(entry) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      ...entry,
    };
    this.items.unshift(item);
    if (this.items.length > MAX_ITEMS) this.items.length = MAX_ITEMS;
    this.emit('add', item);
    return item;
  }

  list() {
    return this.items;
  }

  clear() {
    this.items = [];
    this.emit('clear');
  }
}

export const historyService = new HistoryService();
