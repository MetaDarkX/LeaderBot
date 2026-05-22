import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { TAB_BAR_ITEMS, isMoreMenuRoute, NAV_ITEMS } from '@/lib/nav';
import { NavIcon } from '@/components/layout/NavIcon';
import { useBot } from '@/context/BotContext';

export function BottomNav({ onOpenMore }: { onOpenMore: () => void }) {
  const { groups } = useBot();
  const { pathname } = useLocation();
  const moreActive = isMoreMenuRoute(pathname);

  return (
    <nav
      className="bottom-nav glass-panel fixed inset-x-0 bottom-0 z-30 border-t border-border-soft lg:hidden"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {TAB_BAR_ITEMS.map((item) => (
          <li key={item.id} className="flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'touch-target relative flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-muted active:text-ink-dim',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-x-1 inset-y-0 rounded-[var(--radius-sm)] bg-accent-soft/60"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative">
                    <NavIcon id={item.id} className="size-6" />
                    {item.id === 'grupos' && groups.length > 0 ? (
                      <span className="absolute -right-1 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-surface-0">
                        {groups.length > 9 ? '9+' : groups.length}
                      </span>
                    ) : null}
                    {item.live ? (
                      <span
                        className="absolute -right-0.5 top-0 size-2 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent-glow)]"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span className="relative max-w-[4.5rem] truncate">{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onOpenMore}
            aria-expanded={moreActive}
            aria-haspopup="dialog"
            className={cn(
              'touch-target relative flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-[10px] font-medium transition-colors',
              moreActive ? 'text-accent' : 'text-muted active:text-ink-dim',
            )}
          >
            {moreActive ? (
              <motion.span
                layoutId="bottom-nav-indicator"
                className="absolute inset-x-1 inset-y-0 rounded-[var(--radius-sm)] bg-accent-soft/60"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <svg
              className="relative size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <span className="relative">Mais</span>
          </button>
        </li>
      </ul>
      {/* rotas do menu “Mais” para leitores de tela */}
      <span className="sr-only">
        {NAV_ITEMS.filter((n) => !n.tabBar)
          .map((n) => n.label)
          .join(', ')}
      </span>
    </nav>
  );
}
