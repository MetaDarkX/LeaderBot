import { motion, useReducedMotion } from 'framer-motion';
import { ChatAvatar } from '@/components/chat/ChatAvatar';
import { messagePop } from '@/components/chat/motion';
import { fmtChatTime } from '@/lib/chat';
import { cn } from '@/lib/cn';
import type { ChatMessage } from '@/types';

export function MessageRow({
  msg,
  showLabel,
  displayName,
  avatarId,
  fromMe,
  animateIn = true,
}: {
  msg: ChatMessage;
  showLabel: boolean;
  displayName: string;
  avatarId: string | null;
  fromMe: boolean;
  animateIn?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      layout={!reduce}
      initial={reduce || !animateIn ? false : messagePop.initial}
      animate={messagePop.animate}
      transition={messagePop.transition}
      className={cn('flex gap-2', fromMe ? 'flex-row-reverse' : 'flex-row')}
    >
      <ChatAvatar
        contactId={avatarId}
        name={displayName}
        size="msg"
        className="self-end"
      />

      <div
        className={cn(
          'flex max-w-[min(78%,26rem)] flex-col',
          fromMe ? 'items-end' : 'items-start',
        )}
      >
        {showLabel ? (
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-0.5 px-1 text-xs font-medium text-[#53bdeb]"
          >
            {displayName}
          </motion.span>
        ) : null}
        <motion.div
          whileHover={reduce ? undefined : { scale: 1.008 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[15px] leading-snug shadow-sm',
            fromMe
              ? 'rounded-br-none bg-[#005c4b] text-[#e9edef]'
              : 'rounded-bl-none bg-[#202c33] text-[#e9edef]',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
          <p
            className={cn(
              'mt-0.5 text-right text-[10px]',
              fromMe ? 'text-[#99beb7]' : 'text-[#8696a0]',
            )}
          >
            {fmtChatTime(msg.timestamp)}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
