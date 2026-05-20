// ============================================================
//  app.js — frontend da dashboard wppbot
//  Vanilla JS puro, sem framework.
// ============================================================

// Token opcional via querystring: ?token=xxx
const TOKEN = new URLSearchParams(location.search).get('token') || '';

const authHeaders = () => (TOKEN ? { 'x-auth-token': TOKEN } : {});

/** Helper: fetch JSON com token. */
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
  setTimeout(() => t.remove(), 3200);
}

// ─── Elementos ────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const elements = {
  statusDot: $('statusDot'),
  statusText: $('statusText'),
  uptime: $('uptime'),
  pauseBtn: $('pauseBtn'),
  qrBox: $('qrBox'),
  qrImg: $('qrImg'),
  meBox: $('meBox'),
  meName: $('meName'),
  meNumber: $('meNumber'),
  loadingBox: $('loadingBox'),

  stReceived: $('stReceived'),
  stAnswered: $('stAnswered'),
  stCache: $('stCache'),
  stAi: $('stAi'),
  stFallback: $('stFallback'),
  stAvg: $('stAvg'),
  stLast: $('stLast'),
  stPause: $('stPause'),
  stCool: $('stCool'),
  stFilter: $('stFilter'),

  groupsInput: $('groupsInput'),
  cooldownInput: $('cooldownInput'),
  maxLenInput: $('maxLenInput'),
  fallbackInput: $('fallbackInput'),

  groupList: $('groupList'),
  testInput: $('testInput'),
  testResult: $('testResult'),

  leadersModal: $('leadersModal'),
  leadersGroupName: $('leadersGroupName'),
  leadersGroupId: $('leadersGroupId'),
  leadersSearch: $('leadersSearch'),
  leadersCount: $('leadersCount'),
  participantsList: $('participantsList'),
  leadersSyncBtn: $('leadersSyncBtn'),

  historyList: $('historyList'),
  historyCount: $('historyCount'),

  activityList: $('activityList'),
  activityFilter: $('activityFilter'),
  autoScrollActivity: $('autoScrollActivity'),

  logBox: $('logBox'),
  logLevelFilter: $('logLevelFilter'),
};

// ─── Estado local ─────────────────────────────────────────
let LOGS = [];
let HISTORY = [];
let ACTIVITY = [];
let STATE = null;
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Modal de líderes
const leadersModalState = {
  groupId: null,
  groupName: '',
  participants: [],
  search: '',
};

// ─── Helpers de render ────────────────────────────────────
function fmtMs(ms) {
  if (!ms) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
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
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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
  const m = map[state.status] || { cls: '', text: state.status };
  elements.statusDot.className = `dot ${m.cls}`;
  elements.statusText.textContent = state.paused ? `${m.text} · pausado` : m.text;
  elements.uptime.textContent = fmtUptime(state.uptimeMs || 0);
  elements.pauseBtn.textContent = state.paused ? 'Retomar' : 'Pausar';
  elements.pauseBtn.classList.toggle('btn-primary', state.paused);
  elements.pauseBtn.classList.toggle('btn-warn', !state.paused);

  // QR / identidade
  if (state.status === 'qr' && state.qrDataUrl) {
    elements.qrBox.classList.remove('hidden');
    elements.qrImg.src = state.qrDataUrl;
    elements.meBox.classList.add('hidden');
    elements.loadingBox.classList.add('hidden');
  } else if (state.status === 'ready' && state.me) {
    elements.qrBox.classList.add('hidden');
    elements.meBox.classList.remove('hidden');
    elements.meName.textContent = state.me.pushname || '—';
    elements.meNumber.textContent = state.me.number || '—';
    elements.loadingBox.classList.add('hidden');
  } else {
    elements.qrBox.classList.add('hidden');
    elements.meBox.classList.add('hidden');
    elements.loadingBox.classList.remove('hidden');
    elements.loadingBox.textContent = state.lastError || 'Aguardando inicialização…';
  }

  // Runtime config -> form (apenas se o usuário não estiver editando)
  if (state.runtimeConfig && document.activeElement?.tagName !== 'TEXTAREA' &&
      document.activeElement?.tagName !== 'INPUT') {
    const c = state.runtimeConfig;
    elements.groupsInput.value = (c.allowedGroups || []).join('\n');
    elements.cooldownInput.value = c.cooldownMs ?? 1500;
    elements.maxLenInput.value = c.maxQuestionLength ?? 500;
    elements.fallbackInput.value = c.fallbackAnswer ?? '';
  }
}

