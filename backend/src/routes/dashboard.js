import { Router } from 'express';
import { getDashboardStats } from '../services/postService.js';
import { getAllIntegrationsStatus } from '../services/integrationService.js';
import { getLastPublishEvent, clearLastPublishEvent } from '../services/desktopEvents.js';

const router = Router();

router.get('/stats', (_req, res) => {
  res.json({
    ...getDashboardStats(),
    integrations: getAllIntegrationsStatus(),
  });
});

router.get('/events', (_req, res) => {
  const event = getLastPublishEvent();
  if (event) clearLastPublishEvent();
  res.json({ event });
});

export default router;
