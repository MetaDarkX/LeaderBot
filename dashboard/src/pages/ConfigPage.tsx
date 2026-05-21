import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtMs } from '@/lib/format';
import { useBot } from '@/context/BotContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function ConfigPage() {
  const { state } = useBot();
  const { toast } = useToast();
  const [groups, setGroups] = useState('');
  const [cooldown, setCooldown] = useState('1500');
  const [maxLen, setMaxLen] = useState('500');
  const [fallback, setFallback] = useState('');
  const [testQ, setTestQ] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [confirmCache, setConfirmCache] = useState(false);
  const [dirty, setDirty] = useState(false);

  const syncFromState = useCallback(() => {
    const c = state?.runtimeConfig;
    if (!c) return;
    setGroups((c.allowedGroups || []).join('\n'));
    setCooldown(String(c.cooldownMs ?? 1500));
    setMaxLen(String(c.maxQuestionLength ?? 500));
    setFallback(c.fallbackAnswer ?? '');
    setDirty(false);
  }, [state?.runtimeConfig]);

  useEffect(() => {
    syncFromState();
  }, [syncFromState]);

  useEffect(() => {
    const pending = sessionStorage.getItem('wppbot-pending-groups');
    if (!pending) return;
    try {
      const ids = JSON.parse(pending) as string[];
      const current = groups.split('\n').map((s) => s.trim()).filter(Boolean);
      const merged = [...new Set([...current, ...ids])];
      setGroups(merged.join('\n'));
      setDirty(true);
      sessionStorage.removeItem('wppbot-pending-groups');
      toast('Grupos da allowlist mesclados — salve para aplicar');
    } catch {
      /* ignore */
    }
  }, [groups, toast]);

  const save = async () => {
    const allowedGroups = groups
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await api('/api/config', {
        method: 'POST',
        body: JSON.stringify({
          allowedGroups,
          cooldownMs: Number(cooldown) || 0,
          maxQuestionLength: Number(maxLen) || 500,
          fallbackAnswer: fallback,
        }),
      });
      toast('Configurações salvas');
      setDirty(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'err');
    }
  };

  const testAi = async () => {
    const q = testQ.trim();
    if (!q) return;
    setTesting(true);
    setTestResult('⏳ pensando...');
    try {
      const r = await api<{
        provider: string;
        fallback?: boolean;
        elapsedMs: number;
        answer: string;
      }>('/api/ai/test', { method: 'POST', body: JSON.stringify({ question: q }) });
      setTestResult(
        `via ${r.provider}${r.fallback ? ' (fallback!)' : ''} · ${fmtMs(r.elapsedMs)}\n\n${r.answer}`,
      );
    } catch (e) {
      setTestResult(`Erro: ${e instanceof Error ? e.message : 'falha'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Ajustes em runtime — sem precisar reiniciar o bot."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Comportamento"
            description="Persistem no banco; sobrevivem a reinício."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Grupos permitidos"
              hint="Vazio = responde em qualquer grupo com líder definido."
              className="sm:col-span-2"
            >
              <Textarea
                rows={3}
                value={groups}
                onChange={(e) => {
                  setGroups(e.target.value);
                  setDirty(true);
                }}
                placeholder="120363025XXXXXXXXX@g.us — um por linha"
              />
            </Field>
            <Field label="Cooldown (ms)" hint="Intervalo mínimo por líder.">
              <Input
                type="number"
                min={0}
                step={100}
                value={cooldown}
                onChange={(e) => {
                  setCooldown(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
            <Field label="Tamanho máx. da pergunta">
              <Input
                type="number"
                min={10}
                step={10}
                value={maxLen}
                onChange={(e) => {
                  setMaxLen(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
            <Field
              label="Resposta de fallback"
              hint="Usada quando a IA falha em todas as tentativas."
              className="sm:col-span-2"
            >
              <Input
                value={fallback}
                onChange={(e) => {
                  setFallback(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void save()}>
              Salvar configurações
            </Button>
            <Button variant="ghost" onClick={syncFromState}>
              Recarregar
            </Button>
            {dirty ? (
              <span className="self-center text-[11px] text-warn">alterações não salvas</span>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Testar IA"
            description="Envia uma pergunta direto ao provedor configurado."
          />
          <div className="flex gap-2">
            <Input
              value={testQ}
              onChange={(e) => setTestQ(e.target.value)}
              placeholder="Ex.: qual a capital do Brasil?"
              onKeyDown={(e) => e.key === 'Enter' && void testAi()}
            />
            <Button variant="primary" loading={testing} onClick={() => void testAi()}>
              Perguntar
            </Button>
          </div>
          {testResult ? (
            <pre className="mt-3 max-h-48 overflow-auto rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3 font-mono text-xs whitespace-pre-wrap text-ink-dim">
              {testResult}
            </pre>
          ) : null}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Manutenção"
            description="Reset de caches e contadores em tempo real."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: 'Limpar cache de respostas',
                desc: 'Próximas perguntas iguais voltam a chamar a IA.',
                action: () => setConfirmCache(true),
                label: 'limpar cache',
              },
              {
                title: 'Resetar cooldown',
                desc: 'Zera o cooldown por líder para testes em sequência.',
                action: () =>
                  void api('/api/cooldown/reset', { method: 'POST' })
                    .then(() => toast('Cooldown resetado'))
                    .catch((e) => toast(e instanceof Error ? e.message : 'Erro', 'err')),
                label: 'resetar cooldown',
              },
              {
                title: 'Limpar atividade',
                desc: 'Apaga o feed em memória. Histórico no banco permanece.',
                action: () =>
                  void api('/api/activity/clear', { method: 'POST' })
                    .then(() => toast('Feed limpo'))
                    .catch((e) => toast(e instanceof Error ? e.message : 'Erro', 'err')),
                label: 'limpar feed',
              },
            ].map((m) => (
              <div
                key={m.title}
                className="rounded-[var(--radius-sm)] border border-border-soft bg-surface-2/40 p-4"
              >
                <strong className="text-sm text-ink">{m.title}</strong>
                <p className="mt-1 text-xs text-muted">{m.desc}</p>
                <Button variant="ghost" size="sm" className="mt-3" onClick={m.action}>
                  {m.label}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmCache}
        title="Limpar cache de respostas"
        message="As próximas perguntas iguais vão chamar a IA de novo. Confirma?"
        okLabel="Limpar"
        onClose={() => setConfirmCache(false)}
        onConfirm={() => {
          void api('/api/cache/clear', { method: 'POST' })
            .then(() => toast('Cache limpo'))
            .catch((e) => toast(e instanceof Error ? e.message : 'Erro', 'err'));
        }}
      />
    </>
  );
}
