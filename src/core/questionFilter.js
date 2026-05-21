// ============================================================
//  core/questionFilter.js
//  Heurísticas PURAS para decidir se uma mensagem é pergunta.
//  Não tem dependência de estado/IO: o caller injeta o
//  `maxQuestionLength` quando precisar validar tamanho.
// ============================================================

// Frases curtas que NUNCA são perguntas em gincana — corte cedo
// para evitar chamada de IA com lixo (saudações, reações, etc.).
const NOISE_REGEX =
  /^(ok|okay|kk+|kkkk+|haha+|sim|nao|n[aã]o|vlw|valeu|obrigad[oa]|tmj|blz|de\s*nada|opa|oi|ol[áa]|bom dia|boa tarde|boa noite|aff|eita|nossa)[\s!.?]*$/i;

export function looksLikeQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 4) return false;
  if (NOISE_REGEX.test(t)) return false;
  // Mínimo de 2 "palavras" para evitar mandar tokens isolados pra IA.
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  return true;
}

/**
 * Validação completa de uma pergunta.
 * @param {string} text
 * @param {{maxLength?: number}} [opts]
 * @returns {{ok: boolean, reason?: string}}
 */
export function validateQuestion(text, { maxLength = 300 } = {}) {
  if (!text) return { ok: false, reason: 'mensagem vazia' };
  if (text.length > maxLength) {
    return { ok: false, reason: `mensagem maior que ${maxLength} caracteres` };
  }
  if (!looksLikeQuestion(text)) {
    return { ok: false, reason: 'não parece pergunta' };
  }
  return { ok: true };
}
