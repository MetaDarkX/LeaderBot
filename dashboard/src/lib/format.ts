export function fmtMs(ms?: number): string {
  if (!ms) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export function fmtUptime(ms?: number): string {
  if (!ms) return 'uptime 0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `uptime ${h}h ${m}m`;
  if (m) return `uptime ${m}m ${sec}s`;
  return `uptime ${sec}s`;
}

export function fmtPct(n: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((n / total) * 100)}% das recebidas`;
}

export function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString('pt-BR', { hour12: false });
}

export function fmtDate(at: number): string {
  return new Date(at).toLocaleDateString('pt-BR');
}
