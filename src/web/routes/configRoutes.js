import { Router } from 'express';
import { logger } from '#platform/logger';
import { stateService } from '#modules/state';

const router = Router();

router.post('/pause', (req, res) => {
  const paused = stateService.togglePaused(req.body?.paused);
  logger.warn(`[ui] bot ${paused ? 'PAUSADO' : 'RETOMADO'} via dashboard`);
  res.json({ paused });
});

router.post('/config', (req, res) => {
  const patch = req.body || {};
  const clean = {};
  if (Array.isArray(patch.allowedGroups)) {
    clean.allowedGroups = patch.allowedGroups.map(String).filter(Boolean);
  }
  if (Number.isFinite(patch.cooldownMs)) clean.cooldownMs = Math.max(0, patch.cooldownMs);
  if (Number.isFinite(patch.maxQuestionLength)) {
    clean.maxQuestionLength = Math.max(1, patch.maxQuestionLength);
  }
  if (typeof patch.fallbackAnswer === 'string') clean.fallbackAnswer = patch.fallbackAnswer;

  stateService.patchRuntimeConfig(clean);
  logger.info(`[ui] config atualizada: ${Object.keys(clean).join(', ') || '(nada)'}`);
  res.json(stateService.runtime);
});

export default router;
