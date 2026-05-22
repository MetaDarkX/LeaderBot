import type { RouteId } from '@/types';

export interface NavItem {
  id: RouteId;
  to: string;
  label: string;
  description: string;
  shortcut?: string;
  live?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'painel',
    to: '/',
    label: 'Painel',
    description: 'Visão geral e métricas',
    shortcut: 'G H',
  },
  {
    id: 'grupos',
    to: '/grupos',
    label: 'Grupos & Líderes',
    description: 'Quem o bot responde',
    shortcut: 'G G',
  },
  {
    id: 'atividade',
    to: '/atividade',
    label: 'Atividade',
    description: 'Feed em tempo real',
    live: true,
    shortcut: 'G A',
  },
  {
    id: 'historico',
    to: '/historico',
    label: 'Histórico',
    description: 'Perguntas respondidas',
    shortcut: 'G Q',
  },
  {
    id: 'config',
    to: '/config',
    label: 'Configurações',
    description: 'Runtime e testes',
    shortcut: 'G C',
  },
  {
    id: 'logs',
    to: '/logs',
    label: 'Logs',
    description: 'Eventos do processo',
    shortcut: 'G L',
  },
];

export function navItemByPath(pathname: string): NavItem | undefined {
  if (pathname === '/' || pathname === '') return NAV_ITEMS[0];
  const slug = pathname.replace(/^\//, '').split('/')[0];
  return NAV_ITEMS.find((n) => n.to === `/${slug}` || n.to.endsWith(`/${slug}`));
}

export const QUICK_LINKS = NAV_ITEMS.filter((n) => n.id !== 'painel').map((n) => ({
  ...n,
  icon: n.id,
}));
