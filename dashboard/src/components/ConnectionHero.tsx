import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBot } from '@/context/BotContext';

export function ConnectionHero() {
  const { state } = useBot();
  const status = state?.status ?? 'initializing';

  return (
    <Card className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-h-[88px] items-center gap-4">
        {status === 'qr' && state?.qrDataUrl ? (
          <>
            <img
              src={state.qrDataUrl}
              alt="QR Code para conectar o WhatsApp"
              className="size-28 rounded-[var(--radius-sm)] border border-border bg-white p-1"
            />
            <div>
              <p className="font-semibold text-ink">Escaneie para conectar</p>
              <p className="mt-1 text-xs text-muted">
                WhatsApp → <strong className="text-ink-dim">Aparelhos conectados</strong> →
                Conectar um aparelho.
              </p>
            </div>
          </>
        ) : status === 'ready' && state?.me ? (
          <>
            <div className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-2xl">
              🤖
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Conectado como</p>
              <p className="text-base font-semibold text-ink">
                {state.me.pushname || '—'}
              </p>
              <code className="text-xs text-muted">
                {state.me.number ? `+${state.me.number}` : '—'}
              </code>
            </div>
          </>
        ) : (
          <>
            <Skeleton className="size-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-ink">Inicializando…</p>
              <p className="text-xs text-muted">
                {state?.lastError || 'Aguardando conexão com o WhatsApp Web.'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 border-t border-border-soft pt-4 text-sm lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Provedor de IA
          </p>
          <p className="mt-0.5 font-semibold text-ink">
            {(
              state?.runtimeConfig?.aiProvider ||
              state?.aiProvider ||
              '—'
            ).toString().toUpperCase()}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Banco de dados
          </p>
          <p className="mt-0.5 font-mono text-xs text-ink-dim">
            {state?.databaseUrl || 'postgres'}
          </p>
        </div>
      </div>
    </Card>
  );
}
