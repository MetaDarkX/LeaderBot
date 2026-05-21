// ============================================================
//  web/routes/index.js
//  Monta todos os routers da API em /api.
// ============================================================

import stateRoutes from '#web/routes/stateRoutes';
import activityRoutes from '#web/routes/activityRoutes';
import logsRoutes from '#web/routes/logsRoutes';
import configRoutes from '#web/routes/configRoutes';
import cacheRoutes from '#web/routes/cacheRoutes';
import cooldownRoutes from '#web/routes/cooldownRoutes';
import statsRoutes from '#web/routes/statsRoutes';
import aiRoutes from '#web/routes/aiRoutes';
import { createGroupsRoutes } from '#web/routes/groupsRoutes';

/**
 * @param {import('express').Express} app
 * @param {{ client?: import('whatsapp-web.js').Client }} deps
 */
export function registerApiRoutes(app, deps = {}) {
  const api = [
    stateRoutes,
    activityRoutes,
    logsRoutes,
    configRoutes,
    cacheRoutes,
    cooldownRoutes,
    statsRoutes,
    aiRoutes,
    createGroupsRoutes(deps),
  ];

  for (const router of api) {
    app.use('/api', router);
  }
}