// ─── Render: stats ────────────────────────────────────────
function renderStats(s) {
  elements.stReceived.textContent  = s.received ?? 0;
  elements.stAnswered.textContent  = s.answered ?? 0;
  elements.stCache.textContent     = s.cacheHits ?? 0;
  elements.stAi.textContent        = s.aiCalls ?? 0;
  elements.stFallback.textContent  = s.fallbacks ?? 0;
  elements.stAvg.textContent       = fmtMs(s.avgLatencyMs);
  elements.stLast.textContent      = fmtMs(s.lastLatencyMs);
  elements.stPause.textContent     = s.ignoredByPause ?? 0;
  elements.stCool.textContent      = s.ignoredByCooldown ?? 0;
  elements.stFilter.textContent    = s.ignoredByFilter ?? 0;
}

// ─── Render: histórico ────────────────────────────────────
function renderHistory() {
  elements.historyCount.textContent = `${HISTORY.length} entradas`;
  elements.historyList.innerHTML = HISTORY.map((h) => {
    const time = new Date(h.at).toLocaleTimeString('pt-BR', { hour12: false });
    const phone = (h.leaderId || '').split('@')[0];
    return `
      <div class="h-item">
        <div class="h-head">
          <span>${escapeHTML(time)}</span>
          <span>·</span>
          <span><b>${escapeHTML(h.groupName || 'grupo')}</b></span>
          <span>·</span>
          <span>${escapeHTML(phone)}</span>
          <span>·</span>
          <span>${fmtMs(h.elapsedMs)}</span>
          <span class="tag ${h.source}">${h.source}</span>
        </div>
        <div class="h-q">❓ ${escapeHTML(h.question)}</div>
        <div class="h-a">💬 ${escapeHTML(h.answer)}</div>
      </div>`;
  }).join('') || '<p class="muted small">Sem entradas ainda.</p>';
}

// ─── Render: atividade ao vivo ────────────────────────────
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
  if (filter === 'ignored') return item.action.startsWith('ignored:');
  return true;
}

