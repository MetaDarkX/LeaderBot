// ============================================================
//  app.js — frontend da dashboard wppbot
//  Vanilla JS modular, sem framework. Conecta no backend via
//  socket.io + REST e renderiza o estado completo do bot.
// ============================================================

// Token opcional via querystring: ?token=xxx
const TOKEN = new URLSearchParams(location.search).get('token') || '';
const authHeaders = () => (TOKEN ? { 'x-auth-token': TOKEN } : {});

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

// ─── Toast ────────────────────────────────────────────────
const toastHost = (() => {
  const el = document.createElement('div');
  el.className = 'toast-host';
  document.body.appendChild(el);
  return el;
})();
function toast(message, kind = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = message;
  toastHost.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .25s';
    setTimeout(() => t.remove(), 250);
  }, 2800);
}

// ─── Confirm modal helper ────────────────────────────────
function confirmAction({ title = 'Confirmar', message = 'Tem certeza?', okLabel = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = okLabel;
    okBtn.classList.toggle('btn-danger', !!danger);
    okBtn.classList.toggle('btn-warn', !danger);
    modal.classList.remove('hidden');

    const cleanup = () => {
      modal.classList.add('hidden');
      modal.removeEventListener('click', onBackdrop);
      okBtn.removeEventListener('click', onOk);
      document.removeEventListener('keydown', onKey);
    };
    const onBackdrop = (e) => { if (e.target.matches('[data-close-confirm]')) { cleanup(); resolve(false); } };
    const onOk = () => { cleanup(); resolve(true); };
    const onKey = (e) => { if (e.key === 'Escape') { cleanup(); resolve(false); } };
    modal.addEventListener('click', onBackdrop);
    okBtn.addEventListener('click', onOk);
    document.addEventListener('keydown', onKey);
  });
}

// ─── Elementos ────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const elements = {
  // sidebar/status
  sidebar: $('sidebar'),
  sidebarBackdrop: $('sidebarBackdrop'),
  navToggleBtn: $('navToggleBtn'),
  navItems: $$('.nav-item'),
  routes: $$('.route'),
  statusDot: $('statusDot'),
  statusDotMobile: $('statusDotMobile'),
  statusText: $('statusText'),
  uptime: $('uptime'),
  pauseBtn: $('pauseBtn'),
  navBadgeGroups: $('navBadgeGroups'),

  // banners
  globalBanner: $('globalBanner'),
  globalBannerText: $('globalBannerText'),
  leadersTip: $('leadersTip'),

  // hero
  qrBox: $('qrBox'),
  qrImg: $('qrImg'),
  meBox: $('meBox'),
  meName: $('meName'),
  meNumber: $('meNumber'),
  loadingBox: $('loadingBox'),
  loadingMsg: $('loadingMsg'),
  aiProvider: $('aiProvider'),
  dbInfo: $('dbInfo'),

  // stats
  stReceived: $('stReceived'),
  stAnswered: $('stAnswered'),
  stAnsweredRate: $('stAnsweredRate'),
  stCache: $('stCache'),
  stCacheRate: $('stCacheRate'),
  stAi: $('stAi'),
  stFallback: $('stFallback'),
  stAvg: $('stAvg'),
  stLast: $('stLast'),
  stPause: $('stPause'),
  stCool: $('stCool'),
  stFilter: $('stFilter'),

  // config
  groupsInput: $('groupsInput'),
  cooldownInput: $('cooldownInput'),
  maxLenInput: $('maxLenInput'),
  fallbackInput: $('fallbackInput'),

  // grupos
  groupList: $('groupList'),
  groupsSearch: $('groupsSearch'),

  // teste IA
  testInput: $('testInput'),
  testResult: $('testResult'),

  // modal de líderes
  leadersModal: $('leadersModal'),
  leadersGroupName: $('leadersGroupName'),
  leadersGroupId: $('leadersGroupId'),
  leadersSearch: $('leadersSearch'),
  leadersCount: $('leadersCount'),
  participantsList: $('participantsList'),
  currentLeadersList: $('currentLeadersList'),
  leadersSyncBtn: $('leadersSyncBtn'),
  manualLeaderInput: $('manualLeaderInput'),
  manualLeaderAddBtn: $('manualLeaderAddBtn'),

  // histórico
  historyList: $('historyList'),
  historyCount: $('historyCount'),
  historySearch: $('historySearch'),

  // atividade
  activityList: $('activityList'),
  activityListMini: $('activityListMini'),
  activityFilter: $('activityFilter'),
  autoScrollActivity: $('autoScrollActivity'),

  // logs
  logBox: $('logBox'),
  logLevelFilter: $('logLevelFilter'),
};

