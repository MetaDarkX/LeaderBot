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
  'Se a pergunta tiver alternativas A) B) C)…, responda SOMENTE com a letra correta — uma letra, sem parêntese e sem repetir o texto da alternativa (ex.: C). ' +
  'Em fatos bíblicos, históricos ou de interpretação específica (ex.: futurista), escolha a alternativa que a pergunta pede; se não tiver certeza, responda "Não sei" — não chute. ' +
  'Ex.: "Qual a capital do Brasil?" → Brasília. "2+2?" → 4.';

// Gemini 2.5+ pode gastar tokens em "thinking" dentro do mesmo teto — 120 truncava a saída.
export const MAX_OUTPUT_TOKENS = 512;

// Temperatura baixa: estamos atrás de fatos, não criatividade.
export const TEMPERATURE = 0.2;
