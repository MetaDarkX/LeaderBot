import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBot } from '@/context/BotContext';

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

export function ConnectionHero() {
  const { state } = useBot();
  const status = state?.status ?? 'initializing';

  return (
    <Card className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-6" hoverLift>
      <div className="flex min-h-[88px] items-center max-lg:justify-center">
        <AnimatePresence mode="wait">
          {status === 'qr' && state?.qrDataUrl ? (
            <motion.div
              key="qr"
              {...fade}
              className="flex w-full flex-col items-center gap-4 text-center sm:flex-row sm:text-left"
            >
              <motion.img
                src={state.qrDataUrl}
                alt="QR Code para conectar o WhatsApp"
                className="size-36 shrink-0 rounded-[var(--radius-md)] border border-border bg-white p-2 shadow-lg sm:size-28"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="max-w-xs">
                <p className="font-semibold text-ink">Escaneie para conectar</p>
                <p className="mt-1.5 text-sm text-muted">
                  WhatsApp → <strong className="text-ink-dim">Aparelhos conectados</strong> →
                  Conectar um aparelho.
                </p>
              </div>
            </motion.div>
          ) : status === 'ready' && state?.me ? (
            <motion.div
              key="ready"
              {...fade}
              className="flex w-full items-center gap-4 max-lg:justify-center"
            >
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-3xl ring-2 ring-accent/20 sm:size-14 sm:text-2xl">
                🤖
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[11px] uppercase tracking-wide text-muted">Conectado como</p>
                <p className="text-lg font-semibold text-ink sm:text-base">
                  {state.me.pushname || '—'}
                </p>
                <code className="text-sm text-muted sm:text-xs">
                  {state.me.number ? `+${state.me.number}` : '—'}
                </code>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              {...fade}
              className="flex w-full flex-1 items-center gap-4 max-lg:justify-center"
            >
              <Skeleton className="size-16 shrink-0 rounded-full sm:size-14" />
              <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                <p className="font-semibold text-ink">Inicializando…</p>
                <p className="text-sm text-muted sm:text-xs">
                  {state?.lastError || 'Aguardando conexão com o WhatsApp Web.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border-soft pt-4 text-sm sm:gap-4 lg:border-t-0 lg:border-l lg:grid-cols-1 lg:pt-0 lg:pl-6">
        <div className="rounded-[var(--radius-sm)] bg-surface-2/40 p-3 lg:bg-transparent lg:p-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">
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
        <div className="rounded-[var(--radius-sm)] bg-surface-2/40 p-3 lg:bg-transparent lg:p-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">
            Banco de dados
          </p>
          <p className="mt-0.5 break-all font-mono text-xs text-ink-dim">
            {state?.databaseUrl || 'postgres'}
          </p>
        </div>
      </div>
    </Card>
  );
}
