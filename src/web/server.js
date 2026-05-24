// ============================================================
//  web/server.js
//  Bootstrap da dashboard: Express + Socket.IO.
//  Rotas em web/routes/, auth em web/auth.js, eventos em web/socket.js.
// ============================================================

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server as IOServer } from 'socket.io';

import { config } from '#config';
import { logger } from '#platform/logger';
import { createApiAuthMiddleware, createSocketAuthMiddleware } from '#web/auth';
import { attachMessaging } from '#modules/messaging';
import { registerApiRoutes } from '#web/routes/index';
import { setupSocket } from '#web/socket';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cria e inicia a dashboard.
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} [deps.client]  cliente WPP
 * @returns {Promise<{server: import('http').Server, io: import('socket.io').Server}>}
 */
export function startWebServer({ client } = {}) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const token = config.web.token;
  app.use(createApiAuthMiddleware(token));
  app.use(express.static(path.join(__dirname, 'public')));

  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: '*' } });

  const socketAuth = createSocketAuthMiddleware(token);
  if (socketAuth) io.use(socketAuth);

  registerApiRoutes(app, { client, io });
  setupSocket(io);
  attachMessaging({ client, io });

  return new Promise((resolve) => {
    server.listen(config.web.port, config.web.host, () => {
      const addr = `http://${config.web.host}:${config.web.port}`;
      logger.success(`Dashboard rodando em ${addr}`);
      if (token) logger.info(`Token de acesso: ${token}`);
      resolve({ server, io });
    });
  });
}
