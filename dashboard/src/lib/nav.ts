import type { RouteId } from '@/types';

export interface NavItem {
  id: RouteId;
  to: string;
  label: string;
  /** Rótulo curto para tab bar e cabeçalho mobile */
  shortLabel: string;
  description: string;
  shortcut?: string;
  live?: boolean;
  /** Exibir na barra inferior (mobile) */
  tabBar?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'painel',
    to: '/',
    label: 'Painel',
    shortLabel: 'Início',
    description: 'Visão geral e métricas',
    shortcut: 'G H',
    tabBar: true,
  },
  {
    id: 'grupos',
    to: '/grupos',
    label: 'Grupos & Líderes',
    shortLabel: 'Grupos',
    description: 'Quem o bot responde',
    shortcut: 'G G',
    tabBar: true,
  },
  {
    id: 'atividade',
    to: '/atividade',
    label: 'Atividade',
    shortLabel: 'Atividade',
    description: 'Feed em tempo real',
    live: true,
    shortcut: 'G A',
    tabBar: true,
  },
  {
    id: 'historico',
    to: '/historico',
    label: 'Histórico',
    shortLabel: 'Histórico',
    description: 'Perguntas respondidas',
    shortcut: 'G Q',
    tabBar: true,
  },
  {
    id: 'config',
    to: '/config',
    label: 'Configurações',
    shortLabel: 'Config',
    description: 'Runtime e testes',
    shortcut: 'G C',
  },
  {
    id: 'logs',
    to: '/logs',
    label: 'Logs',
    shortLabel: 'Logs',
    description: 'Eventos do processo',
    shortcut: 'G L',
  },
];

export const TAB_BAR_ITEMS = NAV_ITEMS.filter((n) => n.tabBar);

export const MORE_MENU_IDS: RouteId[] = ['config', 'logs'];

export function navItemByPath(pathname: string): NavItem | undefined {
  if (pathname === '/' || pathname === '') return NAV_ITEMS[0];
  const slug = pathname.replace(/^\//, '').split('/')[0];
  return NAV_ITEMS.find((n) => n.to === `/${slug}` || n.to.endsWith(`/${slug}`));
}

export function isMoreMenuRoute(pathname: string): boolean {
  const item = navItemByPath(pathname);
  return item ? MORE_MENU_IDS.includes(item.id) : false;
}

export const QUICK_LINKS = NAV_ITEMS.filter((n) => n.id !== 'painel').map((n) => ({
  ...n,
  icon: n.id,
}));
