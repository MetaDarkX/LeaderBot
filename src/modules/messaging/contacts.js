// ============================================================
//  modules/messaging/contacts.js
//  Nomes e fotos de perfil (com cache em memória).
// ============================================================

import { serializeChat, serializeMessage } from './serialize.js';

const TTL_MS = 60 * 60 * 1000;

/** @type {Map<string, { value: string | null, at: number }>} */
const picCache = new Map();
/** @type {Map<string, { value: string, at: number }>} */
const nameCache = new Map();

/** @type {{ id: string, name: string, avatarUrl: string | null, at: number } | null} */
let meCache = null;

function cacheGet(map, key) {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(map, key, value) {
  map.set(key, { value, at: Date.now() });
}

/**
 * @param {import('whatsapp-web.js').Client} client
 * @param {string} contactId
 */
export async function fetchDisplayName(client, contactId) {
  if (!contactId) return '?';
  const cached = cacheGet(nameCache, contactId);
  if (cached !== undefined) return cached;

  let name = contactId.split('@')[0] || '?';
  try {
    const contact = await client.getContactById(contactId);
    name =
      contact?.name ||
      contact?.pushname ||
      contact?.shortName ||
      contact?.verifiedName ||
      name;
  } catch {
    /* mantém fallback */
  }

  cacheSet(nameCache, contactId, name);
  return name;
}

/**
 * URL da foto no CDN do WhatsApp (pode exigir proxy no browser).
 * @param {import('whatsapp-web.js').Client} client
 * @param {string} contactId
 */
export async function fetchProfilePicUrl(client, contactId) {
  if (!contactId) return null;
  const cached = cacheGet(picCache, contactId);
  if (cached !== undefined) return cached;

  let url = null;
  try {
    url = (await client.getProfilePicUrl(contactId)) || null;
  } catch {
    url = null;
  }

  cacheSet(picCache, contactId, url);
  return url;
}

/**
 * @param {import('whatsapp-web.js').Client} client
 */
export async function getMeProfile(client) {
  if (meCache && Date.now() - meCache.at < TTL_MS) {
    return { id: meCache.id, name: meCache.name, avatarUrl: meCache.avatarUrl };
  }

  const wid = client.info?.wid?._serialized;
  const name = client.info?.pushname || client.info?.wid?.user || 'Você';
  let avatarUrl = null;
  if (wid) {
    avatarUrl = await fetchProfilePicUrl(client, wid);
  }

  meCache = { id: wid || 'me', name, avatarUrl, at: Date.now() };
  return { id: meCache.id, name: meCache.name, avatarUrl: meCache.avatarUrl };
}

/**
 * @param {import('whatsapp-web.js').Client} client
 * @param {import('whatsapp-web.js').Chat} chat
 */
export async function enrichChat(client, chat) {
  const base = serializeChat(chat);
  if (!chat.isGroup) {
    try {
      base.name = await fetchDisplayName(client, chat.id._serialized);
    } catch {
      /* mantém chat.name */
    }
  }
  return base;
}

/**
 * @param {import('whatsapp-web.js').Client} client
 * @param {import('whatsapp-web.js').Message} message
 * @param {import('whatsapp-web.js').Chat} chat
 */
export async function enrichMessage(client, message, chat) {
  const base = serializeMessage(message, chat);
  const me = await getMeProfile(client);
  const isGroup = !!chat.isGroup;

  if (message.fromMe) {
    return {
      ...base,
      author: me.id,
      authorName: me.name,
      authorAvatarUrl: null,
      isGroup,
    };
  }

  const authorId = message.author || message.from;
  const authorName = await fetchDisplayName(client, authorId);

  return {
    ...base,
    author: authorId,
    authorName,
    authorAvatarUrl: null,
    isGroup,
  };
}

/**
 * @param {import('whatsapp-web.js').Client} client
 * @param {import('whatsapp-web.js').Message[]} messages
 * @param {import('whatsapp-web.js').Chat} chat
 */
export async function enrichMessages(client, messages, chat) {
  const me = await getMeProfile(client);
  const isGroup = !!chat.isGroup;
  const authorIds = new Set();
  for (const m of messages) {
    if (!m.fromMe) authorIds.add(m.author || m.from);
  }

  const names = new Map();
  await Promise.all(
    [...authorIds].map(async (id) => {
      names.set(id, await fetchDisplayName(client, id));
    }),
  );

  return messages.map((message) => {
    const base = serializeMessage(message, chat);
    if (message.fromMe) {
      return {
        ...base,
        author: me.id,
        authorName: me.name,
        authorAvatarUrl: null,
        isGroup,
      };
    }
    const authorId = message.author || message.from;
    return {
      ...base,
      author: authorId,
      authorName: names.get(authorId) || authorId.split('@')[0],
      authorAvatarUrl: null,
      isGroup,
    };
  });
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<unknown>} fn
 * @param {number} [concurrency]
 */
export async function mapPool(items, fn, concurrency = 8) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Math.min(concurrency, items.length || 1);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
