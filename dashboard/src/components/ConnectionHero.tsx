import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBot } from '@/context/BotContext';

const fade = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

export function ConnectionHero() {
  const { state } = useBot();
  const status = state?.status ?? 'initializing';

  return (
    <Card className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center" hoverLift>
      <div className="flex min-h-[96px] items-center gap-4">
        <AnimatePresence mode="wait">
          {status === 'qr' && state?.qrDataUrl ? (
            <motion.div key="qr" {...fade} className="flex items-center gap-4">
              <motion.img
                src={state.qrDataUrl}
                alt="QR Code para conectar o WhatsApp"
                className="size-28 rounded-[var(--radius-sm)] border border-border bg-white p-1.5 shadow-lg"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div>
                <p className="font-semibold text-ink">Escaneie para conectar</p>
                <p className="mt-1 text-xs text-muted">
                  WhatsApp → <strong className="text-ink-dim">Aparelhos conectados</strong> →
                  Conectar um aparelho.
                </p>
              </div>
            </motion.div>
          ) : status === 'ready' && state?.me ? (
            <motion.div key="ready" {...fade} className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-2xl ring-2 ring-accent/20">
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
            </motion.div>
          ) : (
            <motion.div key="loading" {...fade} className="flex flex-1 items-center gap-4">
              <Skeleton className="size-14 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-ink">Inicializando…</p>
                <p className="text-xs text-muted">
                  {state?.lastError || 'Aguardando conexão com o WhatsApp Web.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-4 border-t border-border-soft pt-4 text-sm lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
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
