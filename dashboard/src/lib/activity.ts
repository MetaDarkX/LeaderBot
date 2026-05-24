export const ACTION_LABELS: Record<string, string> = {
  answered: 'RESPONDIDA',
  'ignored:from-me': 'EU MESMO',
  'ignored:not-group': 'DM',
  'ignored:not-allowed-group': 'GRUPO ✗',
  'ignored:not-leader': 'NÃO-LÍDER',
  'ignored:paused': 'PAUSADO',
  'ignored:filter': 'FILTRO',
  'ignored:classify': 'CLASSIFICAÇÃO',
  'ignored:cooldown': 'COOLDOWN',
  'ignored:no-text': 'SEM TEXTO',
  error: 'ERRO',
};

export type ActivityFilter = 'all' | 'answered' | 'leader' | 'ignored';

export function matchesActivityFilter(
  action: string,
  isLeader: boolean | undefined,
  filter: ActivityFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'answered') return action === 'answered';
  if (filter === 'leader') return !!isLeader;
  if (filter === 'ignored') return action.startsWith('ignored:');
  return true;
}
