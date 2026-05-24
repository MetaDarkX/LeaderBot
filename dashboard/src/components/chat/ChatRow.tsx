import { motion, useReducedMotion } from 'framer-motion';
import { ChatAvatar } from '@/components/chat/ChatAvatar';
import { listItem, springSnappy } from '@/components/chat/motion';
import { chatPreview, fmtChatTime } from '@/lib/chat';
import { cn } from '@/lib/cn';
import type { ChatSummary } from '@/types';

export function ChatRow({
  chat,
  active,
  onSelect,
}: {
  chat: ChatSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.li variants={reduce ? undefined : listItem} layout="position">
      <motion.button
        type="button"
        onClick={onSelect}
        whileHover={reduce ? undefined : { backgroundColor: 'rgba(33, 45, 66, 0.45)' }}
        whileTap={reduce ? undefined : { scale: 0.99 }}
        transition={springSnappy}
        className={cn(
          'relative flex w-full items-center gap-3 border-b border-border-soft/60 px-3 py-3 text-left',
          active ? 'text-ink' : 'text-ink-dim',
        )}
      >
        {active ? (
          <motion.span
            layoutId="chat-row-active"
            className="absolute inset-0 bg-accent-soft/55"
            transition={springSnappy}
          />
        ) : null}
        <span className="relative z-[1]">
          <ChatAvatar contactId={chat.id} name={chat.name} isGroup={chat.isGroup} />
        </span>
        <div className="relative z-[1] min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium">{chat.name}</span>
            <span className="shrink-0 text-[10px] text-muted">{fmtChatTime(chat.timestamp)}</span>
          </div>
          <p className="truncate text-sm text-muted">{chatPreview(chat)}</p>
        </div>
        {chat.unreadCount > 0 ? (
          <motion.span
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            className="relative z-[1] flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white"
          >
            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
          </motion.span>
        ) : null}
      </motion.button>
    </motion.li>
  );
}
