import { Router } from 'express';
import { logger } from '#platform/logger';
import {
  enrichChat,
  enrichMessage,
  enrichMessages,
  fetchProfilePicUrl,
  getMeProfile,
  serializeChat,
} from '#modules/messaging';

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

  /** Proxy da foto de perfil (img não envia header de auth). */
  router.get('/profile-pic/:contactId', async (req, res) => {
    if (!requireClient(res)) return;
    const contactId = decodeURIComponent(req.params.contactId);
    try {
      const url = await fetchProfilePicUrl(client, contactId);
      if (!url) return res.status(404).end();

      const imgRes = await fetch(url);
      if (!imgRes.ok) return res.status(404).end();

      const buf = Buffer.from(await imgRes.arrayBuffer());
      res.set('Cache-Control', 'private, max-age=3600');
      res.type(imgRes.headers.get('content-type') || 'image/jpeg');
      res.send(buf);
    } catch (err) {
      logger.debug(`[api] profile-pic ${contactId}: ${err.message}`);
      res.status(404).end();
    }
  });

  router.get('/chats', async (_req, res) => {
    if (!requireClient(res)) return;
    try {
      const [me, rawChats] = await Promise.all([
        getMeProfile(client),
        client.getChats(),
      ]);

      const list = rawChats
        .filter((c) => c.id?._serialized && !c.id._serialized.includes('@broadcast'))
        .map((c) => serializeChat(c))
        .sort((a, b) => b.timestamp - a.timestamp);

      res.json({ chats: list, me });
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
      const me = await getMeProfile(client);
      const chat = await client.getChatById(chatId);
      const raw = await chat.fetchMessages({ limit: limit + (before ? 20 : 0) });
      let slice = raw;

      if (before > 0) {
        slice = raw.filter((m) => m.timestamp * 1000 < before);
      }
      slice = slice.slice(0, limit);

      const messages = await enrichMessages(client, slice, chat);
      messages.sort((a, b) => a.timestamp - b.timestamp);

      const chatSummary = await enrichChat(client, chat);

      res.json({ chatId, messages, chat: chatSummary, me });
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
      const me = await getMeProfile(client);
      const chat = await client.getChatById(chatId);
      const sent = await chat.sendMessage(text);
      const message = await enrichMessage(client, sent, chat);
      const chatSummary = await enrichChat(client, chat);

      io?.emit('chat:message', { message, chat: chatSummary });

      res.json({ message, chat: chatSummary, me });
    } catch (err) {
      logger.warn(`[api] POST /chats/${chatId}/messages: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
