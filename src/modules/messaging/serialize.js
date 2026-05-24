// ============================================================
//  modules/messaging/serialize.js
//  Normaliza Chat e Message do whatsapp-web.js para a API/UI.
// ============================================================

const MEDIA_LABELS = {
  image: '📷 Imagem',
  video: '🎥 Vídeo',
  audio: '🎵 Áudio',
  ptt: '🎤 Áudio',
  document: '📄 Documento',
  sticker: '🎭 Figurinha',
  location: '📍 Localização',
  vcard: '👤 Contato',
  contact_card: '👤 Contato',
};

/**
 * @param {import('whatsapp-web.js').Message} message
 * @param {import('whatsapp-web.js').Chat} [chat]
 */
export function serializeMessage(message, chat) {
  const chatId =
    chat?.id?._serialized ??
    (message.fromMe ? message.to : message.from);

  let body = message.body?.trim() ?? '';
  if (!body && message.hasMedia) {
    body = MEDIA_LABELS[message.type] ?? '📎 Mídia';
  }

  return {
    id: message.id._serialized,
    chatId,
    body,
    type: message.type,
    fromMe: !!message.fromMe,
    author: message.fromMe ? null : message.author || message.from,
    timestamp: message.timestamp * 1000,
    hasMedia: !!message.hasMedia,
  };
}

/**
 * @param {import('whatsapp-web.js').Chat} chat
 */
export function serializeChat(chat) {
  const last = chat.lastMessage;
  let preview = '';
  if (last) {
    preview = last.body?.trim() ?? '';
    if (!preview && last.hasMedia) {
      preview = MEDIA_LABELS[last.type] ?? '📎 Mídia';
    }
    if (last.fromMe && preview) preview = `Você: ${preview}`;
  }

  return {
    id: chat.id._serialized,
    name: chat.name || chat.id?.user || 'Conversa',
    isGroup: !!chat.isGroup,
    timestamp: (chat.timestamp || last?.timestamp || 0) * 1000,
    unreadCount: chat.unreadCount ?? 0,
    lastMessage: last
      ? {
          body: preview,
          fromMe: !!last.fromMe,
          timestamp: last.timestamp * 1000,
        }
      : null,
  };
}
