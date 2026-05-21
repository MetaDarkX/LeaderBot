import { Router } from 'express';
import { activityService } from '#modules/activity';

const router = Router();

router.get('/activity', (_req, res) => res.json(activityService.list()));

router.post('/activity/clear', (_req, res) => {
  activityService.clear();
  res.json({ ok: true });
});

export default router;
