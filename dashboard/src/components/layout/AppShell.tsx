import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { fmtUptime } from '@/lib/format';
import { statusLabel, STATUS_META } from '@/lib/status';
import { useBot } from '@/context/BotContext';
import { Button } from '@/components/ui/Button';
import type { RouteId } from '@/types';

const NAV: { id: RouteId; to: string; label: string; live?: boolean }[] = [
  { id: 'painel', to: '/', label: 'Painel' },
  { id: 'grupos', to: '/grupos', label: 'Grupos & Líderes' },
  { id: 'atividade', to: '/atividade', label: 'Atividade', live: true },
  { id: 'historico', to: '/historico', label: 'Histórico' },
  { id: 'config', to: '/config', label: 'Configurações' },
  { id: 'logs', to: '/logs', label: 'Logs' },
];

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
        'inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1',
        compact && 'px-2 py-1',
      )}
      title={label}
    >
      <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden />
      {!compact ? (
        <span className="text-xs text-ink-dim">{label}</span>
      ) : null}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { state, groups, togglePause } = useBot();
  const [uptime, setUptime] = useState('uptime 0s');

  useEffect(() => {
    const tick = () => {
      if (state?.startedAt) {
        setUptime(fmtUptime(Date.now() - state.startedAt));
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state?.startedAt]);

  return (
    <>
      <div className="border-b border-border-soft px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-lg">
            🤖
          </div>
          <div>
            <strong className="text-sm font-semibold text-ink">wppbot</strong>
            <p className="text-[11px] text-muted">dashboard de gincana</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="Navegação principal">
        {NAV.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-surface-3 text-ink'
                  : 'text-muted hover:bg-surface-hover hover:text-ink-dim',
              )
            }
          >
            <NavIcon id={item.id} />
            <span className="flex-1">{item.label}</span>
            {item.id === 'grupos' && groups.length > 0 ? (
              <span className="rounded-full bg-surface-3 px-1.5 text-[10px] text-muted">
                {groups.length}
              </span>
            ) : null}
            {item.live ? (
              <span className="size-1.5 rounded-full bg-accent animate-pulse" aria-hidden />
            ) : null}
          </NavLink>
        ))}
      </nav>

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
      </div>
    </>
  );
}

export function AppShell() {
  const { state, togglePause } = useBot();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showBanner =
    state?.status === 'error' ||
    (state?.status === 'disconnected' && state.lastError);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        void togglePause().catch(() => {});
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePause]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[244px_1fr]">
      <header className="flex items-center justify-between gap-3 border-b border-border-soft bg-surface-1/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink-dim hover:bg-surface-hover"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <strong className="text-sm">wppbot</strong>
        <StatusPill compact />
      </header>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col border-r border-border-soft bg-surface-1 transition-transform duration-200 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        {showBanner ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-warn/25 bg-warn-soft px-3 py-2 text-sm text-ink"
          >
            <span aria-hidden>⚠️</span>
            <span>
              {state?.lastError
                ? `Bot com problema: ${state.lastError}`
                : 'Bot desconectado.'}
            </span>
          </div>
        ) : null}

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
