// ============================================================
//  modules/messaging/index.js
//  Ponte WhatsApp → Socket.IO para a UI de conversas.
// ============================================================

import { logger } from '#platform/logger';
import { serializeChat, serializeMessage } from './serialize.js';

/**
 * Escuta novas mensagens e retransmite para a dashboard.
 * @param {{ client?: import('whatsapp-web.js').Client, io?: import('socket.io').Server }} deps
 */
export function attachMessaging({ client, io } = {}) {
  if (!client || !io) return;

  const onNewMessage = async (message) => {
    try {
      const chat = await message.getChat();
      const payload = {
        message: serializeMessage(message, chat),
        chat: serializeChat(chat),
      };
      io.emit('chat:message', payload);
    } catch (err) {
      logger.warn(`[chat] broadcast: ${err.message}`);
    }
  };

  client.on('message_create', onNewMessage);
  logger.debug('[chat] listener message_create ativo');
}

export { serializeChat, serializeMessage };
