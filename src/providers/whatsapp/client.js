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
]);

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
