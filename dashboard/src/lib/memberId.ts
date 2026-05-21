import type { Leader, Participant } from '@/types';

/** Identificador usado nas mensagens (wa_id), não o telefone exibido. */
export function participantMemberId(p: Participant): string {
  if (p.wa_id) return p.wa_id.toLowerCase();
  if (p.phone) return `${p.phone.replace(/\D/g, '')}@c.us`;
  return '';
}

export function leaderMemberId(l: Leader): string {
  return (l.member_id || l.phone || '').toLowerCase();
}

/** Valor aceito no campo manual (número, @lid ou @c.us). */
export function normalizeManualMemberId(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return '';
  if (s.includes('@')) {
    const at = s.indexOf('@');
    const user = s.slice(0, at);
    const domain = s.slice(at + 1);
    const userNorm = /^\d+$/.test(user) ? user : user.replace(/\D/g, '') || user;
    return domain ? `${userNorm}@${domain}` : userNorm;
  }
  const digits = s.replace(/\D/g, '');
  return digits.length >= 10 ? `${digits}@c.us` : digits;
}
