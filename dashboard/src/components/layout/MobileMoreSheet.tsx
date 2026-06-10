import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { fmtUptime } from '@/lib/format';
import { NAV_ITEMS } from '@/lib/nav';
import { NavIcon } from '@/components/layout/NavIcon';
import { useBot } from '@/context/BotContext';
import { Button } from '@/components/ui/Button';
import { statusLabel, STATUS_META } from '@/lib/status';

export function MobileMoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, togglePause } = useBot();
  const [uptime, setUptime] = useState('0s');

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      if (state?.startedAt) setUptime(fmtUptime(Date.now() - state.startedAt));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open, state?.startedAt]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const status = state?.status ?? 'initializing';
  const meta = STATUS_META[status];
  const label = statusLabel(status, !!state?.paused);
  const extraItems = NAV_ITEMS.filter((n) => !n.tabBar);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-hidden rounded-t-[var(--radius-lg)] border border-border bg-surface-1 shadow-2xl"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              // Fecha se arrastou o suficiente OU soltou com velocidade.
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="flex cursor-grab touch-none justify-center py-2 active:cursor-grabbing">
              <span className="h-1 w-10 rounded-full bg-border-strong" aria-hidden />
            </div>
            <div className="px-4 pb-2">
              <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border-soft bg-surface-2/50 p-3">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full', meta.dot)} aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-ink">{label}</p>
                    <p className="text-[11px] text-muted">{uptime}</p>
                  </div>
                </div>
                <Button
                  variant={state?.paused ? 'primary' : 'warn'}
                  size="md"
                  onClick={() => void togglePause().catch(() => {})}
                >
                  {state?.paused ? 'Retomar' : 'Pausar'}
                </Button>
              </div>

              <ul className="space-y-1">
                {extraItems.map((item) => (
                  <li key={item.id}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'touch-target flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-accent-soft text-ink'
                            : 'text-ink-dim active:bg-surface-hover',
                        )
                      }
                    >
                      <NavIcon id={item.id} className="size-5 text-accent" />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-muted" aria-hidden>
                        →
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
