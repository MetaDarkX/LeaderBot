import { Router } from 'express';
import { logger } from '#platform/logger';
import { serializeChat, serializeMessage } from '#modules/messaging';

/**
 * API de conversas (lista, histórico, envio de texto).
 * @param {{ client?: import('whatsapp-web.js').Client, io?: import('socket.io').Server }} deps
 */
export function createChatRoutes({ client, io } = {}) {
  const router = Router();

  function requireClient(res) {
    if (!client?.info) {
      res.status(503).json({ error: 'WhatsApp não conectado' });
      return false;
    }
    return true;
  }

  router.get('/chats', async (_req, res) => {
    if (!requireClient(res)) return;
    try {
      const chats = await client.getChats();
      const list = chats
        .filter((c) => c.id?._serialized && !c.id._serialized.includes('@broadcast'))
        .map((c) => serializeChat(c))
        .sort((a, b) => b.timestamp - a.timestamp);
      res.json({ chats: list });
    } catch (err) {
      logger.warn(`[api] GET /chats: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/chats/:chatId/messages', async (req, res) => {
    if (!requireClient(res)) return;
    const chatId = decodeURIComponent(req.params.chatId);
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
    const before = Number(req.query.before) || 0;

    try {
      const chat = await client.getChatById(chatId);
      const raw = await chat.fetchMessages({ limit: limit + (before ? 20 : 0) });
      let messages = raw.map((m) => serializeMessage(m, chat));

      if (before > 0) {
        messages = messages.filter((m) => m.timestamp < before);
      }
      messages = messages.slice(0, limit);
      messages.sort((a, b) => a.timestamp - b.timestamp);

      res.json({ chatId, messages });
    } catch (err) {
      logger.warn(`[api] GET /chats/${chatId}/messages: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/chats/:chatId/messages', async (req, res) => {
    if (!requireClient(res)) return;
    const chatId = decodeURIComponent(req.params.chatId);
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'text obrigatório' });

    try {
      const chat = await client.getChatById(chatId);
      const sent = await chat.sendMessage(text);
      const message = serializeMessage(sent, chat);
      const chatSummary = serializeChat(chat);

      io?.emit('chat:message', { message, chat: chatSummary });

      res.json({ message, chat: chatSummary });
    } catch (err) {
      logger.warn(`[api] POST /chats/${chatId}/messages: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
