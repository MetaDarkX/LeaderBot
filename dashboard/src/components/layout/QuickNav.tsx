import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QUICK_LINKS } from '@/lib/nav';
import type { RouteId } from '@/types';
import { cn } from '@/lib/cn';

function QuickIcon({ id }: { id: RouteId }) {
  const cls = 'size-5 text-accent';
  switch (id) {
    case 'grupos':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'atividade':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'historico':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'config':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    case 'logs':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    default:
      return null;
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

export function QuickNav() {
  return (
    <section aria-label="Acesso rápido" className="mt-8 hidden lg:block">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        Acesso rápido
      </h2>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {QUICK_LINKS.map((link) => (
          <motion.div key={link.id} variants={item}>
            <Link
              to={link.to}
              className={cn(
                'group flex h-full flex-col gap-3 rounded-[var(--radius-md)] border border-border-soft',
                'bg-surface-1/70 p-4 hover-lift hover:border-border-strong',
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft transition-transform duration-300 group-hover:scale-105">
                <QuickIcon id={link.id} />
              </span>
              <div>
                <span className="flex items-center gap-2 font-semibold text-ink">
                  {link.label}
                  {link.live ? (
                    <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)] animate-pulse" />
                  ) : null}
                </span>
                <p className="mt-0.5 text-xs text-muted">{link.description}</p>
              </div>
              <span className="mt-auto text-xs text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Abrir →
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
