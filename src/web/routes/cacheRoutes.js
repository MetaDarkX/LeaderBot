import { Router } from 'express';
import { logger } from '#platform/logger';
import { clearCache } from '#modules/cache';

const router = Router();

router.post('/cache/clear', async (_req, res) => {
  try {
    await clearCache();
    logger.info('[ui] cache limpo via dashboard');
    res.json({ ok: true });
  } catch (err) {
    logger.warn(`[ui] falha ao limpar cache: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