// ─── Estado local ─────────────────────────────────────────
let LOGS = [];
let HISTORY = [];
let ACTIVITY = [];
let STATE = null;
let GROUPS = [];
let groupsSearch = '';
let groupsLoaded = false;
let groupsLoadingPromise = null;
let historySearchTerm = '';
let activityFilterValue = 'all';
let logLevelFilter = 'all';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Modal de líderes
const leadersModalState = {
  groupId: null,
  groupName: '',
  participants: [],
  leaders: [],
  search: '',
};

// ─── Helpers ──────────────────────────────────────────────
function fmtMs(ms) {
  if (!ms) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `uptime ${h}h ${m}m`;
  if (m) return `uptime ${m}m ${sec}s`;
  return `uptime ${sec}s`;
}
function fmtPct(n, total) {
  if (!total) return '—';
  return `${Math.round((n / total) * 100)}% das recebidas`;
}
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ─── Router ──────────────────────────────────────────────
function getRouteFromHash() {
  const valid = ['painel', 'grupos', 'atividade', 'historico', 'config', 'logs'];
  const raw = (location.hash || '').replace(/^#/, '').toLowerCase();
  return valid.includes(raw) ? raw : 'painel';
}
function applyRoute(route) {
  document.body.setAttribute('data-route', route);
  elements.routes.forEach((sec) => {
    sec.classList.toggle('hidden', sec.dataset.section !== route);
  });
  elements.navItems.forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  // fecha sidebar no mobile
  elements.sidebar.classList.remove('open');
  elements.sidebarBackdrop.classList.remove('show');

  // só dispara load na primeira visita à rota (depois disso, atualizações
  // chegam via socket `leaders:change` ou pelo botão de refresh)
  if (route === 'grupos' && !groupsLoaded) loadGroups();
}
window.addEventListener('hashchange', () => applyRoute(getRouteFromHash()));

// ─── Sidebar toggle mobile ───────────────────────────────
elements.navToggleBtn?.addEventListener('click', () => {
  elements.sidebar.classList.add('open');
  elements.sidebarBackdrop.classList.add('show');
});
elements.sidebarBackdrop?.addEventListener('click', () => {
  elements.sidebar.classList.remove('open');
  elements.sidebarBackdrop.classList.remove('show');
});

// ─── Render: status ───────────────────────────────────────
function renderState(state) {
  STATE = state;
  const map = {
    initializing: { cls: '',    text: 'inicializando…' },
    qr:           { cls: 'qr',  text: 'aguardando QR' },
    authenticated:{ cls: 'qr',  text: 'autenticando…' },
    ready:        { cls: 'ok',  text: 'conectado' },
    disconnected: { cls: 'warn',text: 'desconectado' },
    error:        { cls: 'err', text: 'erro' },
  };
  const m = map[state.status] || { cls: '', text: state.status || '?' };
  const label = state.paused ? `${m.text} · pausado` : m.text;
  elements.statusDot.className = `dot ${m.cls}`;
  elements.statusDotMobile.className = `dot ${m.cls}`;
  elements.statusText.textContent = label;
  elements.uptime.textContent = fmtUptime(state.uptimeMs || 0);
  elements.pauseBtn.classList.toggle('btn-primary', state.paused);
  elements.pauseBtn.classList.toggle('btn-warn', !state.paused);
  elements.pauseBtn.querySelector('span').textContent = state.paused ? 'Retomar bot' : 'Pausar bot';

  // Hero
  if (state.status === 'qr' && state.qrDataUrl) {
    elements.qrBox.classList.remove('hidden');
    elements.qrImg.src = state.qrDataUrl;
    elements.meBox.classList.add('hidden');
    elements.loadingBox.classList.add('hidden');
  } else if (state.status === 'ready' && state.me) {
    elements.qrBox.classList.add('hidden');
    elements.meBox.classList.remove('hidden');
    elements.loadingBox.classList.add('hidden');
    elements.meName.textContent = state.me.pushname || '—';
    elements.meNumber.textContent = state.me.number ? `+${state.me.number}` : '—';
  } else {
    elements.qrBox.classList.add('hidden');
    elements.meBox.classList.add('hidden');
    elements.loadingBox.classList.remove('hidden');
    elements.loadingMsg.textContent = state.lastError || 'Aguardando conexão com o WhatsApp Web.';
  }

  // banner global
  if (state.status === 'error' || (state.status === 'disconnected' && state.lastError)) {
    elements.globalBanner.classList.remove('hidden');
    elements.globalBannerText.textContent =
      state.lastError ? `Bot com problema: ${state.lastError}` : 'Bot desconectado.';
  } else {
    elements.globalBanner.classList.add('hidden');
  }

  // Provedor de IA / DB info (campos opcionais — vêm do snapshot do state)
  if (state.runtimeConfig?.aiProvider) {
    elements.aiProvider.textContent = state.runtimeConfig.aiProvider.toUpperCase();
  } else if (state.aiProvider) {
    elements.aiProvider.textContent = String(state.aiProvider).toUpperCase();
  } else if (elements.aiProvider.textContent === '—') {
    elements.aiProvider.textContent = '—';
  }
  if (state.databaseUrl && elements.dbInfo) {
    elements.dbInfo.textContent = state.databaseUrl;
  }

  // Runtime config -> form (apenas se o usuário não estiver editando)
  const focused = document.activeElement;
  const editing = focused && (focused.tagName === 'TEXTAREA' || focused.tagName === 'INPUT');
  if (state.runtimeConfig && !editing) {
    const c = state.runtimeConfig;
    elements.groupsInput.value = (c.allowedGroups || []).join('\n');
    elements.cooldownInput.value = c.cooldownMs ?? 1500;
    elements.maxLenInput.value = c.maxQuestionLength ?? 500;
    elements.fallbackInput.value = c.fallbackAnswer ?? '';
  }
}

// ─── Render: stats ────────────────────────────────────────
function renderStats(s) {
  const recv = s.received ?? 0;
  elements.stReceived.textContent  = recv;
  elements.stAnswered.textContent  = s.answered ?? 0;
  elements.stAnsweredRate.textContent = recv ? fmtPct(s.answered ?? 0, recv) : 'aguardando dados';
  elements.stCache.textContent     = s.cacheHits ?? 0;
  elements.stCacheRate.textContent = (s.answered ?? 0)
    ? `${Math.round(((s.cacheHits ?? 0) / (s.answered || 1)) * 100)}% das respostas`
    : 'sem dados ainda';
  elements.stAi.textContent        = s.aiCalls ?? 0;
  elements.stFallback.textContent  = s.fallbacks ?? 0;
  elements.stAvg.textContent       = fmtMs(s.avgLatencyMs);
  elements.stLast.textContent      = fmtMs(s.lastLatencyMs);
  elements.stPause.textContent     = s.ignoredByPause ?? 0;
  elements.stCool.textContent      = s.ignoredByCooldown ?? 0;
  elements.stFilter.textContent    = s.ignoredByFilter ?? 0;
}

// ─── Render: histórico ────────────────────────────────────
function historyMatchesSearch(item, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  return (
    (item.question || '').toLowerCase().includes(t) ||
    (item.answer || '').toLowerCase().includes(t) ||
    (item.groupName || '').toLowerCase().includes(t) ||
    (item.leaderId || '').toLowerCase().includes(t)
  );
}
function renderHistory() {
  const list = HISTORY.filter((h) => historyMatchesSearch(h, historySearchTerm));
  elements.historyCount.textContent = `${list.length} de ${HISTORY.length} entradas`;
  if (!list.length) {
    elements.historyList.innerHTML = `<p class="empty">${HISTORY.length ? 'Nenhuma entrada combina com a busca.' : 'Sem entradas ainda — o histórico aparece assim que o bot responder.'}</p>`;
    return;
  }
  elements.historyList.innerHTML = list.map((h) => {
    const time = new Date(h.at).toLocaleTimeString('pt-BR', { hour12: false });
    const date = new Date(h.at).toLocaleDateString('pt-BR');
    const phone = (h.leaderId || '').split('@')[0];
    return `
      <div class="h-item">
        <div class="h-head">
          <span>${escapeHTML(date)} · ${escapeHTML(time)}</span>
          <span>·</span>
          <b>${escapeHTML(h.groupName || 'grupo')}</b>
          <span>·</span>
          <code>${escapeHTML(phone)}</code>
          <span>·</span>
          <span>${fmtMs(h.elapsedMs)}</span>
          <span class="tag ${escapeHTML(h.source)}">${escapeHTML(h.source)}</span>
        </div>
        <div class="h-q">${escapeHTML(h.question)}</div>
        <div class="h-a">${escapeHTML(h.answer)}</div>
      </div>`;
  }).join('');
}

// ─── Render: atividade ────────────────────────────────────
const ACTION_LABELS = {
  'answered':                  'RESPONDIDA',
  'ignored:from-me':           'EU MESMO',
  'ignored:not-group':         'DM',
  'ignored:not-allowed-group': 'GRUPO ✗',
  'ignored:not-leader':        'NÃO-LÍDER',
  'ignored:paused':            'PAUSADO',
  'ignored:filter':            'FILTRO',
  'ignored:cooldown':          'COOLDOWN',
  'ignored:no-text':           'SEM TEXTO',
  'error':                     'ERRO',
};
function activityMatchesFilter(item, filter) {
  if (filter === 'all') return true;
  if (filter === 'answered') return item.action === 'answered';
  if (filter === 'leader') return item.isLeader;
  if (filter === 'ignored') return (item.action || '').startsWith('ignored:');
  return true;
}
function renderActivityInto(container, list, { mini = false } = {}) {
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `<p class="empty">Aguardando mensagens…</p>`;
    return;
  }
  const arr = mini ? list.slice(0, 10) : list;
  const wasAtTop = container.scrollTop < 20;
  container.innerHTML = arr.map((item) => {
    const t = new Date(item.at).toLocaleTimeString('pt-BR', { hour12: false });
    const label = ACTION_LABELS[item.action] || item.action;
    const where = item.groupName
      ? `<span class="a-group">${escapeHTML(item.groupName)}</span>`
      : '<span class="a-group">DM</span>';
    const who = item.author ? `<span class="a-author"> · ${escapeHTML(item.author)}</span>` : '';
    const body = item.body ? ` <span class="a-body">"${escapeHTML(item.body)}"</span>` : '';
    const reason = item.reason ? ` <span class="a-reason">(${escapeHTML(item.reason)})</span>` : '';
    return `
      <div class="a-item" data-action="${escapeHTML(item.action)}">
        <span class="a-time">${t}</span>
        <span class="a-action">${escapeHTML(label)}</span>
        <span class="a-text">${where}${who}${body}${reason}</span>
        <span class="a-crown">${item.isLeader ? '👑' : ''}</span>
      </div>`;
  }).join('');
  if (!mini && elements.autoScrollActivity?.checked && wasAtTop) {
    container.scrollTop = 0;
  }
}
function renderActivity() {
  const list = ACTIVITY.filter((i) => activityMatchesFilter(i, activityFilterValue));
  renderActivityInto(elements.activityList, list);
  renderActivityInto(elements.activityListMini, ACTIVITY, { mini: true });
}

