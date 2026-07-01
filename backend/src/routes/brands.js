import { Router } from 'express';
import path from 'path';
import { requireAuth } from '../middleware/requireAuth.js';
import { upload } from '../middleware/upload.js';
import {
  getBrandProfile,
  saveBrandProfile,
  addBrandLibraryAsset,
} from '../services/brand/brandService.js';
import { LIBRARY_CATEGORIES, resolveBrandToneForGenerator } from '../services/brand/brandSchema.js';
import { persistUploadedMedia } from '../services/media/publicMediaService.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await getBrandProfile(req.ownerUid);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const profile = await saveBrandProfile(req.ownerUid, req.body);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai-context', requireAuth, async (req, res) => {
  try {
    const profile = await getBrandProfile(req.ownerUid);
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

router.post('/library/:category', requireAuth, upload.single('file'), async (req, res) => {
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

    const profile = await addBrandLibraryAsset(req.ownerUid, category, asset);
    res.status(201).json({ asset, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
