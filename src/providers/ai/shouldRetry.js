// ============================================================
//  providers/ai/shouldRetry.js
//  Predicate para decidir se vale a pena retentar uma chamada
//  ao provedor de IA. Erros 4xx (exceto 429) são definitivos.
// ============================================================

const RETRYABLE_NODE_ERRORS = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
]);

export function shouldRetry(err) {
  const status = err?.status ?? err?.response?.status ?? err?.code;

  // Sem status: provavelmente erro de rede ou timeout do nosso retry → retentar.
  if (status === undefined || status === null) return true;

  // Erros de rede do Node: códigos string.
  if (typeof status === 'string') return RETRYABLE_NODE_ERRORS.has(status);

  // HTTP: 429 (rate limit) e 5xx (server) são retryable.
  if (status === 429) return true;
  if (status >= 500) return true;

  // 4xx restantes (400 bad request, 401 unauth, 403 quota, 422 bloqueado) NÃO ajudam.
  return false;
}
