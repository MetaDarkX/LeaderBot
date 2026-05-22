import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { fmtUptime } from '@/lib/format';
import { statusLabel, STATUS_META } from '@/lib/status';
import { NAV_ITEMS } from '@/lib/nav';
import { useBot } from '@/context/BotContext';
import { useKeyboardNav, keyboardHintForNav } from '@/hooks/useKeyboardNav';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import type { RouteId } from '@/types';

function NavIcon({ id }: { id: RouteId }) {
  const cls = 'size-[18px] shrink-0';
  switch (id) {
    case 'painel':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'grupos':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'atividade':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'historico':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'config':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'logs':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
  }
}

function StatusPill({ compact }: { compact?: boolean }) {
  const { state } = useBot();
  const status = state?.status ?? 'initializing';
  const meta = STATUS_META[status];
  const label = statusLabel(status, !!state?.paused);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/80 px-2.5 py-1 backdrop-blur-sm',
        compact && 'px-2 py-1',
      )}
      title={label}
    >
      <span
        className={cn('size-2 rounded-full', meta.dot, status === 'ready' && 'shadow-[0_0_8px_var(--color-accent-glow)]')}
        aria-hidden
      />
      {!compact ? <span className="text-xs text-ink-dim">{label}</span> : null}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { groups } = useBot();

  return (
    <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="Navegação principal">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.id}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          title={item.description}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'text-ink'
                : 'text-muted hover:bg-surface-hover/80 hover:text-ink-dim',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-[var(--radius-sm)] border border-accent/15 bg-accent-soft/50"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative z-[1]">
                <NavIcon id={item.id} />
              </span>
              <span className="relative z-[1] flex min-w-0 flex-1 flex-col">
                <span className="truncate">{item.label}</span>
                <span
                  className={cn(
                    'truncate text-[10px] font-normal transition-opacity',
                    isActive ? 'text-muted' : 'text-muted-dim opacity-0 group-hover:opacity-100',
                  )}
                >
                  {item.description}
                </span>
              </span>
              {item.id === 'grupos' && groups.length > 0 ? (
                <span className="relative z-[1] rounded-full bg-surface-3 px-1.5 text-[10px] tabular-nums text-muted">
                  {groups.length}
                </span>
              ) : null}
              {item.live ? (
                <span
                  className="relative z-[1] size-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent-glow)] animate-pulse"
                  aria-hidden
                />
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { state, togglePause } = useBot();
  const [uptime, setUptime] = useState('uptime 0s');

  useEffect(() => {
    const tick = () => {
      if (state?.startedAt) setUptime(fmtUptime(Date.now() - state.startedAt));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state?.startedAt]);

  return (
    <>
      <div className="border-b border-border-soft px-4 py-5">
        <div className="flex items-center gap-3">
          <motion.div
            className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-accent-soft to-surface-3 text-lg shadow-[0_0_20px_rgb(34_197_94/0.15)]"
            whileHover={{ scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            🤖
          </motion.div>
          <div>
            <strong className="text-sm font-semibold tracking-tight text-ink">wppbot</strong>
            <p className="text-[11px] text-muted">dashboard de gincana</p>
          </div>
        </div>
      </div>

      <SidebarNav onNavigate={onNavigate} />

      <div className="space-y-2 border-t border-border-soft p-3">
        <StatusPill />
        <Button
          variant={state?.paused ? 'primary' : 'warn'}
          size="sm"
          block
          onClick={() => void togglePause().catch(() => {})}
        >
          {state?.paused ? 'Retomar bot' : 'Pausar bot'}
        </Button>
        <p className="text-center text-[11px] text-muted">{uptime}</p>
        <p className="rounded-[var(--radius-sm)] bg-surface-2/60 px-2 py-1.5 text-center text-[10px] leading-snug text-muted-dim">
          <kbd className="rounded border border-border px-1 font-mono text-[9px] text-muted">P</kbd> pausar ·{' '}
          <kbd className="rounded border border-border px-1 font-mono text-[9px] text-muted">G</kbd>+letra navegar
        </p>
      </div>
    </>
  );
}

export function AppShell() {
  const { state, togglePause } = useBot();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useKeyboardNav(() => void togglePause().catch(() => {}));

  const showBanner =
    state?.status === 'error' ||
    (state?.status === 'disconnected' && state.lastError);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <header className="glass-panel sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3 lg:hidden">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink-dim transition-colors hover:bg-surface-hover hover:text-ink"
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <strong className="text-sm tracking-tight">wppbot</strong>
        <StatusPill compact />
      </header>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border-soft bg-surface-1/95 backdrop-blur-md transition-transform duration-300 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ transitionTimingFunction: 'var(--ease-smooth)' }}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.button
            type="button"
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] lg:hidden"
            aria-label="Fechar menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        <header className="glass-panel sticky top-0 z-10 hidden border-b border-border-soft px-6 py-3 lg:flex lg:items-center lg:justify-between">
          <Breadcrumbs pathname={location.pathname} />
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] text-muted-dim xl:inline" title="Atalhos de teclado">
              {keyboardHintForNav()}
            </span>
            <StatusPill />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <Breadcrumbs pathname={location.pathname} />
          </div>

          <AnimatePresence mode="wait">
            {showBanner ? (
              <motion.div
                key="banner"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-warn/25 bg-warn-soft px-3 py-2.5 text-sm text-ink">
                  <span aria-hidden>⚠️</span>
                  <span>
                    {state?.lastError
                      ? `Bot com problema: ${state.lastError}`
                      : 'Bot desconectado.'}
                  </span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="hidden border-t border-border-soft px-6 py-2 text-center text-[10px] text-muted-dim lg:block">
          Atalhos: <kbd className="font-mono">G</kbd> depois{' '}
          <kbd className="font-mono">H</kbd> painel · <kbd className="font-mono">G</kbd> grupos ·{' '}
          <kbd className="font-mono">A</kbd> atividade · <kbd className="font-mono">Q</kbd> histórico ·{' '}
          <kbd className="font-mono">C</kbd> config · <kbd className="font-mono">L</kbd> logs ·{' '}
          <kbd className="font-mono">P</kbd> pausar
        </footer>
      </div>
    </div>
  );
}
