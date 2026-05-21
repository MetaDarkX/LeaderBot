import { Router } from 'express';
import { stateService } from '#modules/state';
import { statsService } from '#modules/stats';
import { historyService } from '#modules/history';
import { activityService } from '#modules/activity';
import { cacheStats } from '#modules/cache';

const router = Router();

router.get('/state', (_req, res) => {
  res.json({
    state: stateService.snapshot(),
    stats: statsService.snapshot(),
    cache: cacheStats(),
    history: historyService.list(),
    activity: activityService.list(),
  });
});

export default router;
