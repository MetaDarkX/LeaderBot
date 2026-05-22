import { useMemo, useState } from 'react';
import { useBot } from '@/context/BotContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { fmtTime } from '@/lib/format';
import { cn } from '@/lib/cn';

type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error';
const LEVEL_RANK: Record<string, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function LogsPage() {
  const { logs, setLogsLocal } = useBot();
  const [level, setLevel] = useState<LogLevel>('all');

  const filtered = useMemo(() => {
    const min = level === 'all' ? 0 : LEVEL_RANK[level] ?? 0;
    return logs.filter((l) => (LEVEL_RANK[l.level] ?? 0) >= min).slice(-300);
  }, [logs, level]);

  return (
    <>
      <PageHeader
        title="Logs"
        description="Buffer com os últimos 500 eventos."
        actions={
          <>
            <Segmented
              value={level}
              onChange={setLevel}
              aria-label="Filtrar nível de log"
              className="max-lg:w-full"
              options={[
                { value: 'all', label: 'tudo' },
                { value: 'debug', label: 'dbg+' },
                { value: 'info', label: 'info+' },
                { value: 'warn', label: 'warn+' },
                { value: 'error', label: 'erro' },
              ]}
            />
            <Button variant="secondary" size="md" onClick={() => setLogsLocal([])}>
              limpar
            </Button>
          </>
        }
      />

      <pre
        className="max-h-[calc(100dvh-var(--mobile-header-h)-var(--bottom-nav-h)-11rem)] overflow-auto overscroll-contain rounded-[var(--radius-md)] border border-border-soft bg-surface-0 p-3 font-mono text-[11px] leading-relaxed text-ink-dim sm:p-4 sm:text-[12px] lg:max-h-[calc(100dvh-200px)]"
        aria-live="polite"
      >
        {filtered.length ? (
          filtered.map((l, i) => (
            <div key={`${l.at}-${i}`} className="mb-0.5">
              <span className="text-muted">[{fmtTime(l.at)}]</span>{' '}
              <span
                className={cn(
                  'font-semibold',
                  l.level === 'error' && 'text-danger',
                  l.level === 'warn' && 'text-warn',
                  l.level === 'info' && 'text-info',
                  l.level === 'debug' && 'text-muted',
                )}
              >
                {l.level.toUpperCase().padEnd(5)}
              </span>{' '}
              {l.message}
            </div>
          ))
        ) : (
          <span className="text-muted">Nenhum log ainda.</span>
        )}
      </pre>
    </>
  );
}
