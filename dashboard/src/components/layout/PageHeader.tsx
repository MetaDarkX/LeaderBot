import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mb-4 lg:mb-6', className)}
    >
      <div className="max-lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm text-balance text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className={cn('page-actions mt-3 lg:mt-4', description && 'max-lg:mt-3')}>
          {actions}
        </div>
      ) : null}
      {description ? (
        <p className="mt-2 text-sm text-muted lg:hidden">{description}</p>
      ) : null}
    </motion.header>
  );
}
