import { Router } from 'express';
import path from 'path';
import { upload, stageLocalMediaFile } from '../middleware/upload.js';
import { config } from '../config.js';
import { getAccountByPlatform } from '../services/accountService.js';
import { getTikTokConfigStatus, hasTikTokCredentials } from '../config.js';
import { runTikTokUploadFlow } from '../services/tiktok/tiktokReviewPublishService.js';
import { requireTikTokEnabled } from '../middleware/tiktokPaused.js';

const router = Router();

router.use(requireTikTokEnabled);

const PRIVACY_LEVELS = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
];

router.get('/status', async (_req, res) => {
  const tiktokConfig = getTikTokConfigStatus();
  const contentAccount = await getAccountByPlatform('tiktok');

  res.json({
    credentialsReady: tiktokConfig.ready,
    credentialsMessage: tiktokConfig.credentialsMessage,
    contentAccountConnected: Boolean(contentAccount),
    contentAccount: contentAccount
      ? {
          username: contentAccount.username,
          displayName: contentAccount.displayName,
          tokenExpiresAt: contentAccount.tokenExpiresAt,
          scopes: contentAccount.scopes,
        }
      : null,
    requiredScopes: config.tiktok.contentScopes,
    privacyLevels: PRIVACY_LEVELS,
    activeRedirectUris: tiktokConfig.activeRedirectUris,
  });
});

router.post('/direct-post', upload.single('video'), async (req, res) => {
  try {
    if (!hasTikTokCredentials()) {
      return res.status(503).json({
        error: 'Credenziali TikTok mancanti: configura TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET',
        steps: [],
      });
    }

    const { caption = '', privacyLevel = 'PUBLIC_TO_EVERYONE' } = req.body;
    let filePath = req.file ? path.join(config.uploadDir, req.file.filename) : null;

    if (!filePath && config.isDesktop && req.body.localMediaPath) {
      const staged = stageLocalMediaFile(req.body.localMediaPath);
      filePath = staged.mediaPath;
    }

    if (!filePath) {
      return res.status(400).json({ error: 'Seleziona un file video mp4/mov', steps: [] });
    }

    const result = await runTikTokUploadFlow({ filePath, caption, privacyLevel });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      steps: [{ step: 'error', status: 'error', message: err.message }],
    });
  }
});

export default router;
