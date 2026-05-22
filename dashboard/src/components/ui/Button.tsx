import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warn' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-surface-0 hover:bg-accent-dim shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_2px_12px_rgb(34_197_94/0.2)] active:scale-[0.98]',
  secondary:
    'bg-surface-3 text-ink border border-border hover:border-border-strong hover:bg-surface-hover active:scale-[0.98]',
  ghost:
    'bg-transparent text-ink-dim hover:bg-surface-hover hover:text-ink active:scale-[0.98]',
  warn:
    'bg-warn-soft text-warn border border-warn/20 hover:bg-warn/20 active:scale-[0.98]',
  danger:
    'bg-danger-soft text-danger border border-danger/20 hover:bg-danger/25 active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-2 px-4 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      loading,
      block,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium',
        'transition-[color,background-color,transform,box-shadow] duration-200 ease-[var(--ease-smooth)]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
