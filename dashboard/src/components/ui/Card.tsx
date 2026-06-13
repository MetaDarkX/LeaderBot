import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Card({
  children,
  className,
  padding = true,
  hoverLift = false,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hoverLift?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-[var(--radius-md)] border border-border-soft bg-surface-1/80',
        'shadow-[0_1px_0_rgb(255_255_255/0.03),0_12px_40px_-16px_rgb(0_0_0/0.55)]',
        padding && 'p-4 sm:p-5',
        hoverLift && 'hover-lift',
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
