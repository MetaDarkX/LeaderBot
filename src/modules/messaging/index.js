// ============================================================
//  modules/messaging/index.js
//  Ponte WhatsApp → Socket.IO para a UI de conversas.
// ============================================================

import { logger } from '#platform/logger';
import { enrichChat, enrichMessage } from './contacts.js';
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
      const enrichedMessage = await enrichMessage(client, message, chat);
      io.emit('chat:message', {
        message: enrichedMessage,
        chat: serializeChat(chat),
      });
    } catch (err) {
      logger.warn(`[chat] broadcast: ${err.message}`);
    }
  };

  client.on('message_create', onNewMessage);
  logger.debug('[chat] listener message_create ativo');
}

export { serializeChat, serializeMessage };
export {
  enrichChat,
  enrichMessage,
  enrichMessages,
  getMeProfile,
  fetchProfilePicUrl,
  mapPool,
} from './contacts.js';
