import { Router } from 'express';
import { requireSession } from '../middleware/sessionUser.js';
import { listBrands } from '../services/brandService.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', requireSession, async (_req, res) => {
  try {
    const brands = await listBrands();
    res.json({ brands });
  } catch (err) {
    logger.error('listBrands error', { error: err.message });
    res.status(500).json({ error: err.message || 'Errore caricamento brand' });
  }
});

export default router;
