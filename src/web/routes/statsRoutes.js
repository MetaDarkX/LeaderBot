import { Router } from 'express';
import { statsService } from '#modules/stats';

const router = Router();

router.post('/stats/reset', (_req, res) => {
  statsService.reset();
  res.json({ ok: true });
});

export default router;
