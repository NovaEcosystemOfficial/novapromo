import { Router } from 'express';
import { config } from '../config.js';
import { runDuePublishes } from '../services/schedulerRunner.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Vercel Cron sends GET with Authorization: Bearer <CRON_SECRET>.
 * Also accepts POST for manual ops.
 */
function authorizeCron(req, res) {
  const secret = config.cronSecret;
  if (!secret) {
    if (config.isVercel) {
      logger.error('[scheduler] CRON_SECRET non configurato — rifiuto richiesta cron');
      res.status(503).json({ error: 'CRON_SECRET non configurato', code: 'CRON_SECRET_MISSING' });
      return false;
    }
    // Local/dev without secret: allow for testing
    return true;
  }

  const header = req.headers.authorization || '';
  const expected = `Bearer ${secret}`;
  if (header !== expected) {
    logger.warn('[scheduler] Cron unauthorized', {
      hasAuth: Boolean(header),
      path: req.path,
    });
    res.status(401).json({ error: 'Non autorizzato', code: 'CRON_UNAUTHORIZED' });
    return false;
  }
  return true;
}

async function handlePublishDue(req, res) {
  if (!authorizeCron(req, res)) return;

  try {
    logger.info('[scheduler:cron_hit] Cron endpoint invoked', {
      method: req.method,
      source: 'vercel-cron',
    });
    const result = await runDuePublishes({ source: 'vercel-cron' });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('[scheduler:cron_error] Cron publish-due failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

router.get('/publish-due', handlePublishDue);
router.post('/publish-due', handlePublishDue);

export default router;
