import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/api';
import { appendMessage, mergeChatList } from '@/lib/chat';
import { cn } from '@/lib/cn';
import { getSocket } from '@/lib/socket';
import { useBot } from '@/context/BotContext';
import { ChatAvatar } from '@/components/chat/ChatAvatar';
import { ChatListSkeleton } from '@/components/chat/ChatListSkeleton';
import { ChatRow } from '@/components/chat/ChatRow';
import { MessageRow } from '@/components/chat/MessageRow';
import {
  chatEase,
  fadeUp,
  listContainer,
  slidePanel,
  springSnappy,
} from '@/components/chat/motion';
import type { ChatMe, ChatMessage, ChatMessageEvent, ChatSummary } from '@/types';

function showAuthorLabel(
  msg: ChatMessage,
  prev: ChatMessage | undefined,
  isGroup: boolean,
): boolean {
  if (!isGroup || msg.fromMe) return false;
  if (!prev || prev.fromMe) return true;
  return prev.author !== msg.author;
}

export function MessagesPage() {
  const { state } = useBot();
  const wppReady = state?.status === 'ready';
  const reduce = useReducedMotion();

  const [me, setMe] = useState<ChatMe | null>(null);
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
  const skipAnimateIds = useRef(new Set<string>());

  activeIdRef.current = activeId;

  const activeChat = chats.find((c) => c.id === activeId) ?? null;
  const isGroupChat = activeChat?.isGroup ?? false;

  const scrollThreadToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : behavior });
  }, [reduce]);

  const loadChats = useCallback(async () => {
    if (!wppReady) return;
    setChatsLoading(true);
    setChatsError(null);
    try {
      const data = await api<{ chats: ChatSummary[]; me: ChatMe }>('/api/chats');
      setChats(data.chats ?? []);
      if (data.me) setMe(data.me);
    } catch (err) {
      setChatsError(err instanceof Error ? err.message : 'Erro ao carregar conversas');
    } finally {
      setChatsLoading(false);
    }
  }, [wppReady]);

  const loadMessages = useCallback(async (chatId: string) => {
    setMessagesLoading(true);
    skipAnimateIds.current.clear();
    try {
      const data = await api<{
        messages: ChatMessage[];
        me?: ChatMe;
        chat?: ChatSummary;
      }>(`/api/chats/${encodeURIComponent(chatId)}/messages?limit=50`);
      const msgs = data.messages ?? [];
      skipAnimateIds.current = new Set(msgs.map((m) => m.id));
      setMessages(msgs);
      if (data.me) setMe(data.me);
      if (data.chat) {
        setChats((prev) => mergeChatList(prev, data.chat!));
      }
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
      requestAnimationFrame(() => scrollThreadToEnd('auto'));
    }
  }, [scrollThreadToEnd]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (!messagesLoading && messages.length) {
      scrollThreadToEnd();
    }
  }, [messages, messagesLoading, scrollThreadToEnd]);

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
      const data = await api<{ message: ChatMessage; chat: ChatSummary; me?: ChatMe }>(
        `/api/chats/${encodeURIComponent(activeId)}/messages`,
        { method: 'POST', body: JSON.stringify({ text }) },
      );
      setMessages((prev) => appendMessage(prev, data.message));
      setChats((prev) => mergeChatList(prev, data.chat));
      if (data.me) setMe(data.me);
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
  const myId = me?.id ?? (state?.me?.number ? `${state.me.number}@c.us` : null);
  const myName = me?.name ?? state?.me?.pushname ?? 'Você';

  const chatList = (
    <>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: chatEase }}
        className="border-b border-border-soft bg-surface-2/80 px-3 py-3"
      >
        <h1 className="text-lg font-semibold text-ink">Conversas</h1>
        <p className="text-[11px] text-muted">Mesma conta do bot — sem trocar de aba</p>
        <motion.input
          type="search"
          placeholder="Buscar conversa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          whileFocus={reduce ? undefined : { scale: 1.01 }}
          transition={{ duration: 0.15 }}
          className="mt-2 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted-dim transition-shadow focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
      </motion.div>

      <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth">
        {!wppReady ? (
          <motion.p {...fadeUp} className="px-4 py-8 text-center text-sm text-muted">
            Conecte o WhatsApp no painel para ver as conversas.
          </motion.p>
        ) : chatsLoading && !chats.length ? (
          <ChatListSkeleton />
        ) : chatsError ? (
          <motion.div {...fadeUp} className="px-4 py-6 text-center">
            <p className="text-sm text-danger">{chatsError}</p>
            <button
              type="button"
              className="mt-2 text-sm text-accent underline"
              onClick={() => void loadChats()}
            >
              Tentar de novo
            </button>
          </motion.div>
        ) : !filteredChats.length ? (
          <motion.p {...fadeUp} className="px-4 py-8 text-center text-sm text-muted">
            Nenhuma conversa encontrada.
          </motion.p>
        ) : (
          <motion.ul
            variants={reduce ? undefined : listContainer}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {filteredChats.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeId}
                  onSelect={() => setActiveId(chat.id)}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {wppReady ? (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-border-soft p-2"
        >
          <motion.button
            type="button"
            whileTap={reduce ? undefined : { scale: 0.98 }}
            className="w-full rounded-[var(--radius-sm)] py-2 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            onClick={() => void loadChats()}
          >
            Atualizar lista
          </motion.button>
        </motion.div>
      ) : null}
    </>
  );

  const threadPanel = activeChat ? (
    <motion.div
      key={activeChat.id}
      {...(reduce ? {} : slidePanel)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <motion.header
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: chatEase }}
        className="flex shrink-0 items-center gap-3 border-b border-border-soft bg-surface-2/90 px-3 py-2.5 backdrop-blur-sm"
      >
        <motion.button
          type="button"
          whileTap={reduce ? undefined : { scale: 0.92 }}
          className="touch-target rounded-full p-1 text-ink-dim hover:bg-surface-hover lg:hidden"
          aria-label="Voltar para conversas"
          onClick={() => setActiveId(null)}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>
        <ChatAvatar
          contactId={activeChat.id}
          name={activeChat.name}
          isGroup={activeChat.isGroup}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-ink">{activeChat.name}</h2>
          <p className="truncate text-[11px] text-muted">
            {activeChat.isGroup ? 'Grupo' : 'Conversa individual'}
          </p>
        </div>
      </motion.header>

      <div
        ref={threadRef}
        className="chat-thread-bg relative flex-1 space-y-2 overflow-y-auto overscroll-contain scroll-smooth px-2 py-4 sm:px-3"
      >
        <AnimatePresence mode="wait">
          {messagesLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  className="size-8 rounded-full border-2 border-accent/30 border-t-accent"
                />
                <p className="text-sm text-muted">Carregando mensagens…</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!messagesLoading && !messages.length ? (
          <motion.p
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-sm text-muted"
          >
            Nenhuma mensagem recente.
          </motion.p>
        ) : null}

        {!messagesLoading
          ? messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : undefined;
              const group = msg.isGroup ?? isGroupChat;
              const showLabel = showAuthorLabel(msg, prev, group);
              const avatarId = msg.fromMe ? myId : msg.author;
              const displayName = msg.fromMe
                ? myName
                : msg.authorName || msg.author?.split('@')[0] || '?';
              const animateIn = !skipAnimateIds.current.has(msg.id);

              return (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  showLabel={showLabel}
                  displayName={displayName}
                  avatarId={avatarId}
                  fromMe={msg.fromMe}
                  animateIn={animateIn}
                />
              );
            })
          : null}
      </div>

      <motion.form
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.22, ease: chatEase }}
        onSubmit={(e) => void handleSend(e)}
        className="flex shrink-0 items-end gap-2 border-t border-border-soft bg-surface-2/95 px-3 py-2"
      >
        {myId ? (
          <ChatAvatar contactId={myId} name={myName} size="sm" className="self-center" />
        ) : null}
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onComposerKey}
          placeholder="Mensagem"
          disabled={!wppReady || sending}
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-3xl border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted-dim transition-[border-color,box-shadow] duration-200 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-50"
        />
        <motion.button
          type="submit"
          disabled={!wppReady || sending || !draft.trim()}
          whileHover={reduce || !draft.trim() ? undefined : { scale: 1.05 }}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          transition={springSnappy}
          className="touch-target relative flex size-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-40"
          aria-label="Enviar"
        >
          {sending ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className="size-5 rounded-full border-2 border-white/30 border-t-white"
            />
          ) : (
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </motion.button>
      </motion.form>

      <AnimatePresence>
        {sendError ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden px-3 pb-2 text-center text-xs text-danger"
          >
            {sendError}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </motion.div>
  ) : (
    <motion.div
      key="empty"
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-full bg-surface-2 p-4 text-muted"
      >
        <svg viewBox="0 0 24 24" className="size-10" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
        </svg>
      </motion.div>
      <p className="text-sm text-muted">Selecione uma conversa para começar</p>
    </motion.div>
  );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: chatEase }}
      className={cn(
        '-mx-3 -mt-2 flex min-h-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface sm:-mx-5 lg:-mx-8',
        'h-[calc(100dvh-var(--mobile-header-h)-var(--bottom-nav-h)-5.5rem)]',
        'lg:h-[calc(100dvh-11rem)]',
      )}
    >
      {/* Lista — desktop sempre; mobile quando sem chat ativo */}
      <motion.aside
        layout
        className={cn(
          'flex w-full flex-col border-r border-border bg-surface-2/40 lg:w-[min(360px,38%)]',
          !showListOnMobile && 'hidden lg:flex',
        )}
      >
        {chatList}
      </motion.aside>

      {/* Thread */}
      <section
        className={cn(
          'flex min-w-0 flex-1 flex-col bg-[#0b141a]/40',
          showListOnMobile && 'hidden lg:flex',
        )}
      >
        <AnimatePresence mode="wait">{threadPanel}</AnimatePresence>
      </section>
    </motion.div>
  );
}
