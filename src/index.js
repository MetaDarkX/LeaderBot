// ============================================================
//  index.js
//  Ponto de entrada do bot. Inicializa o cliente do WhatsApp,
//  a dashboard web e registra eventos.
// ============================================================

import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

import { config } from '#config';
import { logger } from '#platform/logger';
import { installCrashHandlers } from '#platform/crashHandlers';
import { createMessageHandler } from '#pipeline/handleIncomingMessage';
import { stateService } from '#modules/state';
import { historyService } from '#modules/history';
import { groupService } from '#modules/groups';
import { validateConfiguredModel } from '#providers/ai';
import {
  createClient,
  cleanupStaleChromiumLocks,
  defaultSessionDir,
} from '#providers/whatsapp';
import { startWebServer } from './web/server.js';
import { migrate, closePool } from '#infra/db';

installCrashHandlers();

logger.banner('Bot de Gincana WhatsApp');
const _ai = validateConfiguredModel();
logger.info(`provedor de IA: ${_ai.provider.toUpperCase()} (modelo: ${_ai.model})`);
logger.info(
  `grupos permitidos: ${config.bot.allowedGroups.length ? config.bot.allowedGroups.join(', ') : '(qualquer)'}`
);
logger.info(`cooldown: ${config.bot.cooldownMs}ms | cache: ${config.bot.cacheTtlSeconds}s`);
logger.info(`banco de dados: ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);

const client = createClient();

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
    cleanupStaleChromiumLocks();
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
  cleanupStaleChromiumLocks(defaultSessionDir());

  client.initialize().catch((err) => {
    logger.error('Falha fatal ao inicializar client:', err);
    process.exit(1);
  });
}

main();
