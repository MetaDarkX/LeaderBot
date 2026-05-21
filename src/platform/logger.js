// ============================================================
//  platform/logger.js
//  Logger simples com cores e níveis. Também emite eventos
//  via EventEmitter para que a dashboard receba logs em
//  tempo real, e mantém um buffer das últimas N entradas.
// ============================================================

import { EventEmitter } from 'node:events';
import chalk from 'chalk';
import { config } from '#config';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const BUFFER_LIMIT = 300;

function shouldLog(level) {
  return LEVELS[level] >= (LEVELS[config.log.level] ?? LEVELS.info);
}

function timestamp() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

function format(tag, color, ...args) {
  const ts = chalk.gray(`[${timestamp()}]`);
  const lvl = color(tag.padEnd(5));
  return [ts, lvl, ...args];
}

/** Converte argumentos arbitrários para uma string plana. */
function stringify(args) {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

class LoggerBus extends EventEmitter {}
const bus = new LoggerBus();
const buffer = []; // últimos N logs para enviar a clientes que conectarem

function record(level, args) {
  const entry = { at: Date.now(), level, message: stringify(args) };
  buffer.push(entry);
  if (buffer.length > BUFFER_LIMIT) buffer.shift();
  bus.emit('log', entry);
}

export const logger = {
  debug: (...a) => {
    if (!shouldLog('debug')) return;
    console.log(...format('DEBUG', chalk.magenta, ...a));
    record('debug', a);
  },
  info: (...a) => {
    if (!shouldLog('info')) return;
    console.log(...format('INFO', chalk.cyan, ...a));
    record('info', a);
  },
  warn: (...a) => {
    if (!shouldLog('warn')) return;
    console.warn(...format('WARN', chalk.yellow, ...a));
    record('warn', a);
  },
  error: (...a) => {
    if (!shouldLog('error')) return;
    console.error(...format('ERROR', chalk.red, ...a));
    record('error', a);
  },
  banner(title) {
    const line = chalk.cyanBright('─'.repeat(60));
    console.log(`\n${line}\n${chalk.bold.cyanBright('  ' + title)}\n${line}`);
    record('info', [`=== ${title} ===`]);
  },
  success(...a) {
    console.log(...format('OK', chalk.green, ...a));
    record('info', a);
  },

  /** API para a dashboard: assina/retira ouvintes e lê o buffer. */
  on: (event, handler) => bus.on(event, handler),
  off: (event, handler) => bus.off(event, handler),
  buffer: () => [...buffer],
};
