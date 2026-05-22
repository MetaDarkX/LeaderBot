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
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 max-lg:items-stretch lg:items-center lg:p-4">
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
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'relative z-10 flex w-full flex-col border border-border bg-surface-1 shadow-2xl',
              'max-lg:max-h-[100dvh] max-lg:min-h-[100dvh] max-lg:rounded-none',
              'lg:max-h-[92dvh] lg:rounded-[var(--radius-lg)]',
              size === 'sm' ? 'lg:max-w-md' : 'lg:max-w-2xl',
            )}
            style={{
              paddingTop: 'max(0px, env(safe-area-inset-top))',
              paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
            }}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border-soft px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-base font-semibold text-ink sm:text-lg">
                  {title}
                </h2>
                {subtitle}
              </div>
              <div className="flex shrink-0 items-center gap-1">{headerAction}</div>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {children}
            </div>
            {footer ? (
              <footer className="flex shrink-0 flex-col gap-2 border-t border-border-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 max-sm:[&_button]:w-full">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
