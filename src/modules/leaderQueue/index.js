// ============================================================
//  modules/leaderQueue/index.js
//  Serializa o processamento por líder para que perguntas em
//  sequência não sejam descartadas pelo cooldown enquanto outra
//  ainda está na IA.
// ============================================================

/** @type {Map<string, Promise<void>>} */
const chains = new Map();

/**
 * Enfileira trabalho exclusivo por líder (FIFO).
 * @template T
 * @param {string} leaderId
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function runExclusive(leaderId, fn) {
  const key = leaderId || '_unknown';
  const prev = chains.get(key) ?? Promise.resolve();

  const run = prev
    .catch(() => {})
    .then(() => fn());

  chains.set(
    key,
    run.then(
      () => {},
      () => {}
    )
  );

  return run;
}

/** Limpa filas (testes / dashboard). */
export function clearLeaderQueue(leaderId) {
  if (leaderId) chains.delete(leaderId);
  else chains.clear();
}
