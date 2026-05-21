import { Router } from 'express';
import { logger } from '#platform/logger';

const router = Router();

router.get('/logs', (_req, res) => {
  res.json(logger.buffer());
});

export default router;
