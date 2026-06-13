import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { fmtMs, fmtPct } from '@/lib/format';
import { useBot } from '@/context/BotContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConnectionHero } from '@/components/ConnectionHero';
import { ActivityFeed } from '@/components/ActivityFeed';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState } from 'react';

export function DashboardPage() {
  const { stats, activity } = useBot();
  const { toast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const s = stats ?? {
    received: 0,
    answered: 0,
    cacheHits: 0,
    aiCalls: 0,
    fallbacks: 0,
    avgLatencyMs: 0,
    lastLatencyMs: 0,
    ignoredByPause: 0,
    ignoredByCooldown: 0,
    ignoredByFilter: 0,
  };

  const recv = s.received;
  const answered = s.answered;
  const cacheRate = answered
    ? `${Math.round((s.cacheHits / answered) * 100)}% das respostas`
    : 'sem dados ainda';

  return (
    <>
      <PageHeader
        title="Painel"
        description="Visão geral em tempo real do bot."
        actions={
          <Button
            variant="ghost"
            size="md"
            block
            className="sm:inline-flex sm:w-auto sm:min-h-8"
            onClick={() => setConfirmReset(true)}
          >
            ↺ resetar métricas
          </Button>
        }
      />

      {/* Bento: bloco de conexão domina, "Respondidas" é o número-herói,
          KPIs secundários uniformes e as ignoradas agrupadas. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="col-span-2 lg:col-span-4">
          <ConnectionHero />
        </div>
        <KpiCard
          className="col-span-2 lg:col-span-2"
          size="hero"
          label="Respondidas"
          value={answered}
          foot={recv ? `${fmtPct(answered, recv)} das recebidas` : 'aguardando dados'}
          accent="accent"
          delay={0.04}
        />

        <KpiCard
          className="col-span-1 lg:col-span-2"
          label="Recebidas"
          value={recv}
          foot="desde o boot"
          delay={0.06}
        />
        <KpiCard
          className="col-span-1 lg:col-span-2"
          label="Cache hits"
          value={s.cacheHits}
          foot={cacheRate}
          accent="info"
          delay={0.08}
        />
        <KpiCard
          className="col-span-1 lg:col-span-2"
          label="IA chamadas"
          value={s.aiCalls}
          foot="ao provedor"
          accent="violet"
          delay={0.1}
        />

        <KpiCard
          className="col-span-1 lg:col-span-2"
          label="Fallbacks"
          value={s.fallbacks}
          foot="respostas padrão"
          accent="danger"
          delay={0.12}
        />
        <KpiCard
          className="col-span-2 lg:col-span-2"
          label="Latência média"
          value={fmtMs(s.avgLatencyMs)}
          foot={`${fmtMs(s.lastLatencyMs)} última`}
          delay={0.14}
        />
        <div className="col-span-2 flex flex-col justify-center gap-2 rounded-[var(--radius-md)] border border-border-soft bg-surface-1/70 p-4 lg:col-span-2">
          <span className="text-xs font-medium text-muted">Ignoradas</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Pausa', s.ignoredByPause],
              ['Cooldown', s.ignoredByCooldown],
              ['Filtros', s.ignoredByFilter],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <strong className="block text-lg tabular-nums text-ink-dim">{val}</strong>
                <span className="text-[11px] text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Link
        to="/mensagens"
        className="mt-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-border-soft bg-surface-1/70 p-4 transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-ink">Conversas do WhatsApp</span>
          <span className="mt-0.5 block text-sm text-muted">
            Chats, histórico e envio sem sair do painel
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium text-accent">Abrir →</span>
      </Link>

      <Card className="mt-3">
        <CardHeader
          title="Atividade recente"
          description="Últimas mensagens vistas pelo bot."
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-1 text-[11px] text-accent">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                ao vivo
              </span>
              <Link to="/atividade" className="w-full sm:w-auto">
                <Button variant="ghost" size="md" block className="sm:inline-flex sm:w-auto sm:min-h-8">
                  ver tudo →
                </Button>
              </Link>
            </div>
          }
        />
        <ActivityFeed items={activity} compact />
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Resetar métricas"
        message="Zera todos os contadores da sessão atual. Confirma?"
        okLabel="Resetar"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          void api('/api/stats/reset', { method: 'POST' })
            .then(() => toast('Métricas resetadas'))
            .catch((e) => toast(e instanceof Error ? e.message : 'Erro', 'err'));
        }}
      />
    </>
  );
}
