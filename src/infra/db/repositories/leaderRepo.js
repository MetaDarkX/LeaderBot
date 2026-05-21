// ============================================================
//  infra/db/repositories/leaderRepo.js
//  Gerencia os líderes selecionados POR grupo.
// ============================================================

import { query } from '#infra/db/pool';

export async function addLeader({ groupId, phone, pushname }) {
  await query(
    `INSERT INTO group_leaders (group_id, phone, pushname)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, phone) DO UPDATE SET pushname = EXCLUDED.pushname`,
    [groupId, phone, pushname ?? null]
  );
}

export async function removeLeader({ groupId, phone }) {
  await query('DELETE FROM group_leaders WHERE group_id = $1 AND phone = $2', [groupId, phone]);
}

export async function listLeaders(groupId) {
  const r = await query(
    'SELECT phone, pushname, added_at FROM group_leaders WHERE group_id = $1 ORDER BY added_at ASC',
    [groupId]
  );
  return r.rows;
}

/** Retorna todos os líderes de todos os grupos, mapeados por groupId. */
export async function loadAllLeaders() {
  const r = await query('SELECT group_id, phone FROM group_leaders');
  const map = new Map();
  for (const row of r.rows) {
    if (!map.has(row.group_id)) map.set(row.group_id, new Set());
    map.get(row.group_id).add(row.phone);
  }
  return map;
}

export async function isLeaderOfGroup({ groupId, phone }) {
  const r = await query(
    'SELECT 1 FROM group_leaders WHERE group_id = $1 AND phone = $2 LIMIT 1',
    [groupId, phone]
  );
  return r.rowCount > 0;
}
