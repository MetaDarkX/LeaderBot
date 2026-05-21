import { useState } from 'react';
import { api } from '@/lib/api';
import { useBot } from '@/context/BotContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { ActivityFeed } from '@/components/ActivityFeed';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import type { ActivityFilter } from '@/lib/activity';
import { useToast } from '@/components/ui/Toast';

export function ActivityPage() {
  const { activity } = useBot();
  const { toast } = useToast();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  return (
    <>
      <PageHeader
        title="Atividade ao vivo"
        description="Todas as mensagens que passam pelos filtros do bot."
        actions={
          <>
            <Segmented
              value={filter}
              onChange={setFilter}
              aria-label="Filtrar atividade"
              options={[
                { value: 'all', label: 'todas' },
                { value: 'answered', label: 'respondidas' },
                { value: 'leader', label: 'líder' },
                { value: 'ignored', label: 'ignoradas' },
              ]}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void api('/api/activity/clear', { method: 'POST' })
                  .then(() => toast('Feed limpo'))
                  .catch((e) => toast(e instanceof Error ? e.message : 'Erro', 'err'));
              }}
            >
              limpar
            </Button>
          </>
        }
      />
      <ActivityFeed items={activity} filter={filter} className="max-h-[calc(100dvh-220px)] overflow-y-auto" />
    </>
  );
}
