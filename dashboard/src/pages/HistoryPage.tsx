import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useBot } from '@/context/BotContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { fmtDate, fmtMs, fmtTime } from '@/lib/format';

export function HistoryPage() {
  const { history } = useBot();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        (h.question || '').toLowerCase().includes(q) ||
        (h.answer || '').toLowerCase().includes(q) ||
        (h.groupName || '').toLowerCase().includes(q) ||
        (h.leaderId || '').toLowerCase().includes(q),
    );
  }, [history, search]);

  return (
    <>
      <PageHeader
        title="Histórico de Q&A"
        description="Perguntas que o bot respondeu, com a fonte da resposta."
        actions={
          <>
            <Input
              type="search"
              placeholder="Buscar pergunta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52"
            />
            <span className="text-xs text-muted">
              {filtered.length} de {history.length} entradas
            </span>
          </>
        }
      />

      {!filtered.length ? (
        <EmptyState
          icon="💬"
          title={history.length ? 'Nenhuma entrada na busca' : 'Sem entradas ainda'}
          description={
            history.length
              ? undefined
              : 'O histórico aparece assim que o bot responder uma pergunta.'
          }
        />
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.03 } },
          }}
          className="space-y-2"
        >
          {filtered.map((h) => {
            const phone = (h.leaderId || '').split('@')[0];
            const sourceTone =
              h.source === 'cache'
                ? 'info'
                : h.source === 'ai'
                  ? 'violet'
                  : h.source === 'fallback'
                    ? 'danger'
                    : 'neutral';

            return (
              <motion.li
                key={`${h.at}-${h.question.slice(0, 24)}`}
                variants={{
                  hidden: { opacity: 0, x: -6 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
                }}
                className="rounded-[var(--radius-md)] border border-border-soft bg-surface-1/60 p-4 transition-colors hover:border-border hover:bg-surface-1/80"
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                  <span>
                    {fmtDate(h.at)} · {fmtTime(h.at)}
                  </span>
                  <span>·</span>
                  <strong className="text-ink-dim">{h.groupName || 'grupo'}</strong>
                  <span>·</span>
                  <code>{phone}</code>
                  <span>·</span>
                  <span>{fmtMs(h.elapsedMs)}</span>
                  <Badge tone={sourceTone}>{h.source}</Badge>
                </div>
                <p className="text-sm font-medium text-ink">{h.question}</p>
                <p className="mt-2 text-sm text-ink-dim">{h.answer}</p>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </>
  );
}
