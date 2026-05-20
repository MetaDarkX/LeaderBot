// ============================================================
//  db/repositories/historyRepo.js
//  Persistência do histórico de Q/A.
// ============================================================

import { query } from '../index.js';

export async function insertHistory(entry) {
  const r = await query(
    `INSERT INTO qa_history
       (group_id, group_name, leader_phone, question, answer, source, elapsed_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, created_at`,
    [
      entry.groupId ?? null,
      entry.groupName ?? null,
      entry.leaderPhone ?? null,
      entry.question,
      entry.answer,
      entry.source,
      entry.elapsedMs ?? 0,
    ]
  );
  return r.rows[0];
}

export async function listHistory({ limit = 100 } = {}) {
  const r = await query(
    `SELECT id, group_id, group_name, leader_phone, question, answer, source, elapsed_ms, created_at
     FROM qa_history
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return r.rows;
}

export async function clearHistory() {
  await query('TRUNCATE qa_history RESTART IDENTITY');
}
