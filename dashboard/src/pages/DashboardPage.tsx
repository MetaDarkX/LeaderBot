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
import { QuickNav } from '@/components/layout/QuickNav';
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
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            ↺ resetar métricas
          </Button>
        }
      />

      <ConnectionHero />

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Recebidas" value={recv} foot="total desde o boot" delay={0.02} />
        <KpiCard
          label="Respondidas"
          value={answered}
          foot={recv ? fmtPct(answered, recv) : 'aguardando dados'}
          accent="accent"
          delay={0.04}
        />
        <KpiCard label="Cache hits" value={s.cacheHits} foot={cacheRate} accent="info" delay={0.06} />
        <KpiCard
          label="IA chamadas"
          value={s.aiCalls}
          foot="requisições ao provedor"
          accent="violet"
          delay={0.08}
        />
        <KpiCard
          label="Fallbacks"
          value={s.fallbacks}
          foot="respostas padrão usadas"
          accent="danger"
          delay={0.1}
        />
        <KpiCard
          label="Latência média"
          value={fmtMs(s.avgLatencyMs)}
          foot={`${fmtMs(s.lastLatencyMs)} última`}
          delay={0.12}
        />
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3 rounded-[var(--radius-md)] border border-border-soft bg-surface-1/60 p-4 text-center sm:max-w-lg">
        {[
          ['Pausa', s.ignoredByPause],
          ['Cooldown', s.ignoredByCooldown],
          ['Filtradas', s.ignoredByFilter],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-[var(--radius-sm)] bg-surface-2/40 px-2 py-1">
            <span className="block text-[11px] text-muted">{label}</span>
            <strong className="text-lg tabular-nums text-ink">{val}</strong>
          </div>
        ))}
      </section>

      <QuickNav />

      <Card className="mt-6">
        <CardHeader
          title="Atividade recente"
          description="Últimas mensagens vistas pelo bot."
          action={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-accent">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                ao vivo
              </span>
              <Link to="/atividade">
                <Button variant="ghost" size="sm">
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
