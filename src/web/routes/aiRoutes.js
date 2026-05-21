import { Router } from 'express';
import { askAI } from '#providers/ai';

const router = Router();

router.post('/ai/test', async (req, res) => {
  const question = (req.body?.question || '').toString().trim();
  if (!question) return res.status(400).json({ error: 'question is required' });
  const t0 = Date.now();
  try {
    const { answer, provider, fallback } = await askAI(question);
    res.json({ answer, provider, fallback, elapsedMs: Date.now() - t0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
