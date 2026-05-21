import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'warn' | 'info' | 'violet' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-muted border-border',
  accent: 'bg-accent-soft text-accent border-accent/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
  info: 'bg-info-soft text-info border-info/20',
  violet: 'bg-violet-soft text-violet border-violet/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
