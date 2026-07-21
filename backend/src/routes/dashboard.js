import { Router } from 'express';
import { getDashboardStats } from '../services/postService.js';
import { getAllIntegrationsStatus } from '../services/integrationService.js';
import { getLastPublishEvent, clearLastPublishEvent } from '../services/desktopEvents.js';
import { requireSession } from '../middleware/sessionUser.js';

const router = Router();

router.use(requireSession);

router.get('/stats', async (_req, res) => {
  res.json({
    ...(await getDashboardStats()),
    integrations: await getAllIntegrationsStatus(),
  });
});

router.get('/events', (_req, res) => {
  const event = getLastPublishEvent();
  if (event) clearLastPublishEvent();
  res.json({ event });
});

export default router;
