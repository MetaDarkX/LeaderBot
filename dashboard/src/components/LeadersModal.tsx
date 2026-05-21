import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { GroupSummary, Leader, Participant } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useBot } from '@/context/BotContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  leaderMemberId,
  normalizeManualMemberId,
  participantMemberId,
} from '@/lib/memberId';

interface LeadersModalProps {
  group: GroupSummary | null;
  onClose: () => void;
}

export function LeadersModal({ group, onClose }: LeadersModalProps) {
  const { toast } = useToast();
  const { loadGroups, leadersVersion } = useBot();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmShort, setConfirmShort] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!group) return;
      setLoading(true);
      if (refresh) setSyncing(true);
      try {
        const qs = refresh ? '?refresh=1' : '';
        const data = await api<{
          participants: Participant[];
          leaders: Leader[];
        }>(`/api/groups/${encodeURIComponent(group.id)}/participants${qs}`);
        setParticipants(data.participants ?? []);
        setLeaders(data.leaders ?? []);
        if (refresh) toast('Participantes sincronizados');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Erro', 'err');
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [group, toast],
  );

  useEffect(() => {
    if (!group) return;
    setSearch('');
    setManual('');
  }, [group?.id]);

  useEffect(() => {
    if (!group) return;
    void load();
  }, [group, leadersVersion, load]);

  const addLeader = async (waId: string, name?: string | null) => {
    if (!group) return;
    try {
      await api(`/api/groups/${encodeURIComponent(group.id)}/leaders`, {
        method: 'POST',
        body: JSON.stringify({ waId, pushname: name }),
      });
      toast('Líder adicionado');
      await load();
      await loadGroups();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'err');
    }
  };

  const removeLeader = async (memberId: string) => {
    if (!group) return;
    try {
      await api(
        `/api/groups/${encodeURIComponent(group.id)}/leaders/${encodeURIComponent(memberId)}`,
        { method: 'DELETE' },
      );
      toast('Líder removido');
      await load();
      await loadGroups();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'err');
    }
  };

  const onManualAdd = async () => {
    const memberId = normalizeManualMemberId(manual);
    if (!memberId) {
      toast('Cole o ID (ex.: 59619045069032@lid)', 'err');
      return;
    }
    if (!memberId.includes('@') && memberId.length < 8) {
      setConfirmShort(memberId);
      return;
    }
    await addLeader(memberId, null);
    setManual('');
  };

  const q = search.trim().toLowerCase();
  const filtered = participants.filter((p) => {
    if (!q) return true;
    const hay = `${p.phone} ${p.wa_id || ''} ${p.pushname || ''} ${p.display_name || ''}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <>
      <Modal
        open={!!group}
        onClose={onClose}
        title={group?.name || 'Grupo'}
        subtitle={
          group ? (
            <code className="mt-1 block truncate text-[11px] text-muted">{group.id}</code>
          ) : undefined
        }
        headerAction={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              loading={syncing}
              onClick={() => void load(true)}
            >
              ↻ sincronizar
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
              ✕
            </Button>
          </div>
        }
        footer={
          <>
            <span className="text-[11px] text-muted">
              Use <strong className="text-ink-dim">☆</strong> para definir ou remover um líder.
            </span>
            <Button variant="primary" size="sm" onClick={onClose}>
              Concluir
            </Button>
          </>
        }
      >
        <section className="mb-5">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Líderes atuais
          </h3>
          <div className="flex flex-wrap gap-2">
            {!leaders.length ? (
              <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted">
                Nenhum líder definido
              </span>
            ) : (
              leaders.map((l) => {
                const id = leaderMemberId(l);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-2 py-1 text-xs"
                  >
                    {l.pushname ? `${l.pushname} · ` : ''}
                    <code>{id}</code>
                    <button
                      type="button"
                      className="ml-0.5 text-muted hover:text-danger"
                      aria-label="Remover líder"
                      onClick={() => void removeLeader(id)}
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )}
          </div>
        </section>

        <section className="mb-5 rounded-[var(--radius-sm)] border border-border-soft bg-surface-2/50 p-3">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Adicionar manualmente
          </h3>
          <p className="mb-2 text-[11px] text-muted">
            Cole o <strong className="text-ink-dim">wa_id</strong> exato (ex.{' '}
            <code>59619045069032@lid</code>) — o mesmo que aparece nas mensagens.
          </p>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="ex.: 59619045069032@lid"
              onKeyDown={(e) => e.key === 'Enter' && void onManualAdd()}
            />
            <Button variant="primary" size="sm" onClick={() => void onManualAdd()}>
              adicionar
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome, telefone ou código…"
              type="search"
            />
            <span className="shrink-0 text-[11px] text-muted">
              {filtered.length}/{participants.length}
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-muted">Carregando participantes…</p>
          ) : !filtered.length ? (
            <EmptyState
              icon="👥"
              title={
                participants.length === 0
                  ? 'Nenhum participante'
                  : 'Nenhum resultado'
              }
              description={
                participants.length === 0
                  ? 'Clique em sincronizar para buscar a lista do WhatsApp.'
                  : undefined
              }
            />
          ) : (
            <ul className="max-h-[320px] space-y-1 overflow-y-auto">
              {filtered.map((p) => {
                const name = p.display_name || p.pushname || p.phone || 'Participante';
                const memberId = participantMemberId(p);
                const isLid = memberId.endsWith('@lid');
                return (
                  <li
                    key={memberId || p.phone}
                    className={`flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-2 ${
                      p.is_leader
                        ? 'border-accent/25 bg-accent-soft/30'
                        : 'border-border-soft bg-surface-2/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {name}
                        {p.is_admin ? (
                          <Badge tone="info" className="ml-1">
                            admin
                          </Badge>
                        ) : null}
                      </p>
                      <code className="block text-[11px] text-accent">
                        id: {memberId || '—'}
                      </code>
                      {p.phone && !isLid ? (
                        <code className="block text-[10px] text-muted">
                          tel: {p.phone}
                        </code>
                      ) : null}
                    </div>
                    {p.is_leader ? (
                      <Button
                        variant="warn"
                        size="sm"
                        onClick={() => memberId && void removeLeader(memberId)}
                        disabled={!memberId}
                      >
                        ★ remover
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => memberId && void addLeader(memberId, name)}
                        disabled={!memberId}
                      >
                        ☆ tornar líder
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Modal>

      <ConfirmDialog
        open={!!confirmShort}
        title="Confirmar identificador curto"
        message={`"${confirmShort}" tem poucos dígitos. Adicionar mesmo assim?`}
        okLabel="Adicionar"
        onClose={() => setConfirmShort(null)}
        onConfirm={() => {
          if (confirmShort) void addLeader(normalizeManualMemberId(confirmShort), null);
          setManual('');
        }}
      />
    </>
  );
}
