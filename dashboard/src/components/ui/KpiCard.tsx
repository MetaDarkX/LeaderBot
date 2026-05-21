import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Accent = 'default' | 'accent' | 'info' | 'violet' | 'danger';

const accents: Record<Accent, string> = {
  default: 'border-border-soft',
  accent: 'border-accent/20 bg-accent-soft/30',
  info: 'border-info/20 bg-info-soft/40',
  violet: 'border-violet/20 bg-violet-soft/40',
  danger: 'border-danger/20 bg-danger-soft/40',
};

export function KpiCard({
  label,
  value,
  foot,
  accent = 'default',
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  foot?: React.ReactNode;
  accent?: Accent;
  delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={cn(
        'flex flex-col gap-1 rounded-[var(--radius-md)] border p-4',
        accents[accent],
        'bg-surface-1/60',
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
      <strong className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </strong>
      {foot ? <span className="text-[11px] text-muted">{foot}</span> : null}
    </motion.article>
  );
}
