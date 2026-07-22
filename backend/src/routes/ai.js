import { Router } from 'express';
import { requireSession } from '../middleware/sessionUser.js';
import { isOpenAIConfigured, getOpenAIClientInfo } from '../services/openaiService.js';
import {
  generateCaption,
  generateHashtags,
  generateContentPack,
  transformContent,
  generateCta,
  generateReelIdea,
  generateCarouselIdea,
} from '../services/aiStudioService.js';
import { generateCreativePack } from '../services/creativeStudioService.js';
import { generateCreativePackV2 } from '../services/creative-engine-v2/index.js';
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

router.post('/creative-pack', async (req, res) => {
  if (!isOpenAIConfigured()) {
    return res.status(503).json({
      error: 'AI non configurata — aggiungi OPENAI_API_KEY al backend Vercel',
      code: 'AI_NOT_CONFIGURED',
    });
  }

  try {
    const body = req.body || {};
    // Creative Engine (ex V2) is the definitive studio engine.
    // Opt out only with explicit engine: 'v1' / useCreativeEngineV2: false (legacy).
    const forceV1 = body.engine === 'v1' || body.useCreativeEngineV2 === false;
    const useV2 = !forceV1;
    const result = useV2
      ? await generateCreativePackV2(req.sessionUser.docId, body)
      : await generateCreativePack(req.sessionUser.docId, body);
    res.json(result);
  } catch (err) {
    logger.error('Creative pack error', {
      code: err.code,
      user: req.sessionUser?.docId,
      engine: (req.body?.engine === 'v1' || req.body?.useCreativeEngineV2 === false) ? 'v1' : 'v2',
    });
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code || 'CREATIVE_STUDIO_ERROR',
      details: err.details || undefined,
    });
  }
});

router.get('/status', async (_req, res) => {
  const info = isOpenAIConfigured() ? getOpenAIClientInfo() : null;
  res.json({
    configured: isOpenAIConfigured(),
    model: info?.model ?? null,
    imageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    api: info?.api ?? null,
    supportsTemperature: info?.supportsTemperature ?? null,
    reasoningEffort: info?.reasoningEffort ?? null,
    creativeStudio: true,
  });
});

export default router;
