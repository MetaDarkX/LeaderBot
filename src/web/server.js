// ============================================================
//  web/server.js
//  Servidor HTTP + WebSocket que serve a dashboard e expõe
//  uma API para inspecionar e configurar o bot em runtime.
// ============================================================

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server as IOServer } from 'socket.io';

import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { stateService } from '../services/stateService.js';
import { statsService } from '../services/statsService.js';
import { historyService } from '../services/historyService.js';
import { activityService } from '../services/activityService.js';
import { cacheStats, clearCache } from '../services/cacheService.js';
import { resetCooldown } from '../services/cooldownService.js';
import { askAI } from '../services/aiService.js';
import { normalizePhone } from '../utils/filters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cria e inicia a dashboard.
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client  cliente WPP
 */
export function startWebServer({ client }) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // ── Middleware: token opcional ────────────────────────────
  const token = config.web.token;
  if (token) {
    app.use((req, res, next) => {
      // GET / e assets são liberados; API e WS exigem token
      if (!req.path.startsWith('/api')) return next();
      const sent =
        req.headers['x-auth-token'] ||
        (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (sent === token) return next();
      return res.status(401).json({ error: 'unauthorized' });
    });
  }

  // ── Rotas estáticas ───────────────────────────────────────
  app.use(express.static(path.join(__dirname, 'public')));

  // ── API ───────────────────────────────────────────────────
  app.get('/api/state', (_req, res) => {
    res.json({
      state: stateService.snapshot(),
      stats: statsService.snapshot(),
      cache: cacheStats(),
      history: historyService.list(),
      activity: activityService.list(),
    });
  });

  app.get('/api/activity', (_req, res) => res.json(activityService.list()));
  app.post('/api/activity/clear', (_req, res) => {
    activityService.clear();
    res.json({ ok: true });
  });

  app.get('/api/logs', (_req, res) => {
    res.json(logger.buffer());
  });

  app.post('/api/pause', (req, res) => {
    const paused = stateService.togglePaused(req.body?.paused);
    logger.warn(`[ui] bot ${paused ? 'PAUSADO' : 'RETOMADO'} via dashboard`);
    res.json({ paused });
  });

  app.post('/api/config', (req, res) => {
    const patch = req.body || {};
    const clean = {};
    if (Array.isArray(patch.leaderNumbers)) {
      clean.leaderNumbers = patch.leaderNumbers.map(normalizePhone).filter(Boolean);
    }
    if (Array.isArray(patch.allowedGroups)) {
      clean.allowedGroups = patch.allowedGroups.map(String).filter(Boolean);
    }
    if (Number.isFinite(patch.cooldownMs)) clean.cooldownMs = Math.max(0, patch.cooldownMs);
    if (Number.isFinite(patch.maxQuestionLength)) {
      clean.maxQuestionLength = Math.max(1, patch.maxQuestionLength);
    }
    if (typeof patch.fallbackAnswer === 'string') clean.fallbackAnswer = patch.fallbackAnswer;

    stateService.patchRuntimeConfig(clean);
    logger.info(`[ui] config atualizada: ${Object.keys(clean).join(', ') || '(nada)'}`);
    res.json(stateService.runtime);
  });

  app.post('/api/cache/clear', (_req, res) => {
    clearCache();
    logger.info('[ui] cache limpo via dashboard');
    res.json({ ok: true });
  });

  app.post('/api/cooldown/reset', (_req, res) => {
    resetCooldown();
    logger.info('[ui] cooldown resetado via dashboard');
    res.json({ ok: true });
  });

  app.post('/api/stats/reset', (_req, res) => {
    statsService.reset();
    res.json({ ok: true });
  });

  app.get('/api/groups', async (_req, res) => {
    try {
      if (!client?.info) return res.json({ groups: [] });
      const chats = await client.getChats();
      const groups = chats
        .filter((c) => c.isGroup)
        .map((c) => ({
          id: c.id._serialized,
          name: c.name,
          participants: c.participants?.length ?? 0,
          allowed: stateService.runtime.allowedGroups.length === 0
            ? true
            : stateService.runtime.allowedGroups.includes(c.id._serialized),
        }));
      res.json({ groups });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ai/test', async (req, res) => {
    const question = (req.body?.question || '').toString().trim();
    if (!question) return res.status(400).json({ error: 'question is required' });
    const t0 = Date.now();
    try {
      const { answer, provider, fallback } = await askAI(question);
      res.json({ answer, provider, fallback, elapsedMs: Date.now() - t0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── HTTP + Socket.IO ──────────────────────────────────────
  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: '*' } });

  if (token) {
    io.use((socket, next) => {
      const sent =
        socket.handshake.auth?.token ||
        socket.handshake.headers['x-auth-token'];
      if (sent === token) return next();
      return next(new Error('unauthorized'));
    });
  }

  io.on('connection', (socket) => {
    logger.debug(`[ws] cliente conectado: ${socket.id}`);
    // Snapshot inicial
    socket.emit('hello', {
      state: stateService.snapshot(),
      stats: statsService.snapshot(),
      history: historyService.list(),
      activity: activityService.list(),
      logs: logger.buffer(),
      cache: cacheStats(),
    });
    socket.on('disconnect', () => logger.debug(`[ws] cliente saiu: ${socket.id}`));
  });

  // Broadcast de eventos
  stateService.on('change', (s) => io.emit('state', s));
  statsService.on('change', (s) => io.emit('stats', s));
  historyService.on('add', (item) => io.emit('history:add', item));
  historyService.on('clear', () => io.emit('history:clear'));
  activityService.on('add', (item) => io.emit('activity:add', item));
  activityService.on('clear', () => io.emit('activity:clear'));
  logger.on('log', (entry) => io.emit('log', entry));

  // ── Start ─────────────────────────────────────────────────
  return new Promise((resolve) => {
    server.listen(config.web.port, config.web.host, () => {
      const addr = `http://${config.web.host}:${config.web.port}`;
      logger.success(`Dashboard rodando em ${addr}`);
      if (token) logger.info(`Token de acesso: ${token}`);
      resolve({ server, io });
    });
  });
}
