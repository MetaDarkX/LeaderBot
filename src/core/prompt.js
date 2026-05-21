// ============================================================
//  core/prompt.js
//  Prompt do sistema e parâmetros de geração.
//  Mantenha curto: cada token aqui é cobrado em TODA chamada.
// ============================================================

// Resposta direta — sem preâmbulo ("A capital do Brasil é…").
export const SYSTEM_PROMPT =
  'Você responde perguntas de gincana em português. ' +
  'Entregue SOMENTE o dado final, curto e completo — sem introdução nem frase incompleta. ' +
  'Proibido começar com "A resposta é", "A capital do Brasil é", "O nome é", etc. ' +
  'Ex.: "Qual a capital do Brasil?" → Brasília. "2+2?" → 4. ' +
  'Se não souber: Não sei.';

// Gemini 2.5+ pode gastar tokens em "thinking" dentro do mesmo teto — 120 truncava a saída.
export const MAX_OUTPUT_TOKENS = 512;

// Temperatura baixa: estamos atrás de fatos, não criatividade.
export const TEMPERATURE = 0.2;
