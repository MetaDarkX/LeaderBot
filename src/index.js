// ============================================================
//  index.js
//  Ponto de entrada do bot. Inicializa o cliente do WhatsApp,
//  a dashboard web e registra eventos.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

import pkg from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { installGlobalErrorHandlers } from './handlers/errorHandler.js';
import { createMessageHandler } from './handlers/messageHandler.js';
import { stateService } from './services/stateService.js';
import { historyService } from './services/historyService.js';
import { groupService } from './services/groupService.js';
import { startWebServer } from './web/server.js';
import { migrate } from './db/migrate.js';
import { closePool } from './db/index.js';

const { Client, LocalAuth } = pkg;

/**
 * Quando o Chromium é morto antes de fechar limpo (ex.: pm2 restart com
 * kill_timeout curto, SIGKILL), sobram arquivos de lock no perfil do
 * usuário (SingletonLock/SingletonCookie/SingletonSocket + LOCK do LevelDB).
 * Eles fazem o Chromium recusar o perfil existente e abrir um novo "limpo",
 * o que apaga a sessão do WhatsApp Web e força um novo QR Code.
 *
 * Esta função remove APENAS esses locks (nunca a pasta Default/ onde ficam
 * cookies/IndexedDB com o token da sessão), tornando o restart resiliente.
 */
function cleanupStaleChromiumLocks(sessionDir) {
  if (!sessionDir || !fs.existsSync(sessionDir)) return;
  const lockNames = [
    'SingletonLock',
    'SingletonCookie',
    'SingletonSocket',
    'lockfile',
  ];
  for (const name of lockNames) {
    const p = path.join(sessionDir, name);
    try {
      const stat = fs.lstatSync(p);
      if (stat.isSymbolicLink() || stat.isFile()) {
        fs.unlinkSync(p);
        logger.debug(`[session] removido lock órfão: ${name}`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.warn(`[session] não consegui remover ${name}: ${err.message}`);
      }
    }
  }
}

installGlobalErrorHandlers();

logger.banner('Bot de Gincana WhatsApp');
logger.info(`provedor de IA: ${config.ai.provider.toUpperCase()}`);
logger.info(
  `grupos permitidos: ${config.bot.allowedGroups.length ? config.bot.allowedGroups.join(', ') : '(qualquer)'}`
);
logger.info(`cooldown: ${config.bot.cooldownMs}ms | cache: ${config.bot.cacheTtlSeconds}s`);
logger.info(`banco de dados: ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);

const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
];

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: config.session.name,
    dataPath: config.session.dataPath,
  }),
  puppeteer: {
    headless: true,
    args: puppeteerArgs,
    ...(config.session.chromePath ? { executablePath: config.session.chromePath } : {}),
  },
  webVersionCache: { type: 'local' },
});

// ─── Eventos do cliente ────────────────────────────────────────────────────

client.on('qr', async (qr) => {
  logger.banner('Escaneie o QR Code abaixo no WhatsApp');
  qrcodeTerminal.generate(qr, { small: true });
  logger.info('No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho');
  // Também publica como data URL para a dashboard
  try {
    const dataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 1 });
    stateService.setQR(dataUrl);
  } catch (err) {
    logger.warn(`[qr] falhou ao gerar dataURL: ${err.message}`);
    stateService.setStatus('qr');
  }
});

client.on('authenticated', () => {
  logger.success('Autenticado com sucesso — sessão salva.');
  stateService.setStatus('authenticated');
});

client.on('auth_failure', (msg) => {
  logger.error(`Falha de autenticação: ${msg}. Apague a pasta .wwebjs_auth e tente novamente.`);
  stateService.setError(msg);
});

client.on('loading_screen', (percent, msg) => {
  logger.debug(`[loading] ${percent}% — ${msg}`);
});

client.on('ready', async () => {
  logger.banner('Bot pronto e ouvindo mensagens');
  const me = {
    pushname: client.info?.pushname ?? '?',
    number: client.info?.wid?.user ?? '?',
  };
  logger.success(`Logado como: ${me.pushname} (${me.number})`);
  stateService.setReady(me);

  // Sincroniza os grupos do WhatsApp com o banco assim que o bot fica pronto.
  groupService.syncAllGroups(client).catch((err) =>
    logger.warn(`[ready] erro ao sincronizar grupos: ${err.message}`)
  );
});

client.on('disconnected', (reason) => {
  logger.warn(`Cliente desconectou: ${reason}. Tentando reiniciar em 5s...`);
  stateService.setStatus('disconnected', { lastError: String(reason) });
  const t = setTimeout(() => {
    const sessionDir = path.join(config.session.dataPath, `session-${config.session.name}`);
    cleanupStaleChromiumLocks(sessionDir);
    client.initialize().catch((e) => logger.error('reinit:', e));
  }, 5000);
  t.unref();
});

client.on('change_state', (state) => {
  logger.debug(`[state] ${state}`);
});

const onMessage = createMessageHandler(client);
client.on('message', onMessage);

// ─── Encerramento gracioso ────────────────────────────────────────────────
// Importante: o Chromium precisa de alguns segundos para finalizar a escrita
// de IndexedDB/cookies (onde a sessão do WhatsApp Web é persistida). Se o
// processo for morto antes disso, o próximo boot vai pedir QR novamente.
// Por isso o ecosystem.config.cjs usa kill_timeout: 15000 e aqui aguardamos
// client.destroy() concluir antes de fechar o pool e sair.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn(`Recebido ${signal}, encerrando... (aguardando Chromium fechar)`);
  try {
    await client.destroy();
    logger.info('Cliente WhatsApp finalizado.');
  } catch (e) {
    logger.error('Erro ao destruir client:', e);
  }
  try {
    await closePool();
  } catch (e) {
    logger.error('Erro ao fechar pool do DB:', e);
  } finally {
    process.exit(0);
  }
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// ─── Boot ─────────────────────────────────────────────────────────────────
async function main() {
  // 1) Banco de dados (obrigatório agora) — schema é idempotente.
  try {
    await migrate();
    await stateService.loadFromDb();
    await historyService.loadFromDb();
    await groupService.refreshLeadersCache();
  } catch (err) {
    logger.error(
      `Falha ao conectar/migrar o Postgres: ${err.message}. ` +
        'Verifique se o serviço está no ar (docker compose up -d) e DATABASE_URL no .env.'
    );
    process.exit(1);
  }

  // 2) Dashboard web
  if (config.web.enabled) {
    try {
      await startWebServer({ client });
    } catch (err) {
      logger.error('Falha ao iniciar dashboard:', err);
    }
  } else {
    logger.info('Dashboard web desabilitada (WEB_ENABLED=false).');
  }

  // 3) WhatsApp
  // Remove locks órfãos do perfil do Chromium ANTES do initialize, senão um
  // boot anterior mal finalizado faz o Chromium descartar o perfil e a
  // sessão do WhatsApp (pede QR de novo).
  const sessionDir = path.join(config.session.dataPath, `session-${config.session.name}`);
  cleanupStaleChromiumLocks(sessionDir);

  client.initialize().catch((err) => {
    logger.error('Falha fatal ao inicializar client:', err);
    process.exit(1);
  });
}

main();
