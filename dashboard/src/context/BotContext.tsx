import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { AUTH_TOKEN } from '@/lib/token';
import type {
  ActivityItem,
  BotState,
  BotStats,
  GroupSummary,
  HelloPayload,
  HistoryItem,
  LogEntry,
} from '@/types';
import { useToast } from '@/components/ui/Toast';

interface BotContextValue {
  connected: boolean;
  state: BotState | null;
  stats: BotStats | null;
  history: HistoryItem[];
  activity: ActivityItem[];
  logs: LogEntry[];
  groups: GroupSummary[];
  groupsLoading: boolean;
  groupsLoaded: boolean;
  loadGroups: (opts?: { refresh?: boolean }) => Promise<void>;
  leadersVersion: number;
  setLogsLocal: (logs: LogEntry[]) => void;
  togglePause: () => Promise<void>;
}

const BotContext = createContext<BotContextValue | null>(null);

const defaultStats: BotStats = {
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

export function BotProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<BotState | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [leadersVersion, setLeadersVersion] = useState(0);
  const groupsPromise = useRef<Promise<void> | null>(null);

  const loadGroups = useCallback(async ({ refresh = false } = {}) => {
    if (groupsPromise.current) return groupsPromise.current;

    setGroupsLoading(true);
    groupsPromise.current = (async () => {
      try {
        const url = refresh ? '/api/groups?refresh=1' : '/api/groups';
        const data = await api<{ groups: GroupSummary[] }>(url);
        setGroups(data.groups ?? []);
        setGroupsLoaded(true);
        if (refresh) toast('Grupos sincronizados');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar grupos';
        if (!groups.length) toast(msg, 'err');
        else toast(`Erro ao recarregar: ${msg}`, 'err');
      } finally {
        setGroupsLoading(false);
        groupsPromise.current = null;
      }
    })();

    return groupsPromise.current;
  }, [groups.length, toast]);

  const togglePause = useCallback(async () => {
    const r = await api<{ paused: boolean }>('/api/pause', {
      method: 'POST',
      body: JSON.stringify({ paused: !state?.paused }),
    });
    toast(r.paused ? 'Bot pausado' : 'Bot retomado');
  }, [state?.paused, toast]);

  useEffect(() => {
    const socket: Socket = io({
      auth: { token: AUTH_TOKEN },
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => toast(`socket: ${err.message}`, 'err'));

    socket.on('hello', (data: HelloPayload) => {
      setState(data.state);
      setStats(data.stats ?? defaultStats);
      setHistory(data.history ?? []);
      setActivity(data.activity ?? []);
      setLogs(data.logs ?? []);
      void loadGroups();
    });

    socket.on('state', (s: BotState) => setState(s));
    socket.on('stats', (s: BotStats) => setStats(s));
    socket.on('history:add', (item: HistoryItem) => {
      setHistory((prev) => [item, ...prev].slice(0, 200));
    });
    socket.on('history:clear', () => setHistory([]));
    socket.on('activity:add', (item: ActivityItem) => {
      setActivity((prev) => [item, ...prev].slice(0, 120));
    });
    socket.on('activity:clear', () => setActivity([]));
    socket.on('log', (entry: LogEntry) => {
      setLogs((prev) => {
        const next = [...prev, entry];
        if (next.length > 500) next.shift();
        return next;
      });
    });
    socket.on('leaders:change', () => {
      setLeadersVersion((v) => v + 1);
      void loadGroups();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadGroups, toast]);

  const value = useMemo(
    () => ({
      connected,
      state,
      stats,
      history,
      activity,
      logs,
      groups,
      groupsLoading,
      groupsLoaded,
      loadGroups,
      leadersVersion,
      setLogsLocal: setLogs,
      togglePause,
    }),
    [
      connected,
      state,
      stats,
      history,
      activity,
      logs,
      groups,
      groupsLoading,
      groupsLoaded,
      loadGroups,
      leadersVersion,
      togglePause,
    ],
  );

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
}

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error('useBot must be used within BotProvider');
  return ctx;
}
