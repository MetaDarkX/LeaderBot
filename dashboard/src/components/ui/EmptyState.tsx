import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-1 text-2xl opacity-70" aria-hidden>
          {icon}
        </div>
      ) : null}
      <strong className="text-sm text-ink">{title}</strong>
      {description ? (
        <p className="max-w-sm text-xs text-muted">{description}</p>
      ) : null}
      {action}
    </motion.div>
  );
}
