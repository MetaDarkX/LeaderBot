import { useEffect, useId, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg',
  headerAction,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg';
  headerAction?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 flex max-h-[92dvh] w-full flex-col border border-border bg-surface-1 shadow-2xl',
              'rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)]',
              size === 'sm' ? 'max-w-md' : 'max-w-2xl',
            )}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-base font-semibold text-ink">
                  {title}
                </h2>
                {subtitle}
              </div>
              {headerAction}
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? (
              <footer className="flex items-center justify-between gap-3 border-t border-border-soft px-5 py-3">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
