// ============================================================
//  modules/activity/index.js
//  Feed ao vivo de TODAS as mensagens recebidas pelo bot,
//  com o motivo da decisão (respondida, ignorada e por quê).
//  Alimenta o painel "Atividade ao vivo" da dashboard.
// ============================================================

import { EventEmitter } from 'node:events';
import { ACTIONS } from '#core/actions';

export { ACTIONS };

const MAX_ITEMS = 80;

class ActivityService extends EventEmitter {
  constructor() {
    super();
    this.items = [];
  }

  /**
   * Registra uma entrada no feed.
   * @param {object} entry
   *   action     {string}   uma das ACTIONS
   *   groupName  {string?}  nome do grupo (ou null em DM)
   *   author     {string?}  número do autor (sem @c.us)
   *   isLeader   {boolean?}
   *   body       {string?}  texto da mensagem (truncado)
   *   reason     {string?}  detalhe extra (ex.: "cooldown 800ms")
   */
  add(entry) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(),
      action: entry.action,
      groupName: entry.groupName ?? null,
      author: entry.author ?? null,
      isLeader: !!entry.isLeader,
      body: typeof entry.body === 'string' ? entry.body.slice(0, 200) : '',
      reason: entry.reason ?? null,
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

export const activityService = new ActivityService();