// ─── Render: logs ─────────────────────────────────────────
function renderLogs() {
  const min = logLevelFilter === 'all' ? 0 : (LEVELS[logLevelFilter] ?? 0);
  const filtered = LOGS.filter((l) => (LEVELS[l.level] ?? 0) >= min);
  elements.logBox.innerHTML = filtered.slice(-300).map((l) => {
    const t = new Date(l.at).toLocaleTimeString('pt-BR', { hour12: false });
    return `<span class="log-time">[${t}]</span> <span class="log-${l.level}">${l.level.toUpperCase().padEnd(5)}</span> ${escapeHTML(l.message)}`;
  }).join('\n');
  elements.logBox.scrollTop = elements.logBox.scrollHeight;
}

// ─── Render: grupos ──────────────────────────────────────
function groupMatchesSearch(g, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  return (g.name || '').toLowerCase().includes(t) || (g.id || '').toLowerCase().includes(t);
}
function renderGroups() {
  const list = GROUPS.filter((g) => groupMatchesSearch(g, groupsSearch));
  const hasLeaders = GROUPS.some((g) => g.leaderCount > 0);
  elements.leadersTip?.classList.toggle('hidden', hasLeaders || GROUPS.length === 0);

  if (elements.navBadgeGroups) {
    if (GROUPS.length) {
      elements.navBadgeGroups.hidden = false;
      elements.navBadgeGroups.textContent = GROUPS.length;
    } else {
      elements.navBadgeGroups.hidden = true;
    }
  }

  if (!GROUPS.length) {
    elements.groupList.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">📭</div>
        <strong>Nenhum grupo encontrado</strong>
        <p class="muted small">O bot precisa estar conectado e ter participado de algum grupo. Tente <b>atualizar</b>.</p>
      </div>`;
    return;
  }
  if (!list.length) {
    elements.groupList.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">🔍</div>
        <strong>Nenhum grupo combina com "${escapeHTML(groupsSearch)}"</strong>
      </div>`;
    return;
  }

  elements.groupList.innerHTML = list.map((g) => {
    const activeBadge = g.allowed ? '<span class="badge badge-active">ativo</span>' : '';
    const leaderBadge = g.leaderCount > 0
      ? `<span class="badge badge-leader">★ ${g.leaderCount} líder${g.leaderCount > 1 ? 'es' : ''}</span>`
      : '<span class="badge badge-empty">sem líder</span>';
    return `
      <article class="group-card">
        <div>
          <div class="gname" title="${escapeHTML(g.name)}">${escapeHTML(g.name || '(sem nome)')}</div>
          <code class="gid">${escapeHTML(g.id)}</code>
        </div>
        <div class="gmeta">
          <span>${g.participants} membros</span>
          ${activeBadge}
          ${leaderBadge}
        </div>
        <div class="gactions">
          <button class="btn btn-sm btn-primary" data-lead-id="${escapeHTML(g.id)}" data-lead-name="${escapeHTML(g.name)}">
            ★ gerenciar líderes
          </button>
          <button class="btn btn-sm" data-add="${escapeHTML(g.id)}">
            ${g.allowed ? '✓ permitido' : '+ permitir'}
          </button>
        </div>
      </article>`;
  }).join('');

  elements.groupList.querySelectorAll('[data-add]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-add');
      const current = (elements.groupsInput.value || '')
        .split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      if (!current.includes(id)) current.push(id);
      elements.groupsInput.value = current.join('\n');
      toast('Adicionado em "Grupos permitidos". Vá em Configurações → Salvar.');
    };
  });
  elements.groupList.querySelectorAll('[data-lead-id]').forEach((btn) => {
    btn.onclick = () => openLeadersModal(btn.getAttribute('data-lead-id'), btn.getAttribute('data-lead-name'));
  });
}

