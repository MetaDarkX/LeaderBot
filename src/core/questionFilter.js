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

// Chat do grupo / organização da gincana — não é pergunta de conhecimento.
const CONVERSATIONAL_REGEX = [
  /\bvcs?\s+(quer(em|ia|iam|es)|ach(am|a|o)|prefir(em|e|o)|topa(m)?|concord(am|o|a))\b/i,
  /\bvoc[eê]s?\s+(quer(em|ia|iam|es)|ach(am|a|o)|prefir(em|e|o)|topa(m)?|concord(am|o|a))\b/i,
  /\bquer(em|ia|iam)\s+\d*\s*perguntas?\b/i,
  /\b(n[aã]o\s+tem|sem)\s+presen[cç]a\b/i,
  /\bpresen[cç]a\s+(hoje|hj|amanh[aã])\b/i,
  /\b(faltou|falta)\s+(gente|presen[cç]a|pessoas?)\b/i,
  /\btudo\s+bem\b/i,
  /\bpode\s+ser\b/i,
  /\b(vamos|bora)\s+(fazer|come[cç]ar|continuar|seguir|parar)\b/i,
  /\bcombinado\b/i,
  /\b(e\s+a[ií]|beleza|blz)\s*[?!.]?\s*$/i,
  /\bquem\s+vai\s+(liderar|apresentar|moderar|conduzir)\b/i,
  /\b(algu[eé]m\s+pode|quem\s+pode)\b/i,
  /\b(galera|pessoal|turma)\b.*\?\s*$/i,
  /\b(vcs|voc[eê]s)\s+(podem|conseguem)\b/i,
];

// Confirmações / validações — não são pergunta de conhecimento.
const CONFIRMATION_REGEX = [
  /^(confirmad[oa]s?|certo|ok|okay|beleza|blz|combinado|fechad[oa]|fechou|entendido|entendeu|entende|t[aá]\s*bom|t[aá]\s*ok|tudo\s+(certo|ok|bem)|de\s+acordo|pode\s+ser|serve|funciona|topa|bora|sim|n[aã]o|isso|sacou|fechamos|concordam|concorda)[\s,!.]*\??\s*$/i,
  /\b(confirmad[oa]s?|t[aá]\s+certo|t[aá]\s+bom|de\s+acordo|pode\s+ser|tudo\s+certo|est[aá]\s+certo|ficou\s+cert[oa])\s*\?\s*$/i,
  /\b(n[eé]|ne)\s*\?\s*$/i,
  /\b(entendeu|entende|sacou)\s*\?\s*$/i,
  /\b(est[aá]|ficou)\s+(confirmad[oa]|certo|ok)\b/i,
  /\b(posso|podemos)\s+(mandar|enviar|come[cç]ar|seguir|continuar)\b/i,
  /\bmando\s+(assim|dessa\s+forma)\b/i,
  /\b(est[aá]\s+)?(certo|ok|beleza)\s*(ent[aã]o|n[eé])?\s*\?\s*$/i,
];

// Sinais de pergunta objetiva (bíblica, geral, múltipla escolha).
const KNOWLEDGE_REGEX = [
  /\b(qual|quem|onde|quando|quanto|quantos|quantas|o\s+que)\b/i,
  /\bque\s+(evento|nome|pa[ií]s|cidade|livro|profeta|animal|planta|rio|monte|significa|ano)\b/i,
  /\b(cite|identifique|assinale|marque|escolha|indique|nomeie)\b/i,
  /\b(alternativas?|pergunta\s+rel[aâ]mpago)\b/i,
  /\b[A-F]\)\s/m,
  /\b(segundo|conforme|de\s+acordo\s+com)\b/i,
  /\b(livro|cap[ií]tulo|vers[ií]culo|b[ií]blia|apocalipse|daniel|mateus|ezequiel|genesis|ex[oô]do|lev[ií]tico)\b/i,
  /\bcomo\s+(se\s+chama|é\s+que|foi|funciona|aconteceu|surge|surgiu|chama)\b/i,
  /\b(verdadeiro|falso)\b/i,
  /\d+\s*[\+\-\*x×÷]\s*\d+/,
];

function isConversational(text) {
  return CONVERSATIONAL_REGEX.some((re) => re.test(text));
}

function isConfirmation(text) {
  return CONFIRMATION_REGEX.some((re) => re.test(text));
}

function isKnowledgeQuestion(text) {
  return KNOWLEDGE_REGEX.some((re) => re.test(text));
}

export function looksLikeQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 4) return false;
  if (NOISE_REGEX.test(t)) return false;
  // Mínimo de 2 "palavras" para evitar mandar tokens isolados pra IA.
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  if (!t.includes('?')) return false;
  if (isConversational(t)) return false;
  if (isConfirmation(t)) return false;
  if (!isKnowledgeQuestion(t)) return false;
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
  const t = text.trim();
  if (!t.includes('?')) {
    return { ok: false, reason: 'sem ponto de interrogação' };
  }
  if (isConversational(t)) {
    return { ok: false, reason: 'mensagem pessoal ou de organização' };
  }
  if (isConfirmation(t)) {
    return { ok: false, reason: 'mensagem de confirmação' };
  }
  if (!isKnowledgeQuestion(t)) {
    return { ok: false, reason: 'não é pergunta de conhecimento' };
  }
  if (!looksLikeQuestion(text)) {
    return { ok: false, reason: 'não parece pergunta' };
  }
  return { ok: true };
}
