import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  'aria-label'?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('scroll-x-tabs -mx-1 overflow-x-auto px-1 max-lg:w-full', className)}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="relative inline-flex min-w-max rounded-[var(--radius-sm)] border border-border bg-surface-2 p-0.5"
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                'touch-target relative z-[1] min-h-10 shrink-0 rounded-[8px] px-3 py-2 text-xs font-medium transition-colors duration-200 sm:min-h-8 sm:px-2.5 sm:py-1.5',
                selected ? 'text-ink' : 'text-muted active:text-ink-dim',
              )}
            >
              {selected ? (
                <motion.span
                  layoutId="segment-pill"
                  className="absolute inset-0 rounded-[8px] bg-surface-3 shadow-[0_1px_2px_rgb(0_0_0/0.25)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              ) : null}
              <span className="relative whitespace-nowrap">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
