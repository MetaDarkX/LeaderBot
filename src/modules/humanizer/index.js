// ============================================================
//  modules/humanizer/index.js
//  Faz a resposta parecer de uma pessoa, não de um bot:
//   - texto casual (sem markdown, sem ponto final, às vezes
//     tudo minúsculo — estilo digitação rápida no celular)
//   - tempos realistas: ler a pergunta → pensar → digitar
// ============================================================

import { config } from '#config';

const rand = (min, max) => min + Math.random() * (max - min);
const chance = (p) => Math.random() < p;

/**
 * Se a resposta for só uma lista de letras de alternativa (A-J),
 * padroniza para separá-las APENAS por vírgula ("A, B e C" → "A, B, C").
 * Alguns líderes só aceitam vírgula como separador.
 * Retorna null quando a resposta NÃO é uma lista de letras.
 */
function asLetterList(text) {
  const tokens = text
    .split(/\s*(?:,|\be\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length < 2) return null;
  if (!tokens.every((tok) => /^[A-Ja-j]$/.test(tok))) return null;
  return tokens.map((tok) => tok.toUpperCase()).join(', ');
}

/**
 * Deixa o texto da resposta com cara de WhatsApp.
 * Não altera o CONTEÚDO (o dado da resposta), só a forma.
 */
export function humanizeAnswer(text) {
  let t = (text || '').trim();
  if (!t) return t;

  // IA às vezes emite markdown — ninguém digita asterisco no zap.
  t = t.replace(/[*_~`]+/g, '');

  // Ponto final em mensagem curta é coisa de robô (ou de chefe bravo).
  t = t.replace(/[.!]+$/, '');

  // Lista de alternativas: força só vírgulas e mantém as letras maiúsculas.
  const list = asLetterList(t);
  if (list) return list;

  // Pessoas digitando rápido raramente capricham no shift.
  // Só em respostas de uma linha, para não bagunçar listas.
  if (!t.includes('\n') && t.length <= 60 && chance(0.6)) {
    t = t.toLowerCase();
  }

  return t;
}

/**
 * Plano de tempos para a resposta parecer humana.
 *
 * Fases:
 *   preTypeMs — tempo "lendo a pergunta e pensando" (sem indicador
 *               de digitação). O tempo que a IA já gastou conta
 *               como parte desse pensamento.
 *   typeMs    — tempo "digitando" (com indicador), proporcional ao
 *               tamanho da resposta.
 *
 * Perfil: pessoa RÁPIDA no celular — quem joga gincana digita correndo.
 * Resposta curta (letra, número, 1-2 palavras) sai em ~1,5-3,5s,
 * que é plausível para humano e ainda competitivo.
 *
 * @param {string} question
 * @param {string} answer
 * @param {number} alreadyElapsedMs tempo já gasto resolvendo (IA/cache)
 * @returns {{preTypeMs: number, typeMs: number}}
 */
export function humanDelayPlan(question, answer, alreadyElapsedMs = 0) {
  const readMs = Math.min(2000, 300 + (question?.length || 0) * rand(12, 25));
  const thinkMs = rand(250, 1000);
  const typeMs = Math.min(
    5000,
    200 + (answer?.length || 0) * rand(90, 160)
  );

  let preTypeMs = readMs + thinkMs - alreadyElapsedMs;
  if (preTypeMs < 0) preTypeMs = rand(150, 400);

  // Respeita o teto/piso configurados para o tempo total.
  const min = Math.max(0, config.bot.humanMinDelayMs ?? 1200);
  const max = Math.max(min, config.bot.humanMaxDelayMs ?? 7000);
  const total = preTypeMs + typeMs;

  if (total > max) {
    const scale = max / total;
    return { preTypeMs: Math.round(preTypeMs * scale), typeMs: Math.round(typeMs * scale) };
  }
  if (total < min) {
    preTypeMs += min - total;
  }

  return { preTypeMs: Math.round(preTypeMs), typeMs: Math.round(typeMs) };
}

/** Decide se a resposta deve citar a pergunta (reply) ou ir solta no chat. */
export function shouldQuote() {
  // Citar TODA mensagem instantaneamente é assinatura de bot.
  // Pessoas citam de vez em quando, geralmente quando o chat anda rápido.
  return chance(0.3);
}
