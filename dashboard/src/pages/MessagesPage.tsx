import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { api } from '@/lib/api';
import {
  appendMessage,
  chatInitials,
  chatPreview,
  fmtChatTime,
  mergeChatList,
} from '@/lib/chat';
import { cn } from '@/lib/cn';
import { getSocket } from '@/lib/socket';
import { useBot } from '@/context/BotContext';
import type { ChatMessage, ChatMessageEvent, ChatSummary } from '@/types';

function Avatar({ name, isGroup }: { name: string; isGroup?: boolean }) {
  return (
    <div
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        isGroup ? 'bg-accent/20 text-accent' : 'bg-surface-hover text-ink-dim',
      )}
      aria-hidden
    >
      {isGroup ? (
        <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ) : (
        chatInitials(name)
      )}
    </div>
  );
}

export function MessagesPage() {
  const { state } = useBot();
  const wppReady = state?.status === 'ready';

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const threadRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const activeChat = chats.find((c) => c.id === activeId) ?? null;

  const loadChats = useCallback(async () => {
    if (!wppReady) return;
    setChatsLoading(true);
    setChatsError(null);
    try {
      const data = await api<{ chats: ChatSummary[] }>('/api/chats');
      setChats(data.chats ?? []);
    } catch (err) {
      setChatsError(err instanceof Error ? err.message : 'Erro ao carregar conversas');
    } finally {
      setChatsLoading(false);
    }
  }, [wppReady]);

  const loadMessages = useCallback(async (chatId: string) => {
    setMessagesLoading(true);
    try {
      const data = await api<{ messages: ChatMessage[] }>(
        `/api/chats/${encodeURIComponent(chatId)}/messages?limit=50`,
      );
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  useEffect(() => {
    const socket = getSocket();
    const onChatMessage = (payload: ChatMessageEvent) => {
      setChats((prev) => mergeChatList(prev, payload.chat));
      if (payload.message.chatId === activeIdRef.current) {
        setMessages((prev) => appendMessage(prev, payload.message));
      }
    };
    socket.on('chat:message', onChatMessage);
    return () => {
      socket.off('chat:message', onChatMessage);
    };
  }, []);

  const filteredChats = search.trim()
    ? chats.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : chats;

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!activeId || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    setSendError(null);
    try {
      const data = await api<{ message: ChatMessage; chat: ChatSummary }>(
        `/api/chats/${encodeURIComponent(activeId)}/messages`,
        { method: 'POST', body: JSON.stringify({ text }) },
      );
      setMessages((prev) => appendMessage(prev, data.message));
      setChats((prev) => mergeChatList(prev, data.chat));
    } catch (err) {
      setDraft(text);
      setSendError(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  };

  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const showListOnMobile = !activeId;

  return (
    <div
      className={cn(
        '-mx-3 -mt-2 flex min-h-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface sm:-mx-5 lg:-mx-8',
        'h-[calc(100dvh-var(--mobile-header-h)-var(--bottom-nav-h)-5.5rem)]',
        'lg:h-[calc(100dvh-11rem)]',
      )}
    >
      {/* Lista de conversas */}
      <aside
        className={cn(
          'flex w-full flex-col border-r border-border bg-surface-2/40 lg:w-[min(360px,38%)]',
          !showListOnMobile && 'hidden lg:flex',
        )}
      >
        <div className="border-b border-border-soft bg-surface-2/80 px-3 py-3">
          <h1 className="text-lg font-semibold text-ink">Conversas</h1>
          <p className="text-[11px] text-muted">Mesma conta do bot — sem trocar de aba</p>
          <input
            type="search"
            placeholder="Buscar conversa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted-dim focus:border-accent/40 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {!wppReady ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Conecte o WhatsApp no painel para ver as conversas.
            </p>
          ) : chatsLoading && !chats.length ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Carregando…</p>
          ) : chatsError ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-danger">{chatsError}</p>
              <button
                type="button"
                className="mt-2 text-sm text-accent underline"
                onClick={() => void loadChats()}
              >
                Tentar de novo
              </button>
            </div>
          ) : !filteredChats.length ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nenhuma conversa encontrada.</p>
          ) : (
            <ul>
              {filteredChats.map((chat) => {
                const active = chat.id === activeId;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(chat.id)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-border-soft/60 px-3 py-3 text-left transition-colors',
                        active ? 'bg-accent-soft/60' : 'hover:bg-surface-hover/50',
                      )}
                    >
                      <Avatar name={chat.name} isGroup={chat.isGroup} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium text-ink">{chat.name}</span>
                          <span className="shrink-0 text-[10px] text-muted">
                            {fmtChatTime(chat.timestamp)}
                          </span>
                        </div>
                        <p className="truncate text-sm text-muted">{chatPreview(chat)}</p>
                      </div>
                      {chat.unreadCount > 0 ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {wppReady ? (
          <div className="border-t border-border-soft p-2">
            <button
              type="button"
              className="w-full rounded-[var(--radius-sm)] py-2 text-xs text-muted hover:bg-surface-hover hover:text-ink"
              onClick={() => void loadChats()}
            >
              Atualizar lista
            </button>
          </div>
        ) : null}
      </aside>

      {/* Thread */}
      <section
        className={cn(
          'flex min-w-0 flex-1 flex-col bg-[#0b141a]/40',
          showListOnMobile && 'hidden lg:flex',
        )}
      >
        {!activeChat ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="rounded-full bg-surface-2 p-4 text-muted">
              <svg viewBox="0 0 24 24" className="size-10" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              </svg>
            </div>
            <p className="text-sm text-muted">Selecione uma conversa para começar</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-border-soft bg-surface-2/90 px-3 py-2.5 backdrop-blur-sm">
              <button
                type="button"
                className="touch-target rounded-full p-1 text-ink-dim hover:bg-surface-hover lg:hidden"
                aria-label="Voltar para conversas"
                onClick={() => setActiveId(null)}
              >
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <Avatar name={activeChat.name} isGroup={activeChat.isGroup} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-ink">{activeChat.name}</h2>
                <p className="truncate text-[11px] text-muted">
                  {activeChat.isGroup ? 'Grupo' : 'Conversa individual'}
                </p>
              </div>
            </header>

            <div
              ref={threadRef}
              className="chat-thread-bg flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4"
            >
              {messagesLoading ? (
                <p className="text-center text-sm text-muted">Carregando mensagens…</p>
              ) : !messages.length ? (
                <p className="text-center text-sm text-muted">Nenhuma mensagem recente.</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex', msg.fromMe ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[min(85%,28rem)] rounded-lg px-3 py-1.5 text-[15px] leading-snug shadow-sm',
                        msg.fromMe
                          ? 'rounded-br-none bg-[#005c4b] text-[#e9edef]'
                          : 'rounded-bl-none bg-[#202c33] text-[#e9edef]',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p
                        className={cn(
                          'mt-0.5 text-right text-[10px]',
                          msg.fromMe ? 'text-[#99beb7]' : 'text-[#8696a0]',
                        )}
                      >
                        {fmtChatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => void handleSend(e)}
              className="flex items-end gap-2 border-t border-border-soft bg-surface-2/95 px-3 py-2"
            >
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onComposerKey}
                placeholder="Mensagem"
                disabled={!wppReady || sending}
                className="max-h-32 min-h-[42px] flex-1 resize-none rounded-3xl border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted-dim focus:border-accent/40 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!wppReady || sending || !draft.trim()}
                className="touch-target flex size-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-40"
                aria-label="Enviar"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
            {sendError ? (
              <p className="px-3 pb-2 text-center text-xs text-danger">{sendError}</p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
