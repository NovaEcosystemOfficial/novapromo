import { Router } from 'express';
import path from 'path';
import { requireSession } from '../middleware/sessionUser.js';
import { listBrands } from '../services/brandService.js';
import { upload } from '../middleware/upload.js';
import {
  getBrandProfile,
  saveBrandProfile,
  addBrandLibraryAsset,
} from '../services/brand/brandService.js';
import { LIBRARY_CATEGORIES, resolveBrandToneForGenerator } from '../services/brand/brandSchema.js';
import { persistUploadedMedia } from '../services/media/publicMediaService.js';
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

router.get('/me', requireSession, async (req, res) => {
  try {
    const profile = await getBrandProfile(req.sessionUser.uid);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', requireSession, async (req, res) => {
  try {
    const profile = await saveBrandProfile(req.sessionUser.uid, req.body);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai-context', requireSession, async (req, res) => {
  try {
    const profile = await getBrandProfile(req.sessionUser.uid);
    res.json({
      hasProfile: Boolean(profile.identity?.companyName || profile.toneOfVoice?.length),
      completionPercent: profile.completionPercent,
      toneOfVoice: profile.toneOfVoice,
      preferredCtas: profile.preferredCtas,
      hashtags: profile.words?.hashtags || [],
      generatorTone: resolveBrandToneForGenerator(profile.toneOfVoice),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/library/:category', requireSession, upload.single('file'), async (req, res) => {
  try {
    const { category } = req.params;
    if (!LIBRARY_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Categoria libreria non valida' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File richiesto' });
    }

    const url = await persistUploadedMedia(req.file);
    const asset = {
      id: path.basename(req.file.filename),
      name: req.file.originalname,
      url,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    const profile = await addBrandLibraryAsset(req.sessionUser.uid, category, asset);
    res.status(201).json({ asset, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
