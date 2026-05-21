import { cn } from '@/lib/cn';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  'aria-label'?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-[var(--radius-sm)] border border-border bg-surface-2 p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-surface-3 text-ink shadow-sm'
              : 'text-muted hover:text-ink-dim',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
