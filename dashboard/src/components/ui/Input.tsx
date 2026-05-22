import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const fieldClass =
  'w-full min-h-11 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3.5 py-2.5 text-base text-ink placeholder:text-muted-dim transition-colors hover:border-border-strong focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15 sm:min-h-9 sm:px-3 sm:py-2 sm:text-sm';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldClass, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldClass, 'min-h-[100px] resize-y leading-relaxed', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-ink-dim">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-snug text-muted">{hint}</span> : null}
    </label>
  );
}
