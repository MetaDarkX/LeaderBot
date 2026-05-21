// ============================================================
//  config/env.js
//  Helpers de leitura de variáveis de ambiente.
//  Sem efeitos colaterais — pode ser importado por qualquer
//  módulo de config sem criar ciclos.
// ============================================================

import 'dotenv/config';

/**
 * Lê variável de ambiente com fallback e parsing opcional.
 * Lança erro caso seja obrigatória e não esteja definida.
 */
export function env(key, { required = false, defaultValue = undefined, parse = (v) => v } = {}) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    if (required) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
    }
    return defaultValue;
  }
  return parse(raw);
}

export const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`Esperado inteiro, recebi: "${v}"`);
  return n;
};

export const toList = (v) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const toBool = (v) => {
  const s = String(v).toLowerCase();
  return s !== 'false' && s !== '0' && s !== 'no' && s !== '';
};
