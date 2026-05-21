import { Router } from 'express';
import { logger } from '#platform/logger';
import { resetCooldown } from '#modules/cooldown';

const router = Router();

router.post('/cooldown/reset', (_req, res) => {
  resetCooldown();
  logger.info('[ui] cooldown resetado via dashboard');
  res.json({ ok: true });
});

export default router;