function renderActivity() {
  const filter = elements.activityFilter.value;
  const list = ACTIVITY.filter((i) => activityMatchesFilter(i, filter));
  if (!list.length) {
    elements.activityList.innerHTML = '<p class="muted small">Aguardando mensagens…</p>';
    return;
  }
  const wasAtTop = elements.activityList.scrollTop < 20;
  elements.activityList.innerHTML = list.map((item) => {
    const t = new Date(item.at).toLocaleTimeString('pt-BR', { hour12: false });
    const label = ACTION_LABELS[item.action] || item.action;
    const where = item.groupName ? `<span class="a-group">${escapeHTML(item.groupName)}</span>` : '<span class="a-group">DM</span>';
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
  if (elements.autoScrollActivity.checked && wasAtTop) {
    elements.activityList.scrollTop = 0;
  }
}

// ─── Render: logs ─────────────────────────────────────────
function renderLogs() {
  const minLevelKey = elements.logLevelFilter.value;
  const min = minLevelKey === 'all' ? 0 : (LEVELS[minLevelKey] ?? 0);
  const filtered = LOGS.filter((l) => (LEVELS[l.level] ?? 0) >= min);
  elements.logBox.innerHTML = filtered.slice(-300).map((l) => {
    const t = new Date(l.at).toLocaleTimeString('pt-BR', { hour12: false });
    return `<span class="log-time">[${t}]</span> <span class="log-${l.level}">${l.level.toUpperCase().padEnd(5)}</span> ${escapeHTML(l.message)}`;
  }).join('\n');
  elements.logBox.scrollTop = elements.logBox.scrollHeight;
}

// ─── Render: grupos ───────────────────────────────────────
async function loadGroups() {
  elements.groupList.innerHTML = '<li class="muted small">Carregando…</li>';
  try {
    const { groups } = await api('/api/groups');
    if (!groups.length) {
      elements.groupList.innerHTML = '<li class="muted small">Nenhum grupo encontrado (o bot está conectado?).</li>';
      return;
    }
    elements.groupList.innerHTML = groups.map((g) => {
      const allowedBadge = g.allowed ? '<span class="badge">ATIVO</span>' : '';
      const leaderBadge = g.leaderCount > 0
        ? `<span class="badge badge-leader">★ ${g.leaderCount}</span>`
        : '<span class="badge badge-empty">sem líder</span>';
      return `
        <li>
          <div class="gmeta">
            <div class="gname">
              ${escapeHTML(g.name)} ${allowedBadge} ${leaderBadge}
            </div>
            <code>${escapeHTML(g.id)} · ${g.participants} membros</code>
          </div>
          <div class="row gap">
            <button class="btn btn-sm" data-lead-id="${escapeHTML(g.id)}" data-lead-name="${escapeHTML(g.name)}">
              ★ Gerenciar líderes
            </button>
            <button class="btn btn-sm" data-add="${escapeHTML(g.id)}">
              ${g.allowed ? 'Já permitido' : '+ Permitir'}
            </button>
          </div>
        </li>`;
    }).join('');
    elements.groupList.querySelectorAll('[data-add]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-add');
        const current = (elements.groupsInput.value || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
        if (!current.includes(id)) current.push(id);
        elements.groupsInput.value = current.join('\n');
        toast('Grupo adicionado à lista. Clique em "Salvar".');
      };
    });
    elements.groupList.querySelectorAll('[data-lead-id]').forEach((btn) => {
      btn.onclick = () => {
        openLeadersModal(btn.getAttribute('data-lead-id'), btn.getAttribute('data-lead-name'));
      };
    });
  } catch (err) {
    elements.groupList.innerHTML = `<li class="muted small">Erro: ${escapeHTML(err.message)}</li>`;
  }
}

// ─── Modal: gerenciamento de líderes ─────────────────────
async function openLeadersModal(groupId, groupName) {
  leadersModalState.groupId = groupId;
  leadersModalState.groupName = groupName || groupId;
  leadersModalState.search = '';
  elements.leadersSearch.value = '';
  elements.leadersGroupName.textContent = leadersModalState.groupName;
  elements.leadersGroupId.textContent = groupId;
  elements.leadersModal.classList.remove('hidden');
  elements.participantsList.innerHTML = '<p class="muted small">Carregando participantes…</p>';
  await loadLeadersModal();
}

function closeLeadersModal() {
  elements.leadersModal.classList.add('hidden');
  leadersModalState.groupId = null;
  leadersModalState.participants = [];
}

async function loadLeadersModal({ refresh = false } = {}) {
  if (!leadersModalState.groupId) return;
  const qs = refresh ? '?refresh=1' : '';
  try {
    const data = await api(`/api/groups/${encodeURIComponent(leadersModalState.groupId)}/participants${qs}`);
    leadersModalState.participants = data.participants || [];
    renderParticipants();
    if (refresh) toast('Participantes sincronizados', 'ok');
  } catch (err) {
    elements.participantsList.innerHTML = `<p class="muted small">Erro: ${escapeHTML(err.message)}</p>`;
  }
}

