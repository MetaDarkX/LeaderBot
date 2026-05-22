import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useBot } from '@/context/BotContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { LeadersModal } from '@/components/LeadersModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import type { GroupSummary } from '@/types';
import { useToast } from '@/components/ui/Toast';

export function GroupsPage() {
  const { groups, groupsLoading, groupsLoaded, loadGroups } = useBot();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GroupSummary | null>(null);

  useEffect(() => {
    if (!groupsLoaded) void loadGroups();
  }, [groupsLoaded, loadGroups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        (g.name || '').toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q),
    );
  }, [groups, search]);

  const hasLeaders = groups.some((g) => g.leaderCount > 0);

  const addToAllowlist = (id: string) => {
    toast('Adicionado em grupos permitidos. Salve em Configurações.');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('wppbot-pending-groups', JSON.stringify(
        [...(JSON.parse(sessionStorage.getItem('wppbot-pending-groups') || '[]') as string[]), id].filter(
          (v, i, a) => a.indexOf(v) === i,
        ),
      ));
    }
  };

  return (
    <>
      <PageHeader
        title="Grupos & Líderes"
        description="Defina os líderes para que o bot responda às perguntas deles."
        actions={
          <>
            <Input
              type="search"
              placeholder="Buscar grupo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="secondary"
              size="md"
              loading={groupsLoading}
              onClick={() => void loadGroups({ refresh: true })}
            >
              ↻ atualizar
            </Button>
          </>
        }
      />

      {!hasLeaders && groups.length > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-info/20 bg-info-soft px-3 py-2 text-sm">
          <span aria-hidden>💡</span>
          <span className="text-ink-dim">
            Nenhum grupo tem líderes definidos. Clique em{' '}
            <strong className="text-ink">Gerenciar líderes</strong> para começar.
          </span>
        </div>
      ) : null}

      {groupsLoading && !groups.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !groups.length ? (
        <EmptyState
          icon="📭"
          title="Nenhum grupo encontrado"
          description="O bot precisa estar conectado e ter participado de algum grupo."
          action={
            <Button size="sm" onClick={() => void loadGroups({ refresh: true })}>
              Atualizar lista
            </Button>
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          icon="🔍"
          title={`Nenhum grupo combina com "${search}"`}
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.04 } },
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((g) => (
            <motion.article
              key={g.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border-soft bg-surface-1/70 p-4 hover-lift hover:border-border-strong"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-ink" title={g.name}>
                  {g.name || '(sem nome)'}
                </h3>
                <code className="mt-1 block truncate text-[11px] text-muted">{g.id}</code>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{g.participants} membros</span>
                {g.allowed ? <Badge tone="accent">ativo</Badge> : null}
                {g.leaderCount > 0 ? (
                  <Badge tone="warn">
                    ★ {g.leaderCount} líder{g.leaderCount > 1 ? 'es' : ''}
                  </Badge>
                ) : (
                  <Badge>sem líder</Badge>
                )}
              </div>
              <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  variant="primary"
                  size="md"
                  block
                  className="sm:inline-flex sm:w-auto sm:min-h-8"
                  onClick={() => setSelected(g)}
                >
                  ★ gerenciar líderes
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  block
                  className="sm:inline-flex sm:w-auto sm:min-h-8"
                  onClick={() => addToAllowlist(g.id)}
                >
                  {g.allowed ? '✓ permitido' : '+ permitir'}
                </Button>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}

      <LeadersModal group={selected} onClose={() => setSelected(null)} />
    </>
  );
}
