import { motion, AnimatePresence } from 'framer-motion';
import { ACTION_LABELS, matchesActivityFilter, type ActivityFilter } from '@/lib/activity';
import type { ActivityItem } from '@/types';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';

export function ActivityFeed({
  items,
  filter = 'all',
  compact,
  className,
}: {
  items: ActivityItem[];
  filter?: ActivityFilter;
  compact?: boolean;
  className?: string;
}) {
  const list = (compact ? items.slice(0, 10) : items).filter((i) =>
    matchesActivityFilter(i.action, i.isLeader, filter),
  );

  if (!list.length) {
    return (
      <EmptyState
        className={cn('border-0 bg-transparent py-8', className)}
        title="Aguardando mensagens…"
        description="O feed atualiza em tempo real quando o bot processa mensagens."
      />
    );
  }

  return (
    <div
      className={cn(
        'divide-y divide-border-soft overflow-hidden rounded-[var(--radius-md)] border border-border-soft',
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {list.map((item) => {
          const label = ACTION_LABELS[item.action] || item.action;
          const isAnswered = item.action === 'answered';
          const isIgnored = item.action.startsWith('ignored:');
          const key = `${item.at}-${item.action}-${item.author ?? ''}`;

          return (
            <motion.article
              key={key}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-3 py-3 transition-colors active:bg-surface-hover/60 sm:px-3 sm:py-2.5 sm:hover:bg-surface-hover/60"
            >
              {/* Mobile: empilhado */}
              <div className="flex flex-col gap-2 sm:hidden">
                <div className="flex items-center justify-between gap-2">
                  <time className="font-mono text-[11px] text-muted tabular-nums">
                    {fmtTime(item.at)}
                  </time>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                        isAnswered && 'bg-accent-soft text-accent',
                        isIgnored && 'bg-surface-3 text-muted',
                        item.action === 'error' && 'bg-danger-soft text-danger',
                      )}
                    >
                      {label}
                    </span>
                    {item.isLeader ? <span aria-hidden>👑</span> : null}
                  </div>
                </div>
                <p className="text-sm leading-snug text-ink-dim">
                  <span className="font-medium text-ink">{item.groupName || 'DM'}</span>
                  {item.author ? ` · ${item.author}` : ''}
                  {item.body ? (
                    <span className="block mt-1 text-muted">&quot;{item.body}&quot;</span>
                  ) : null}
                  {item.reason ? (
                    <span className="block text-xs text-muted">({item.reason})</span>
                  ) : null}
                </p>
              </div>

              {/* Desktop: grid */}
              <div className="hidden grid-cols-[auto_auto_1fr_auto] items-start gap-x-2 gap-y-0.5 text-xs sm:grid">
                <time className="font-mono text-[11px] text-muted tabular-nums">
                  {fmtTime(item.at)}
                </time>
                <span
                  className={cn(
                    'rounded px-1 py-0.5 text-[10px] font-semibold tracking-wide',
                    isAnswered && 'bg-accent-soft text-accent',
                    isIgnored && 'bg-surface-3 text-muted',
                    item.action === 'error' && 'bg-danger-soft text-danger',
                  )}
                >
                  {label}
                </span>
                <p className="min-w-0 text-ink-dim">
                  <span className="font-medium text-ink">{item.groupName || 'DM'}</span>
                  {item.author ? ` · ${item.author}` : ''}
                  {item.body ? (
                    <span className="text-muted"> &quot;{item.body}&quot;</span>
                  ) : null}
                  {item.reason ? (
                    <span className="text-muted"> ({item.reason})</span>
                  ) : null}
                </p>
                <span className="text-right" aria-hidden>
                  {item.isLeader ? '👑' : ''}
                </span>
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
