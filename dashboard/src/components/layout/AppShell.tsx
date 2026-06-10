import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/cn';
import { fmtUptime } from '@/lib/format';
import { statusLabel, STATUS_META } from '@/lib/status';
import { NAV_ITEMS, navItemByPath, navIndexByPath } from '@/lib/nav';
import { useBot } from '@/context/BotContext';
import { useKeyboardNav, keyboardHintForNav } from '@/hooks/useKeyboardNav';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileMoreSheet } from '@/components/layout/MobileMoreSheet';
import { NavIcon } from '@/components/layout/NavIcon';
import { Button } from '@/components/ui/Button';

// Slide direcional: navegar "para frente" na ordem da nav desliza da
// direita; "para trás" desliza da esquerda — como apps nativos.
const pageVariants: Variants = {
  initial: (dir: number) => ({ opacity: 0, x: 28 * dir, y: dir === 0 ? 8 : 0 }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: -20 * dir,
    transition: { duration: 0.14, ease: 'easeIn' },
  }),
};

function StatusPill({ compact }: { compact?: boolean }) {
  const { state } = useBot();
  const status = state?.status ?? 'initializing';
  const meta = STATUS_META[status];
  const label = statusLabel(status, !!state?.paused);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/80 px-2.5 py-1 backdrop-blur-sm',
        compact && 'max-w-[120px] px-2 py-1',
      )}
      title={label}
    >
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          meta.dot,
          status === 'ready' && 'shadow-[0_0_8px_var(--color-accent-glow)]',
        )}
        aria-hidden
      />
      {!compact ? <span className="text-xs text-ink-dim">{label}</span> : (
        <span className="truncate text-[10px] text-ink-dim max-lg:max-w-[5rem]">{label}</span>
      )}
    </div>
  );
}

function SidebarNav() {
  const { groups } = useBot();

  return (
    <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="Navegação lateral">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.id}
          to={item.to}
          end={item.to === '/'}
          title={item.description}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors duration-200',
              isActive ? 'text-ink' : 'text-muted hover:bg-surface-hover/80 hover:text-ink-dim',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="sidebar-nav-pill"
                  className="absolute inset-0 rounded-[var(--radius-sm)] border border-accent/15 bg-accent-soft/50"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative z-[1]">
                <NavIcon id={item.id} className="size-[18px]" />
              </span>
              <span className="relative z-[1] flex min-w-0 flex-1 flex-col">
                <span className="truncate">{item.label}</span>
                <span
                  className={cn(
                    'truncate text-[10px] font-normal',
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

function DesktopSidebar() {
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
    <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:border-r lg:border-border-soft lg:bg-surface-1/95">
      <div className="border-b border-border-soft px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-accent-soft to-surface-3 text-lg">
            🤖
          </div>
          <div>
            <strong className="text-sm font-semibold tracking-tight text-ink">wppbot</strong>
            <p className="text-[11px] text-muted">dashboard de gincana</p>
          </div>
        </div>
      </div>
      <SidebarNav />
      <div className="mt-auto space-y-2 border-t border-border-soft p-3">
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
        <p className="rounded-[var(--radius-sm)] bg-surface-2/60 px-2 py-1.5 text-center text-[10px] text-muted-dim">
          <kbd className="rounded border border-border px-1 font-mono text-[9px]">P</kbd> pausar ·{' '}
          <kbd className="rounded border border-border px-1 font-mono text-[9px]">G</kbd>+letra
        </p>
      </div>
    </aside>
  );
}

export function AppShell() {
  const { state, togglePause } = useBot();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const current = navItemByPath(location.pathname);

  // Direção do slide: compara o índice da rota atual com o da anterior.
  const navIndex = navIndexByPath(location.pathname);
  const prevIndexRef = useRef(navIndex);
  const direction = navIndex === prevIndexRef.current ? 0 : navIndex > prevIndexRef.current ? 1 : -1;

  useKeyboardNav(() => void togglePause().catch(() => {}));

  const showBanner =
    state?.status === 'error' ||
    (state?.status === 'disconnected' && state.lastError);

  useEffect(() => {
    prevIndexRef.current = navIndex;
  }, [navIndex]);

  useEffect(() => {
    setMoreOpen(false);
    // Cada página começa do topo (o HashRouter não restaura sozinho).
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh lg:flex">
      <DesktopSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho mobile */}
        <header className="mobile-header glass-panel sticky top-0 z-20 border-b border-border-soft lg:hidden">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current?.id ?? 'wppbot'}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="truncate text-base font-semibold tracking-tight text-ink">
                    {current?.shortLabel ?? 'wppbot'}
                  </p>
                  {current && current.id !== 'painel' ? (
                    <p className="truncate text-[11px] text-muted">{current.description}</p>
                  ) : (
                    <p className="text-[11px] text-muted">Bot de gincana</p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <StatusPill compact />
            <button
              type="button"
              className="touch-target inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-ink-dim active:bg-surface-hover"
              aria-label={state?.paused ? 'Retomar bot' : 'Pausar bot'}
              onClick={() => void togglePause().catch(() => {})}
            >
              {state?.paused ? (
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Cabeçalho desktop */}
        <header className="glass-panel sticky top-0 z-10 hidden border-b border-border-soft px-6 py-3 lg:flex lg:items-center lg:justify-between">
          <Breadcrumbs pathname={location.pathname} />
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] text-muted-dim xl:inline">{keyboardHintForNav()}</span>
            <StatusPill />
          </div>
        </header>

        <main className="main-content flex-1 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
          <div className="hidden lg:block">
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
                className="mb-3 overflow-hidden lg:mb-4"
              >
                <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-warn/25 bg-warn-soft px-3 py-2.5 text-sm text-ink">
                  <span aria-hidden>⚠️</span>
                  <span className="min-w-0 break-words">
                    {state?.lastError
                      ? `Bot com problema: ${state.lastError}`
                      : 'Bot desconectado.'}
                  </span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="hidden border-t border-border-soft px-6 py-2 text-center text-[10px] text-muted-dim lg:block">
          Atalhos:           <kbd className="font-mono">G</kbd> depois{' '}
          <kbd className="font-mono">H</kbd> painel · <kbd className="font-mono">M</kbd> mensagens ·{' '}
          <kbd className="font-mono">G</kbd> grupos · <kbd className="font-mono">A</kbd> atividade ·{' '}
          <kbd className="font-mono">Q</kbd> histórico ·{' '}
          <kbd className="font-mono">C</kbd> config · <kbd className="font-mono">L</kbd> logs ·{' '}
          <kbd className="font-mono">P</kbd> pausar
        </footer>

        <BottomNav onOpenMore={() => setMoreOpen(true)} />
        <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      </div>
    </div>
  );
}
