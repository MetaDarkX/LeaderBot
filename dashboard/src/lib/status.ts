import type { BotStatus } from '@/types';

export const STATUS_META: Record<
  BotStatus,
  { label: string; dot: string; tone: 'neutral' | 'warn' | 'ok' | 'err' }
> = {
  initializing: { label: 'inicializando…', dot: 'bg-muted', tone: 'neutral' },
  qr: { label: 'aguardando QR', dot: 'bg-warn', tone: 'warn' },
  authenticated: { label: 'autenticando…', dot: 'bg-warn', tone: 'warn' },
  ready: { label: 'conectado', dot: 'bg-accent', tone: 'ok' },
  disconnected: { label: 'desconectado', dot: 'bg-warn', tone: 'warn' },
  error: { label: 'erro', dot: 'bg-danger', tone: 'err' },
};

export function statusLabel(status: BotStatus, paused: boolean): string {
  const base = STATUS_META[status]?.label ?? status;
  return paused ? `${base} · pausado` : base;
}
