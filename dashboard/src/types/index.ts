export type BotStatus =
  | 'initializing'
  | 'qr'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'error';

export interface RuntimeConfig {
  allowedGroups: string[];
  cooldownMs: number;
  maxQuestionLength: number;
  fallbackAnswer: string;
  aiProvider?: string;
}

export interface BotState {
  status: BotStatus;
  paused: boolean;
  qrDataUrl?: string;
  me?: { pushname?: string; number?: string };
  startedAt?: number;
  uptimeMs?: number;
  lastError?: string;
  runtimeConfig?: RuntimeConfig;
  aiProvider?: string;
  databaseUrl?: string;
}

export interface BotStats {
  received: number;
  answered: number;
  cacheHits: number;
  aiCalls: number;
  fallbacks: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  ignoredByPause: number;
  ignoredByCooldown: number;
  ignoredByFilter: number;
}

export interface HistoryItem {
  at: number;
  question: string;
  answer: string;
  source: string;
  groupName?: string;
  leaderId?: string;
  elapsedMs?: number;
}

export interface ActivityItem {
  at: number;
  action: string;
  groupName?: string;
  author?: string;
  body?: string;
  reason?: string;
  isLeader?: boolean;
}

export interface LogEntry {
  at: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  participants: number;
  allowed: boolean;
  leaderCount: number;
}

export interface Participant {
  phone: string;
  wa_id?: string;
  pushname?: string;
  display_name?: string;
  is_leader?: boolean;
  is_admin?: boolean;
}

export interface Leader {
  /** Identificador canônico (coluna `phone` no DB — ex.: 59619045069032@lid). */
  phone: string;
  member_id?: string;
  pushname?: string;
}

export interface HelloPayload {
  state: BotState;
  stats: BotStats;
  history: HistoryItem[];
  activity: ActivityItem[];
  logs: LogEntry[];
  cache?: unknown;
}

export interface ChatSummary {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;
  unreadCount: number;
  lastMessage?: {
    body: string;
    fromMe: boolean;
    timestamp: number;
  } | null;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  body: string;
  type: string;
  fromMe: boolean;
  author: string | null;
  timestamp: number;
  hasMedia: boolean;
}

export interface ChatMessageEvent {
  message: ChatMessage;
  chat: ChatSummary;
}

export type RouteId =
  | 'painel'
  | 'mensagens'
  | 'grupos'
  | 'atividade'
  | 'historico'
  | 'config'
  | 'logs';
