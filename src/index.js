// ============================================================
//  index.js
//  Ponto de entrada do bot. Inicializa o cliente do WhatsApp,
//  a dashboard web e registra eventos.
// ============================================================

import pkg from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { installGlobalErrorHandlers } from './handlers/errorHandler.js';
import { createMessageHandler } from './handlers/messageHandler.js';
import { stateService } from './services/stateService.js';
import { startWebServer } from './web/server.js';

const { Client, LocalAuth } = pkg;

installGlobalErrorHandlers();

logger.banner('Bot de Gincana WhatsApp');
logger.info(`provedor de IA: ${config.ai.provider.toUpperCase()}`);
logger.info(`líderes autorizados: ${config.bot.leaderNumbers.join(', ') || '(nenhum!)'}`);
logger.info(
  `grupos permitidos: ${config.bot.allowedGroups.length ? config.bot.allowedGroups.join(', ') : '(qualquer)'}`
);
logger.info(`cooldown: ${config.bot.cooldownMs}ms | cache: ${config.bot.cacheTtlSeconds}s`);

if (!config.bot.leaderNumbers.length) {
  logger.warn('Nenhum LEADER_NUMBERS configurado — o bot não responderá ninguém.');
}

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

client.on('ready', () => {
  logger.banner('Bot pronto e ouvindo mensagens');
  const me = {
    pushname: client.info?.pushname ?? '?',
    number: client.info?.wid?.user ?? '?',
  };
  logger.success(`Logado como: ${me.pushname} (${me.number})`);
  stateService.setReady(me);
});

client.on('disconnected', (reason) => {
  logger.warn(`Cliente desconectou: ${reason}. Tentando reiniciar em 5s...`);
  stateService.setStatus('disconnected', { lastError: String(reason) });
  setTimeout(() => client.initialize().catch((e) => logger.error('reinit:', e)), 5000);
});

client.on('change_state', (state) => {
  logger.debug(`[state] ${state}`);
});

const onMessage = createMessageHandler(client);
client.on('message', onMessage);

// ─── Encerramento gracioso ────────────────────────────────────────────────
async function shutdown(signal) {
  logger.warn(`Recebido ${signal}, encerrando...`);
  try {
    await client.destroy();
  } catch (e) {
    logger.error('Erro ao destruir client:', e);
  } finally {
    process.exit(0);
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Boot ─────────────────────────────────────────────────────────────────
async function main() {
  if (config.web.enabled) {
    try {
      await startWebServer({ client });
    } catch (err) {
      logger.error('Falha ao iniciar dashboard:', err);
    }
  } else {
    logger.info('Dashboard web desabilitada (WEB_ENABLED=false).');
  }

  client.initialize().catch((err) => {
    logger.error('Falha fatal ao inicializar client:', err);
    process.exit(1);
  });
}

main();
