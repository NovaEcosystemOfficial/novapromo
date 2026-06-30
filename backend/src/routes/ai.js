import { Router } from 'express';
import { requireSession } from '../middleware/sessionUser.js';
import { isOpenAIConfigured } from '../services/openaiService.js';
import {
  generateCaption,
  generateHashtags,
  generateContentPack,
  transformContent,
  generateCta,
  generateReelIdea,
  generateCarouselIdea,
} from '../services/aiStudioService.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(requireSession);

function aiHandler(handler) {
  return async (req, res) => {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({
        error: 'AI non configurata',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    try {
      const { brandId, ...input } = req.body || {};
      const result = await handler(req.sessionUser.docId, input, brandId);
      res.json(result);
    } catch (err) {
      logger.error('AI endpoint error', { code: err.code, type: req.path });
      res.status(err.status || 500).json({
        error: err.message,
        code: err.code || 'AI_ERROR',
        details: err.details || undefined,
      });
    }
  };
}

router.post('/generate-caption', aiHandler(generateCaption));
router.post('/generate-hashtags', aiHandler(generateHashtags));
router.post('/generate-cta', aiHandler(generateCta));
router.post('/generate-reel-idea', aiHandler(generateReelIdea));
router.post('/generate-carousel-idea', aiHandler(generateCarouselIdea));
router.post('/generate-content-pack', aiHandler(generateContentPack));
router.post('/transform-content', aiHandler(transformContent));

router.get('/status', async (req, res) => {
  res.json({
    configured: isOpenAIConfigured(),
    model: isOpenAIConfigured() ? process.env.OPENAI_MODEL || 'gpt-4o-mini' : null,
  });
});

export default router;
