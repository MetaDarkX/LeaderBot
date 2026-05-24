// ============================================================
//  core/classifyPrompt.js
//  Prompt para classificar se a última mensagem é pergunta da gincana.
// ============================================================

import { truncate } from '#platform/helpers';

export const CLASSIFY_SYSTEM_PROMPT =
  'Você classifica mensagens de um grupo de gincana (quiz) no WhatsApp. ' +
  'Recebe o histórico recente do chat. Decida se a mensagem marcada [ÚLTIMA] é uma pergunta objetiva da gincana que o bot deve responder (conhecimento bíblico, geral ou múltipla escolha). ' +
  'Use o contexto das mensagens anteriores para distinguir pergunta de quiz de conversa do grupo. ' +
  'Responda SOMENTE SIM ou NAO. ' +
  'NAO se for: confirmação (certo?, confirmado?), organização do grupo (presença, quantas perguntas, horário), conversa casual, cumprimentos, opinião, mensagem pessoal ou comentário sem pergunta objetiva. ' +
  'SIM se for: pergunta de quiz com resposta objetiva — com ou sem alternativas A B C (discursiva/aberta também conta: qual/quem/onde, cite, complete, verdadeiro/falso, cálculo, bíblia).';

const MSG_TRUNCATE = 600;

/**
 * @param {ReadonlyArray<{id: string, author: string, isLeader: boolean, text: string}>} entries
 * @param {{ text: string, author: string, messageId: string, isLeader?: boolean }} current
 */
export function buildClassifyUserPrompt(entries, current) {
  const lines = [];
  let hasCurrent = false;

  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const isLast = e.id === current.messageId;
    if (isLast) hasCurrent = true;
    const tag = isLast ? '[ÚLTIMA]' : `[${i + 1}]`;
    const role = e.isLeader ? 'Líder' : 'Participante';
    const body = isLast ? current.text : e.text;
    lines.push(`${tag} ${role} ${e.author}: ${truncate(body, MSG_TRUNCATE)}`);
  }

  if (!hasCurrent) {
    const role = current.isLeader ? 'Líder' : 'Participante';
    lines.push(`[ÚLTIMA] ${role} ${current.author}: ${truncate(current.text, MSG_TRUNCATE)}`);
  }

  return (
    'Histórico recente do grupo:\n\n' +
    lines.join('\n\n') +
    '\n\nA mensagem [ÚLTIMA] é uma pergunta da gincana que o bot deve responder?'
  );
}

/** @param {string} raw */
export function parseClassifyAnswer(raw) {
  const t = (raw || '').trim().toUpperCase();
  if (!t) return { isGincana: false, label: 'resposta vazia' };
  if (/^SIM\b/.test(t) || t === 'S' || t === 'YES') return { isGincana: true, label: t };
  if (/^NAO\b/.test(t) || /^NÃO\b/.test(t) || t === 'N' || t === 'NO') {
    return { isGincana: false, label: t };
  }
  if (/\bNAO\b/.test(t) || /\bNÃO\b/.test(t)) return { isGincana: false, label: t };
  if (/\bSIM\b/.test(t)) return { isGincana: true, label: t };
  return { isGincana: false, label: t };
}
