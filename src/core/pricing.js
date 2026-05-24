// ============================================================
//  core/pricing.js
//  Tabela de preços USD por 1M tokens (input, output).
//  Usada para *estimativa* de custo por chamada — atualize
//  conforme a tabela oficial do provedor muda.
// ============================================================

export const PRICING = Object.freeze({
  openai: Object.freeze({
    'gpt-4o-mini':           { in: 0.15,  out: 0.60 },
    'gpt-4o':                { in: 2.50,  out: 10.00 },
    'gpt-4.1-mini':          { in: 0.40,  out: 1.60 },
    'gpt-4.1-nano':          { in: 0.10,  out: 0.40 },
  }),
  gemini: Object.freeze({
    'gemini-1.5-flash-8b':   { in: 0.0375, out: 0.15 },
    'gemini-1.5-flash':      { in: 0.075,  out: 0.30 },
    'gemini-2.0-flash':      { in: 0.10,   out: 0.40 },
    'gemini-2.0-flash-lite': { in: 0.075,  out: 0.30 },
    'gemini-2.5-flash':      { in: 0.30,   out: 2.50 },
    'gemini-2.5-flash-lite': { in: 0.10,   out: 0.40 },
    'gemini-3.1-flash-lite': { in: 0.25,   out: 1.50 },
  }),
});

/**
 * Estima o custo em USD para um uso de tokens.
 * @param {string} provider  'openai' | 'gemini'
 * @param {string} model
 * @param {{inputTokens:number, outputTokens:number}} usage
 * @returns {number} custo em USD (0 se modelo desconhecido)
 */
export function estimateCost(provider, model, usage) {
  const price = PRICING[provider]?.[model];
  if (!price || !usage) return 0;
  const inMln = (usage.inputTokens ?? 0) / 1_000_000;
  const outMln = (usage.outputTokens ?? 0) / 1_000_000;
  return inMln * price.in + outMln * price.out;
}

/** Verifica se o modelo é conhecido (para warnings de configuração). */
export function isKnownModel(provider, model) {
  return !!PRICING[provider]?.[model];
}