function renderParticipants() {
  const q = (leadersModalState.search || '').trim().toLowerCase();
  const list = leadersModalState.participants.filter((p) => {
    if (!q) return true;
    const hay = `${p.phone} ${p.pushname || ''} ${p.display_name || ''}`.toLowerCase();
    return hay.includes(q);
  });

  const total = leadersModalState.participants.length;
  const leaders = leadersModalState.participants.filter((p) => p.is_leader).length;
  elements.leadersCount.textContent = `${leaders} líder(es) · ${list.length}/${total}`;

  if (!list.length) {
    elements.participantsList.innerHTML = total === 0
      ? `<p class="muted small">Nenhum participante registrado. Clique em <b>↻ sincronizar</b> para buscar do WhatsApp.</p>`
      : `<p class="muted small">Nenhum participante combina com "${escapeHTML(q)}".</p>`;
    return;
  }

  elements.participantsList.innerHTML = list.map((p) => {
    const name = p.display_name || p.pushname || `+${p.phone}`;
    const subtitle = `+${p.phone}${p.is_admin ? ' · admin' : ''}`;
    const cls = p.is_leader ? 'is-leader' : '';
    const btn = p.is_leader
      ? `<button class="btn btn-sm btn-warn" data-remove="${escapeHTML(p.phone)}">★ remover líder</button>`
      : `<button class="btn btn-sm btn-primary" data-add="${escapeHTML(p.phone)}" data-name="${escapeHTML(name)}">☆ tornar líder</button>`;
    return `
      <div class="participant ${cls}">
        <div class="p-meta">
          <div class="p-name">${escapeHTML(name)} ${p.is_admin ? '<span class="badge badge-admin">admin</span>' : ''}</div>
          <code class="muted small">${escapeHTML(subtitle)}</code>
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

// ─── Ações ────────────────────────────────────────────────
elements.pauseBtn.addEventListener('click', async () => {
  try {
    const r = await api('/api/pause', {
      method: 'POST',
      body: JSON.stringify({ paused: !(STATE?.paused) }),
    });
    toast(r.paused ? 'Bot pausado' : 'Bot retomado');
  } catch (e) { toast(e.message, 'err'); }
});

document.getElementById('saveConfigBtn').addEventListener('click', async () => {
  const groups  = elements.groupsInput.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
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

document.getElementById('reloadConfigBtn').addEventListener('click', async () => {
  try {
    const { state } = await api('/api/state');
    renderState(state);
    toast('Recarregado');
  } catch (e) { toast(e.message, 'err'); }
});

document.getElementById('clearCacheBtn').addEventListener('click', async () => {
  try { await api('/api/cache/clear', { method: 'POST' }); toast('Cache limpo'); }
  catch (e) { toast(e.message, 'err'); }
});

document.getElementById('resetCooldownBtn').addEventListener('click', async () => {
  try { await api('/api/cooldown/reset', { method: 'POST' }); toast('Cooldown resetado'); }
  catch (e) { toast(e.message, 'err'); }
});

document.getElementById('resetStatsBtn').addEventListener('click', async () => {
  try { await api('/api/stats/reset', { method: 'POST' }); toast('Estatísticas resetadas'); }
  catch (e) { toast(e.message, 'err'); }
});

document.getElementById('refreshGroupsBtn').addEventListener('click', loadGroups);

document.getElementById('testBtn').addEventListener('click', async () => {
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

elements.testInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('testBtn').click();
});

elements.logLevelFilter.addEventListener('change', renderLogs);
document.getElementById('clearLogsBtn').addEventListener('click', () => {
  LOGS = [];
  renderLogs();
});

elements.activityFilter.addEventListener('change', renderActivity);
document.getElementById('clearActivityBtn').addEventListener('click', async () => {
  try { await api('/api/activity/clear', { method: 'POST' }); }
  catch (e) { toast(e.message, 'err'); }
});

// ─── Listeners do modal de líderes ───────────────────────
elements.leadersSearch.addEventListener('input', () => {
  leadersModalState.search = elements.leadersSearch.value;
  renderParticipants();
});
elements.leadersSyncBtn.addEventListener('click', () => loadLeadersModal({ refresh: true }));
elements.leadersModal.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) closeLeadersModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !elements.leadersModal.classList.contains('hidden')) closeLeadersModal();
});

// ─── Socket.IO ────────────────────────────────────────────
const socket = io({ auth: { token: TOKEN } });

socket.on('connect_error', (err) => {
  toast(`socket: ${err.message}`, 'err');
});

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
  if (HISTORY.length > 100) HISTORY.length = 100;
  renderHistory();
});
socket.on('history:clear', () => { HISTORY = []; renderHistory(); });
socket.on('activity:add', (item) => {
  ACTIVITY.unshift(item);
  if (ACTIVITY.length > 80) ACTIVITY.length = 80;
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

// Atualiza o uptime a cada segundo (sem precisar bater no backend)
setInterval(() => {
  if (STATE?.startedAt) {
    elements.uptime.textContent = fmtUptime(Date.now() - STATE.startedAt);
  }
}, 1000);
