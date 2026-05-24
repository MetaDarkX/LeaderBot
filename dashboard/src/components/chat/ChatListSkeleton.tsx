import { motion } from 'framer-motion';
import { chatEase } from '@/components/chat/motion';

function Row() {
  return (
    <div className="flex items-center gap-3 border-b border-border-soft/60 px-3 py-3">
      <div className="size-12 shrink-0 animate-pulse rounded-full bg-surface-hover" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-hover" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-surface-hover/80" />
      </div>
    </div>
  );
}

export function ChatListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: chatEase }}
      className="divide-y divide-border-soft/40"
    >
      {Array.from({ length: rows }, (_, i) => (
        <Row key={i} />
      ))}
    </motion.div>
  );
}
