import { Router } from 'express';
import { logger } from '#platform/logger';
import { stateService } from '#modules/state';
import { groupService } from '#modules/groups';
import { normalizePhone } from '#pipeline/filters';
import { isReady as dbReady } from '#infra/db';

/**
 * Rotas de grupos, participantes e líderes.
 * @param {{ client?: import('whatsapp-web.js').Client }} deps
 */
export function createGroupsRoutes({ client } = {}) {
  const router = Router();

  // `/api/groups` lê do Postgres por padrão (rápido). `?refresh=1` força um
  // sync com o WhatsApp via Puppeteer (lento — só quando o usuário pede).
  router.get('/groups', async (req, res) => {
    try {
      const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
      const allowed = stateService.runtime.allowedGroups;
      const allowAll = allowed.length === 0;

      if (refresh && client?.info) {
        await groupService.syncAllGroups(client);
      }

      if (dbReady()) {
        const dbGroups = await groupService.listGroups();
        if (!dbGroups.length && client?.info && !refresh) {
          groupService.syncAllGroups(client).catch((err) =>
            logger.warn(`[api] sync inicial: ${err.message}`)
          );
        }
        const groups = dbGroups.map((g) => ({
          id: g.id,
          name: g.name,
          participants: g.participants_count ?? 0,
          allowed: allowAll ? true : allowed.includes(g.id),
          leaderCount: groupService.leadersOfGroup(g.id).size,
        }));
        return res.json({ groups, source: 'db' });
      }

      if (!client?.info) return res.json({ groups: [] });
      const chats = await client.getChats();
      const groups = chats
        .filter((c) => c.isGroup)
        .map((c) => {
          const id = c.id._serialized;
          return {
            id,
            name: c.name,
            participants: c.participants?.length ?? 0,
            allowed: allowAll ? true : allowed.includes(id),
            leaderCount: groupService.leadersOfGroup(id).size,
          };
        });
      res.json({ groups, source: 'client' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/groups/:id/participants', async (req, res) => {
    const groupId = decodeURIComponent(req.params.id);
    try {
      if (!dbReady()) return res.status(503).json({ error: 'db indisponível' });
      const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
      if (refresh) {
        if (!client?.info) return res.status(503).json({ error: 'whatsapp não conectado' });
        await groupService.syncParticipants(client, groupId);
      }
      const [participants, leaders] = await Promise.all([
        groupService.listParticipants(groupId),
        groupService.listLeaders(groupId),
      ]);
      res.json({ groupId, participants, leaders });
    } catch (err) {
      logger.warn(`[api] /groups/${groupId}/participants: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/groups/:id/leaders', async (req, res) => {
    const groupId = decodeURIComponent(req.params.id);
    try {
      if (!dbReady()) return res.status(503).json({ error: 'db indisponível' });
      const leaders = await groupService.listLeaders(groupId);
      res.json({ groupId, leaders });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/groups/:id/leaders', async (req, res) => {
    const groupId = decodeURIComponent(req.params.id);
    const phone = normalizePhone(req.body?.phone || '');
    const pushname = req.body?.pushname ?? null;
    if (!phone) return res.status(400).json({ error: 'phone obrigatório' });
    try {
      await groupService.addLeader({ groupId, phone, pushname });
      logger.info(`[ui] líder adicionado em ${groupId}: ${phone}`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/groups/:id/leaders/:phone', async (req, res) => {
    const groupId = decodeURIComponent(req.params.id);
    const phone = normalizePhone(req.params.phone);
    try {
      await groupService.removeLeader({ groupId, phone });
      logger.info(`[ui] líder removido de ${groupId}: ${phone}`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
