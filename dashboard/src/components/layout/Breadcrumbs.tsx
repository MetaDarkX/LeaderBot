import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { navItemByPath } from '@/lib/nav';
import { cn } from '@/lib/cn';

export function Breadcrumbs({ pathname }: { pathname: string }) {
  const current = navItemByPath(pathname);
  const isHome = pathname === '/' || pathname === '';

  return (
    <nav aria-label="Trilha" className="mb-1 flex items-center gap-1.5 text-xs">
      <Link
        to="/"
        className={cn(
          'rounded px-1.5 py-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink-dim',
          isHome && 'pointer-events-none text-ink-dim',
        )}
      >
        Início
      </Link>
      {!isHome && current ? (
        <>
          <span className="text-muted-dim" aria-hidden>
            /
          </span>
          <motion.span
            key={current.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-medium text-ink-dim"
          >
            {current.label}
          </motion.span>
        </>
      ) : null}
    </nav>
  );
}
