// ============================================================
//  infra/db/repositories/cacheRepo.js
//  Persistência do cache de respostas da IA.
//  Cada hit aqui é uma chamada de API economizada.
// ============================================================

import { query } from '#infra/db/pool';

export async function getCacheEntry(key) {
  const r = await query(
    `SELECT key, question, answer, provider, model, hits, expires_at
       FROM qa_cache
      WHERE key = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1`,
    [key]
  );
  return r.rows[0] || null;
}

export async function upsertCacheEntry({ key, question, answer, provider, model, ttlSeconds }) {
  await query(
    `INSERT INTO qa_cache (key, question, answer, provider, model, expires_at)
     VALUES ($1, $2, $3, $4, $5,
             CASE WHEN $6::int IS NULL THEN NULL
                  ELSE NOW() + ($6::int || ' seconds')::interval END)
     ON CONFLICT (key) DO UPDATE
        SET answer     = EXCLUDED.answer,
            provider   = EXCLUDED.provider,
            model      = EXCLUDED.model,
            expires_at = EXCLUDED.expires_at`,
    [key, question, answer, provider ?? null, model ?? null, ttlSeconds ?? null]
  );
}

export async function bumpCacheHit(key) {
  await query(
    `UPDATE qa_cache
        SET hits = hits + 1,
            last_hit_at = NOW()
      WHERE key = $1`,
    [key]
  );
}

export async function clearCacheTable() {
  await query('DELETE FROM qa_cache');
}

export async function cacheCounts() {
  const r = await query(
    `SELECT
        COUNT(*)::int                                        AS total,
        COALESCE(SUM(hits), 0)::int                          AS total_hits,
        COUNT(*) FILTER (WHERE expires_at < NOW())::int      AS expired
       FROM qa_cache`
  );
  return r.rows[0] || { total: 0, total_hits: 0, expired: 0 };
}
