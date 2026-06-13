import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Accent = 'default' | 'accent' | 'info' | 'violet' | 'danger';

// Minimalismo premium: o card é neutro; a cor aparece só num ponto
// discreto, em vez de tingir o bloco inteiro (menos ruído visual).
const dot: Record<Accent, string> = {
  default: 'bg-muted',
  accent: 'bg-accent',
  info: 'bg-info',
  violet: 'bg-violet',
  danger: 'bg-danger',
};

export function KpiCard({
  label,
  value,
  foot,
  accent = 'default',
  delay = 0,
  size = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  foot?: React.ReactNode;
  accent?: Accent;
  delay?: number;
  size?: 'default' | 'hero';
  className?: string;
}) {
  const hero = size === 'hero';
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col rounded-[var(--radius-md)] border border-border-soft bg-surface-1/70 hover-lift',
        hero ? 'justify-center gap-2 p-5 sm:p-6' : 'gap-1 p-4',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {accent !== 'default' ? (
          <span className={cn('size-1.5 shrink-0 rounded-full', dot[accent])} aria-hidden />
        ) : null}
        {label}
      </span>
      <strong
        className={cn(
          'font-semibold tracking-tight text-ink tabular-nums',
          hero ? 'text-4xl sm:text-5xl' : 'text-2xl',
        )}
      >
        {value}
      </strong>
      {foot ? <span className="text-xs text-muted">{foot}</span> : null}
    </motion.article>
  );
}
