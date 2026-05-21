// ============================================================
//  web/socket.js
//  Socket.IO: snapshot inicial + broadcast de eventos dos módulos.
// ============================================================

import { logger } from '#platform/logger';
import { stateService } from '#modules/state';
import { statsService } from '#modules/stats';
import { historyService } from '#modules/history';
import { activityService } from '#modules/activity';
import { groupService } from '#modules/groups';
import { cacheStats } from '#modules/cache';

/**
 * Registra handlers de conexão e assina eventos dos módulos para
 * retransmitir em tempo real para todos os clientes conectados.
 *
 * @param {import('socket.io').Server} io
 */
export function setupSocket(io) {
  io.on('connection', (socket) => {
    logger.debug(`[ws] cliente conectado: ${socket.id}`);
    socket.emit('hello', {
      state: stateService.snapshot(),
      stats: statsService.snapshot(),
      history: historyService.list(),
      activity: activityService.list(),
      logs: logger.buffer(),
      cache: cacheStats(),
    });
    socket.on('disconnect', () => logger.debug(`[ws] cliente saiu: ${socket.id}`));
  });

  stateService.on('change', (s) => io.emit('state', s));
  statsService.on('change', (s) => io.emit('stats', s));
  historyService.on('add', (item) => io.emit('history:add', item));
  historyService.on('clear', () => io.emit('history:clear'));
  activityService.on('add', (item) => io.emit('activity:add', item));
  activityService.on('clear', () => io.emit('activity:clear'));
  groupService.on('leaders:change', () => io.emit('leaders:change'));
  groupService.on('leader:added', (p) => io.emit('leaders:change', p));
  groupService.on('leader:removed', (p) => io.emit('leaders:change', p));
  logger.on('log', (entry) => io.emit('log', entry));
}