async function loadGroups({ refresh = false } = {}) {
  // Evita chamadas duplicadas concorrentes — comum quando trocamos de rota
  // ao mesmo tempo que chega um evento `leaders:change`.
  if (groupsLoadingPromise) return groupsLoadingPromise;

  if (!GROUPS.length && !refresh) {
    elements.groupList.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">⌛</div>
        <strong>Carregando grupos…</strong>
        <p class="muted small">Lendo do banco local.</p>
      </div>`;
  }
  const refreshBtn = $('refreshGroupsBtn');
  if (refresh && refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '↻ sincronizando…';
  }

  groupsLoadingPromise = (async () => {
    try {
      const url = refresh ? '/api/groups?refresh=1' : '/api/groups';
      const { groups } = await api(url);
      GROUPS = groups || [];
      groupsLoaded = true;
      renderGroups();
      if (refresh) toast('Grupos sincronizados', 'ok');
    } catch (err) {
      if (!GROUPS.length) {
        elements.groupList.innerHTML = `
          <div class="empty-state">
            <div class="empty-illustration">⚠️</div>
            <strong>Erro ao carregar grupos</strong>
            <p class="muted small">${escapeHTML(err.message)}</p>
          </div>`;
      } else {
        toast(`Erro ao recarregar: ${err.message}`, 'err');
      }
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '↻ atualizar';
      }
      groupsLoadingPromise = null;
    }
  })();

  return groupsLoadingPromise;
}

// ─── Modal: gerenciamento de líderes ─────────────────────
async function openLeadersModal(groupId, groupName) {
  leadersModalState.groupId = groupId;
  leadersModalState.groupName = groupName || groupId;
  leadersModalState.search = '';
  elements.leadersSearch.value = '';
  elements.manualLeaderInput.value = '';
  elements.leadersGroupName.textContent = leadersModalState.groupName;
  elements.leadersGroupId.textContent = groupId;
  elements.leadersModal.classList.remove('hidden');
  elements.participantsList.innerHTML = '<p class="empty">Carregando participantes…</p>';
  elements.currentLeadersList.innerHTML = '<span class="empty-chip">Carregando…</span>';
  await loadLeadersModal();
  setTimeout(() => elements.manualLeaderInput.focus(), 50);
}
function closeLeadersModal() {
  elements.leadersModal.classList.add('hidden');
  leadersModalState.groupId = null;
  leadersModalState.participants = [];
  leadersModalState.leaders = [];
}
async function loadLeadersModal({ refresh = false } = {}) {
  if (!leadersModalState.groupId) return;
  const qs = refresh ? '?refresh=1' : '';
  try {
    const data = await api(`/api/groups/${encodeURIComponent(leadersModalState.groupId)}/participants${qs}`);
    leadersModalState.participants = data.participants || [];
    leadersModalState.leaders = data.leaders || [];
    renderParticipants();
    renderCurrentLeaders();
    if (refresh) toast('Participantes sincronizados', 'ok');
  } catch (err) {
    elements.participantsList.innerHTML = `<p class="empty">Erro: ${escapeHTML(err.message)}</p>`;
  }
}

function renderCurrentLeaders() {
  const leaders = leadersModalState.leaders || [];
  if (!leaders.length) {
    elements.currentLeadersList.innerHTML = '<span class="empty-chip">Nenhum líder definido</span>';
    return;
  }
  elements.currentLeadersList.innerHTML = leaders.map((l) => {
    const label = l.pushname ? `${escapeHTML(l.pushname)}` : '';
    return `
      <span class="chip" title="${escapeHTML(l.phone)}">
        <span>${label ? `${label} · ` : ''}<code>${escapeHTML(l.phone)}</code></span>
        <button class="chip-remove" data-remove-leader="${escapeHTML(l.phone)}" aria-label="Remover">×</button>
      </span>`;
  }).join('');
  elements.currentLeadersList.querySelectorAll('[data-remove-leader]').forEach((btn) => {
    btn.onclick = () => removeLeader(btn.getAttribute('data-remove-leader'));
  });
}

function renderParticipants() {
  const q = (leadersModalState.search || '').trim().toLowerCase();
  const list = leadersModalState.participants.filter((p) => {
    if (!q) return true;
    const hay = `${p.phone} ${p.wa_id || ''} ${p.pushname || ''} ${p.display_name || ''}`.toLowerCase();
    return hay.includes(q);
  });

  const total = leadersModalState.participants.length;
  elements.leadersCount.textContent = `${list.length}/${total} participantes`;

  if (!list.length) {
    elements.participantsList.innerHTML = total === 0
      ? `<p class="empty">Nenhum participante registrado. Clique em <b>↻ sincronizar</b> para buscar do WhatsApp.</p>`
      : `<p class="empty">Nenhum participante combina com "${escapeHTML(q)}".</p>`;
    return;
  }

  elements.participantsList.innerHTML = list.map((p) => {
    const name = p.display_name || p.pushname || `+${p.phone}`;
    const isLid = (p.wa_id || '').endsWith('@lid');
    const idLabel = isLid ? 'código' : 'telefone';
    const subtitle = `${idLabel}: ${p.phone}`;
    const waLine = p.wa_id && p.wa_id !== `${p.phone}@c.us`
      ? `<code class="muted">wa_id: ${escapeHTML(p.wa_id)}</code>`
      : '';
    const cls = p.is_leader ? 'is-leader' : '';
    const btn = p.is_leader
      ? `<button class="btn btn-sm btn-warn" data-remove="${escapeHTML(p.phone)}">★ remover</button>`
      : `<button class="btn btn-sm btn-primary" data-add="${escapeHTML(p.phone)}" data-name="${escapeHTML(name)}">☆ tornar líder</button>`;
    return `
      <div class="participant ${cls}">
        <div class="p-meta">
          <div class="p-name">${escapeHTML(name)} ${p.is_admin ? '<span class="badge badge-admin">admin</span>' : ''}</div>
          <code class="muted small">${escapeHTML(subtitle)}</code>
          ${waLine}
        </div>
        ${btn}
      </div>`;
  }).join('');

  elements.participantsList.querySelectorAll('[data-add]').forEach((btn) => {
    btn.onclick = () => addLeader(btn.getAttribute('data-add'), btn.getAttribute('data-name'));
  });
  elements.participantsList.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.onclick = () => removeLeader(btn.getAttribute('data-remove'));
  });
}

async function addLeader(phone, name) {
  try {
    await api(`/api/groups/${encodeURIComponent(leadersModalState.groupId)}/leaders`, {
      method: 'POST',
      body: JSON.stringify({ phone, pushname: name }),
    });
    toast('Líder adicionado');
    await loadLeadersModal();
    loadGroups();
  } catch (e) { toast(e.message, 'err'); }
}
async function addLeaderManual() {
  const raw = (elements.manualLeaderInput.value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) { toast('Digite um número ou código', 'err'); return; }
  if (digits.length < 8) {
    const ok = await confirmAction({
      title: 'Confirmar identificador curto',
      message: `"${digits}" tem só ${digits.length} dígitos. Adicionar mesmo assim?`,
      okLabel: 'Adicionar',
    });
    if (!ok) return;
  }
  await addLeader(digits, null);
  elements.manualLeaderInput.value = '';
  elements.manualLeaderInput.focus();
}
async function removeLeader(phone) {
  try {
    await api(`/api/groups/${encodeURIComponent(leadersModalState.groupId)}/leaders/${encodeURIComponent(phone)}`, {
      method: 'DELETE',
    });
    toast('Líder removido');
    await loadLeadersModal();
    loadGroups();
  } catch (e) { toast(e.message, 'err'); }
}

// ─── Ações: pause/config/teste/maintenance ───────────────
elements.pauseBtn?.addEventListener('click', async () => {
  try {
    const r = await api('/api/pause', {
      method: 'POST',
      body: JSON.stringify({ paused: !(STATE?.paused) }),
    });
    toast(r.paused ? 'Bot pausado' : 'Bot retomado');
  } catch (e) { toast(e.message, 'err'); }
});

$('saveConfigBtn')?.addEventListener('click', async () => {
  const groups = (elements.groupsInput.value || '')
    .split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  try {
    await api('/api/config', {
      method: 'POST',
      body: JSON.stringify({
        allowedGroups: groups,
        cooldownMs: Number(elements.cooldownInput.value) || 0,
        maxQuestionLength: Number(elements.maxLenInput.value) || 500,
        fallbackAnswer: elements.fallbackInput.value,
      }),
    });
    toast('Configurações salvas');
  } catch (e) { toast(e.message, 'err'); }
});

$('reloadConfigBtn')?.addEventListener('click', async () => {
  try {
    const { state } = await api('/api/state');
    renderState(state);
    toast('Recarregado');
  } catch (e) { toast(e.message, 'err'); }
});

$('clearCacheBtn')?.addEventListener('click', async () => {
  const ok = await confirmAction({
    title: 'Limpar cache de respostas',
    message: 'As próximas perguntas iguais vão chamar a IA de novo. Confirma?',
    okLabel: 'Limpar',
  });
  if (!ok) return;
  try { await api('/api/cache/clear', { method: 'POST' }); toast('Cache limpo'); }
  catch (e) { toast(e.message, 'err'); }
});

$('resetCooldownBtn')?.addEventListener('click', async () => {
  try { await api('/api/cooldown/reset', { method: 'POST' }); toast('Cooldown resetado'); }
  catch (e) { toast(e.message, 'err'); }
});

$('resetStatsBtn')?.addEventListener('click', async () => {
  const ok = await confirmAction({
    title: 'Resetar métricas',
    message: 'Zera todos os contadores da sessão atual. Confirma?',
    okLabel: 'Resetar',
  });
  if (!ok) return;
  try { await api('/api/stats/reset', { method: 'POST' }); toast('Métricas resetadas'); }
  catch (e) { toast(e.message, 'err'); }
});

$('clearActivityBtn')?.addEventListener('click', async () => {
  try { await api('/api/activity/clear', { method: 'POST' }); }
  catch (e) { toast(e.message, 'err'); }
});
$('clearActivityBtnAlt')?.addEventListener('click', async () => {
  try { await api('/api/activity/clear', { method: 'POST' }); toast('Feed limpo'); }
  catch (e) { toast(e.message, 'err'); }
});

$('refreshGroupsBtn')?.addEventListener('click', () => loadGroups({ refresh: true }));

// Busca de grupos
elements.groupsSearch?.addEventListener('input', () => {
  groupsSearch = elements.groupsSearch.value;
  renderGroups();
});

// Busca de histórico
elements.historySearch?.addEventListener('input', () => {
  historySearchTerm = elements.historySearch.value;
  renderHistory();
});

// Testar IA
$('testBtn')?.addEventListener('click', async () => {
  const q = elements.testInput.value.trim();
  if (!q) return;
  elements.testResult.classList.remove('hidden');
  elements.testResult.textContent = '⏳ pensando...';
  try {
    const r = await api('/api/ai/test', { method: 'POST', body: JSON.stringify({ question: q }) });
    elements.testResult.textContent =
      `via ${r.provider}${r.fallback ? ' (fallback!)' : ''}  ·  ${fmtMs(r.elapsedMs)}\n\n${r.answer}`;
  } catch (e) {
    elements.testResult.textContent = `Erro: ${e.message}`;
  }
});
elements.testInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('testBtn').click();
});

// Filtros segmentados (atividade + logs)
function bindSegmented(rootEl, onChange) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      rootEl.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.value);
    });
  });
}
bindSegmented(elements.activityFilter, (val) => { activityFilterValue = val; renderActivity(); });
bindSegmented(elements.logLevelFilter, (val) => { logLevelFilter = val; renderLogs(); });

$('clearLogsBtn')?.addEventListener('click', () => {
  LOGS = [];
  renderLogs();
});

// Modal de líderes - listeners
elements.leadersSearch?.addEventListener('input', () => {
  leadersModalState.search = elements.leadersSearch.value;
  renderParticipants();
});
elements.leadersSyncBtn?.addEventListener('click', () => loadLeadersModal({ refresh: true }));
elements.manualLeaderAddBtn?.addEventListener('click', addLeaderManual);
elements.manualLeaderInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addLeaderManual(); }
});
elements.leadersModal?.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) closeLeadersModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !elements.leadersModal.classList.contains('hidden')) closeLeadersModal();
});

// Atalho: P = pausar/retomar (se não estiver em input/textarea)
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLElement) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  }
  if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    elements.pauseBtn.click();
  }
});

// ─── Socket.IO ────────────────────────────────────────────
const socket = io({ auth: { token: TOKEN } });

socket.on('connect_error', (err) => toast(`socket: ${err.message}`, 'err'));

socket.on('hello', (data) => {
  renderState(data.state);
  renderStats(data.stats);
  HISTORY = data.history || [];
  renderHistory();
  ACTIVITY = data.activity || [];
  renderActivity();
  LOGS = data.logs || [];
  renderLogs();
  loadGroups();
});

socket.on('state', renderState);
socket.on('stats', renderStats);
socket.on('history:add', (item) => {
  HISTORY.unshift(item);
  if (HISTORY.length > 200) HISTORY.length = 200;
  renderHistory();
});
socket.on('history:clear', () => { HISTORY = []; renderHistory(); });
socket.on('activity:add', (item) => {
  ACTIVITY.unshift(item);
  if (ACTIVITY.length > 120) ACTIVITY.length = 120;
  renderActivity();
});
socket.on('activity:clear', () => { ACTIVITY = []; renderActivity(); });
socket.on('log', (entry) => {
  LOGS.push(entry);
  if (LOGS.length > 500) LOGS.shift();
  renderLogs();
});
socket.on('leaders:change', () => {
  loadGroups();
  if (!elements.leadersModal.classList.contains('hidden')) loadLeadersModal();
});

// Ticker do uptime (1s)
setInterval(() => {
  if (STATE?.startedAt) {
    elements.uptime.textContent = fmtUptime(Date.now() - STATE.startedAt);
  }
}, 1000);

// ─── Boot ─────────────────────────────────────────────────
applyRoute(getRouteFromHash());
