// ============================================================
//  providers/whatsapp/client.js
//  Criação do client whatsapp-web.js + utilitários de sessão.
//
//  Centraliza:
//    - Argumentos do Puppeteer (sem sandbox, headless, etc.)
//    - LocalAuth com sessão persistida no .wwebjs_auth/
//    - Limpeza de locks órfãos do Chromium (importante para que
//      o restart NÃO perca a sessão e force novo QR).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

import pkg from 'whatsapp-web.js';
import { config } from '#config';
import { logger } from '#platform/logger';

const { Client, LocalAuth } = pkg;

const PUPPETEER_ARGS = Object.freeze([
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',

  // ── Dieta de RAM/CPU ──────────────────────────────────────
  // O WhatsApp Web é um SPA pesado; headless não precisa de nada visual.
  '--disable-extensions',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-translate',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-client-side-phishing-detection',
  '--disable-hang-monitor',
  '--disable-notifications',
  '--disable-software-rasterizer',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--window-size=800,600',
  // Menos processos renderer = menos RAM (1 aba só, não precisa isolar sites).
  '--disable-features=site-per-process,Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
  '--renderer-process-limit=2',
  // Teto do heap V8 DENTRO do Chromium (o maior consumidor do container).
  '--js-flags=--max-old-space-size=256',
  // Cache de disco pequeno (o webVersionCache local já cobre o grosso).
  '--disk-cache-size=33554432',
  '--media-cache-size=16777216',
]);

/**
 * "Modo leve": bloqueia downloads que só servem para renderizar a UI
 * (fotos de perfil, stickers visuais, sprites, fontes). Em headless
 * ninguém vê nada disso — é puro desperdício de rede, RAM e CPU.
 *
 * IMPORTANTE: mídia de MENSAGEM (downloadMedia) NÃO passa por aqui —
 * ela chega como blob criptografado .enc via fetch, e segue funcionando.
 * Usa CDP (Network.setBlockedURLs) em vez de request interception do
 * Puppeteer para não desabilitar o cache HTTP da página.
 */
export async function enableLitePageMode(client) {
  const page = client.pupPage;
  if (!page) return false;
  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', {
      urls: [
        // Fotos de perfil e capas (maior fonte de imagens em grupos grandes)
        'https://pps.whatsapp.net/*',
        // Imagens estáticas da UI
        '*.png', '*.jpg', '*.jpeg', '*.webp', '*.gif', '*.ico',
        // Fontes
        '*.woff', '*.woff2', '*.ttf', '*.otf',
      ],
    });
    logger.info('[chrome] modo leve ativo: imagens de UI/avatares/fontes bloqueados');
    return true;
  } catch (err) {
    logger.warn(`[chrome] não consegui ativar modo leve: ${err.message}`);
    return false;
  }
}

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
export function cleanupStaleChromiumLocks(sessionDir = defaultSessionDir()) {
  if (!sessionDir || !fs.existsSync(sessionDir)) return;
  const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
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

/** Caminho padrão do perfil Chromium para esta sessão. */
export function defaultSessionDir() {
  return path.join(config.session.dataPath, `session-${config.session.name}`);
}

/**
 * Constrói (mas NÃO inicializa) um client whatsapp-web.js com a
 * configuração padrão deste projeto.
 */
export function createClient() {
  return new Client({
    authStrategy: new LocalAuth({
      clientId: config.session.name,
      dataPath: config.session.dataPath,
    }),
    puppeteer: {
      headless: true,
      args: [...PUPPETEER_ARGS],
      ...(config.session.chromePath ? { executablePath: config.session.chromePath } : {}),
    },
    webVersionCache: { type: 'local' },
  });
}
