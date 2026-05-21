// ============================================================
//  core/prompt.js
//  Prompt do sistema e parâmetros de geração.
//  Mantenha curto: cada token aqui é cobrado em TODA chamada.
// ============================================================

// ~25 tokens. Cobre os comportamentos esperados sem regras
// redundantes — o modelo já entende intenção.
export const SYSTEM_PROMPT =
  'Responda em português, em 1 frase, só com o dado pedido. Sem rodeios. Se não souber, responda "Não sei".';

// Output costuma custar 4× input. "1 frase" cabe em ~80 palavras = ~120 tokens.
export const MAX_OUTPUT_TOKENS = 120;

// Temperatura baixa: estamos atrás de fatos, não criatividade.
export const TEMPERATURE = 0.2;
