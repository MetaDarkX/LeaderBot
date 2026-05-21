import { cn } from '@/lib/cn';

export function Card({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-md)] border border-border-soft bg-surface-1/80 shadow-[0_1px_0_rgb(255_255_255/0.03),0_4px_24px_rgb(0_0_0/0.28)] backdrop-blur-sm',
        padding && 'p-5',
        className,
      )}
    >
      {children}
    </section>
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
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
