import { AUTH_TOKEN } from '@/lib/token';
import type { ChatMessage, ChatSummary } from '@/types';

/** URL do proxy de avatar (aceita ?token= na query). */
export function profilePicSrc(contactId: string | null | undefined): string | null {
  if (!contactId) return null;
  const q = AUTH_TOKEN ? `?token=${encodeURIComponent(AUTH_TOKEN)}` : '';
  return `/api/profile-pic/${encodeURIComponent(contactId)}${q}`;
}

export function fmtChatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (ts > weekAgo) {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  }

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function chatPreview(chat: ChatSummary): string {
  return chat.lastMessage?.body?.trim() || 'Sem mensagens';
}

export function mergeChatList(
  list: ChatSummary[],
  update: ChatSummary,
): ChatSummary[] {
  const rest = list.filter((c) => c.id !== update.id);
  return [update, ...rest].sort((a, b) => b.timestamp - a.timestamp);
}

export function appendMessage(
  messages: ChatMessage[],
  msg: ChatMessage,
): ChatMessage[] {
  if (messages.some((m) => m.id === msg.id)) return messages;
  return [...messages, msg].sort((a, b) => a.timestamp - b.timestamp);
}

export function chatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
