import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Accent = 'default' | 'accent' | 'info' | 'violet' | 'danger';

const accents: Record<Accent, string> = {
  default: 'border-border-soft',
  accent: 'border-accent/25 bg-accent-soft/40',
  info: 'border-info/25 bg-info-soft/50',
  violet: 'border-violet/25 bg-violet-soft/50',
  danger: 'border-danger/25 bg-danger-soft/50',
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col gap-0.5 rounded-[var(--radius-md)] border p-3 hover-lift sm:gap-1 sm:p-4',
        accents[accent],
        'bg-surface-1/70',
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <strong className="text-xl font-semibold tracking-tight text-ink tabular-nums sm:text-2xl">
        {value}
      </strong>
      {foot ? <span className="text-[11px] text-muted">{foot}</span> : null}
    </motion.article>
  );
}
