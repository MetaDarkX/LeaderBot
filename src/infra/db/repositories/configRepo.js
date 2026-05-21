// ============================================================
//  infra/db/repositories/configRepo.js
//  Persistência da runtimeConfig (chave/valor JSONB).
// ============================================================

import { query } from '#infra/db/pool';

const KEY = 'runtime';

export async function loadRuntimeConfig() {
  const r = await query('SELECT value FROM bot_config WHERE key = $1', [KEY]);
  return r.rows[0]?.value ?? null;
}

export async function saveRuntimeConfig(value) {
  await query(
    `INSERT INTO bot_config (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [KEY, JSON.stringify(value)]
  );
}
