// ============================================================
//  db/repositories/groupRepo.js
//  CRUD básico de grupos e participantes.
// ============================================================

import { query, withTransaction } from '../index.js';

/** Cria/atualiza um grupo (upsert). */
export async function upsertGroup({ id, name, participantsCount, allowed }) {
  await query(
    `INSERT INTO groups (id, name, participants_count, allowed, last_seen_at)
     VALUES ($1, $2, $3, COALESCE($4, FALSE), NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       participants_count = EXCLUDED.participants_count,
       allowed = COALESCE($4, groups.allowed),
       last_seen_at = NOW()`,
    [id, name ?? '', participantsCount ?? 0, allowed ?? null]
  );
}

export async function getGroup(id) {
  const r = await query('SELECT * FROM groups WHERE id = $1', [id]);
  return r.rows[0] || null;
}

export async function listGroups() {
  const r = await query('SELECT * FROM groups ORDER BY last_seen_at DESC');
  return r.rows;
}

export async function setGroupAllowed(id, allowed) {
  await query('UPDATE groups SET allowed = $2 WHERE id = $1', [id, !!allowed]);
}

/**
 * Substitui o conjunto de participantes de um grupo (atômico).
 * Participantes que não vierem na lista são removidos.
 */
export async function replaceParticipants(groupId, participants) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM group_participants WHERE group_id = $1', [groupId]);
    for (const p of participants) {
      await client.query(
        `INSERT INTO group_participants
           (group_id, phone, wa_id, pushname, display_name, is_admin, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, FALSE), NOW())
         ON CONFLICT (group_id, phone) DO UPDATE SET
           wa_id = EXCLUDED.wa_id,
           pushname = EXCLUDED.pushname,
           display_name = EXCLUDED.display_name,
           is_admin = EXCLUDED.is_admin,
           last_seen_at = NOW()`,
        [
          groupId,
          p.phone,
          p.waId ?? null,
          p.pushname ?? null,
          p.displayName ?? null,
          !!p.isAdmin,
        ]
      );
    }
  });
}

export async function listParticipants(groupId) {
  const r = await query(
    `SELECT gp.*, EXISTS(
        SELECT 1 FROM group_leaders gl
        WHERE gl.group_id = gp.group_id AND gl.phone = gp.phone
     ) AS is_leader
     FROM group_participants gp
     WHERE gp.group_id = $1
     ORDER BY gp.is_admin DESC, COALESCE(gp.display_name, gp.pushname, gp.phone) ASC`,
    [groupId]
  );
  return r.rows;
}

/** Apenas registra que o grupo foi visto (sem mexer na lista de allowed). */
export async function touchGroup({ id, name, participantsCount }) {
  await query(
    `INSERT INTO groups (id, name, participants_count, last_seen_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = COALESCE(NULLIF(EXCLUDED.name, ''), groups.name),
       participants_count = EXCLUDED.participants_count,
       last_seen_at = NOW()`,
    [id, name ?? '', participantsCount ?? 0]
  );
}
