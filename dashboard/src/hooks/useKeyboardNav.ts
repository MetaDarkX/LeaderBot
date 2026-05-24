import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '@/lib/nav';

/** Atalhos: G depois H/G/A/Q/C/L; P pausa o bot (tratado no AppShell). */
export function useKeyboardNav(onPause?: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    let pendingG = false;
    let gTimer: ReturnType<typeof setTimeout> | undefined;

    const clearG = () => {
      pendingG = false;
      if (gTimer) clearTimeout(gTimer);
    };

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;

      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onPause?.();
        return;
      }

      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        pendingG = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(clearG, 1200);
        return;
      }

      if (!pendingG) return;

      const map: Record<string, string> = {
        h: '/',
        m: '/mensagens',
        g: '/grupos',
        a: '/atividade',
        q: '/historico',
        c: '/config',
        l: '/logs',
      };
      const dest = map[e.key.toLowerCase()];
      if (dest) {
        e.preventDefault();
        navigate(dest);
        clearG();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearG();
    };
  }, [navigate, onPause]);
}

export function keyboardHintForNav() {
  return NAV_ITEMS.map((n) => n.shortcut).filter(Boolean).join(' · ');
}
