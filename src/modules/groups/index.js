// ============================================================
//  modules/groups/index.js
//  Ponte entre o whatsapp-web.js e o banco de dados:
//    - sincroniza grupos / participantes
//    - mantém um cache em memória dos líderes por grupo
//      (alimentado pelo DB) para o pipeline decidir
//      rapidamente se a mensagem é de um líder.
// ============================================================

import { EventEmitter } from 'node:events';

import { logger } from '#platform/logger';
import { normalizePhone } from '#core/normalize';
import {
  upsertGroup,
  listGroups,
  setGroupAllowed,
  replaceParticipants,
  listParticipants,
  touchGroup,
} from '#infra/db/repositories/groupRepo';
import {
  addLeader,
  removeLeader,
  listLeaders,
  loadAllLeaders,
} from '#infra/db/repositories/leaderRepo';
import { isReady as dbReady } from '#infra/db';

class GroupService extends EventEmitter {
  constructor() {
    super();
    /** groupId -> Set<phone> (somente dígitos). */
    this.leadersByGroup = new Map();
  }

  /** Carrega o cache de líderes a partir do DB. */
  async refreshLeadersCache() {
    if (!dbReady()) return;
    this.leadersByGroup = await loadAllLeaders();
    this.emit('leaders:change');
  }

  /** Conjunto de líderes (phones) de um grupo (somente do cache). */
  leadersOfGroup(groupId) {
    return this.leadersByGroup.get(groupId) || new Set();
  }

  /** Atalho síncrono usado no pipeline. */
  isLeaderOfGroup(groupId, phone) {
    const set = this.leadersByGroup.get(groupId);
    if (!set) return false;
    return set.has(normalizePhone(phone));
  }

  // ── Sincronização com o WhatsApp ────────────────────────

  /**
   * Lê todos os grupos do cliente WPP e faz upsert no DB.
   * Não baixa participantes (chamada mais leve, usada no `ready`).
   */
  async syncAllGroups(client) {
    if (!dbReady() || !client?.info) return [];
    try {
      const chats = await client.getChats();
      const groups = chats.filter((c) => c.isGroup);
      for (const g of groups) {
        await touchGroup({
          id: g.id._serialized,
          name: g.name,
          participantsCount: g.participants?.length ?? 0,
        });
      }
      logger.info(`[groups] ${groups.length} grupos sincronizados com o banco`);
      return groups;
    } catch (err) {
      logger.warn(`[groups] erro ao sincronizar grupos: ${err.message}`);
      return [];
    }
  }

  /**
   * Sincroniza os participantes de UM grupo. Retorna a lista persistida.
   * Tenta enriquecer cada participante com o pushname via getContactById.
   */
  async syncParticipants(client, groupId) {
    if (!client) throw new Error('client não disponível');
    const chat = await client.getChatById(groupId);
    if (!chat?.isGroup) throw new Error('chat não é grupo');

    const participants = chat.participants || [];
    const enriched = await Promise.all(
      participants.map(async (p) => {
        const waId = p.id?._serialized || `${p.id?.user}@c.us`;
        const phone = normalizePhone(p.id?.user || waId.split('@')[0]);
        let pushname = null;
        let displayName = null;
        try {
          const contact = await client.getContactById(waId);
          pushname = contact?.pushname || contact?.name || null;
          displayName = contact?.name || contact?.shortName || pushname || null;
        } catch {
          // sem detalhes — segue com o número apenas
        }
        return {
          phone,
          waId,
          pushname,
          displayName,
          isAdmin: !!(p.isAdmin || p.isSuperAdmin),
        };
      })
    );

    await upsertGroup({
      id: groupId,
      name: chat.name,
      participantsCount: enriched.length,
    });
    await replaceParticipants(groupId, enriched);

    logger.info(`[groups] ${enriched.length} participantes sincronizados em "${chat.name}"`);
    return listParticipants(groupId);
  }

  // ── API usada pela dashboard ────────────────────────────

  async listGroups() {
    if (!dbReady()) return [];
    return listGroups();
  }

  async listParticipants(groupId) {
    if (!dbReady()) return [];
    return listParticipants(groupId);
  }

  async listLeaders(groupId) {
    if (!dbReady()) return [];
    return listLeaders(groupId);
  }

  async setGroupAllowed(groupId, allowed) {
    if (!dbReady()) return;
    await setGroupAllowed(groupId, allowed);
  }

  async addLeader({ groupId, phone, pushname }) {
    const clean = normalizePhone(phone);
    if (!clean) throw new Error('telefone inválido');
    await addLeader({ groupId, phone: clean, pushname });
    await this.refreshLeadersCache();
    this.emit('leader:added', { groupId, phone: clean });
  }

  async removeLeader({ groupId, phone }) {
    const clean = normalizePhone(phone);
    if (!clean) throw new Error('telefone inválido');
    await removeLeader({ groupId, phone: clean });
    await this.refreshLeadersCache();
    this.emit('leader:removed', { groupId, phone: clean });
  }
}

export const groupService = new GroupService();
