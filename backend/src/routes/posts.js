import { Router } from 'express';
import {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  listPublicationLogs,
} from '../services/postService.js';
import { publishPost } from '../services/publisherService.js';
import { upload, validateContentTypeForPlatform, stageLocalMediaFile } from '../middleware/upload.js';
import { config } from '../config.js';
import path from 'path';
import { generateContent } from '../services/contentGeneratorService.js';
import { persistUploadedMedia } from '../services/media/publicMediaService.js';

const router = Router();

router.get('/', (req, res) => {
  const posts = listPosts({
    status: req.query.status,
    platform: req.query.platform,
    from: req.query.from,
    to: req.query.to,
  });
  res.json(posts);
});

router.get('/logs', (req, res) => {
  res.json(listPublicationLogs({ postId: req.query.postId, limit: parseInt(req.query.limit || '100', 10) }));
});

router.post('/generate', (req, res) => {
  try {
    const { project, platform, contentType, tone, topic } = req.body;
    if (!project || !platform || !contentType || !tone) {
      return res.status(400).json({ error: 'Campi obbligatori: project, platform, contentType, tone' });
    }
    res.json(generateContent({ project, platform, contentType, tone, topic }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create', (req, res) => {
  try {
    const {
      project, platform, contentType, tone, topic,
      caption, hashtags, cta, reelIdea, overlayTitle, scheduledAt,
    } = req.body;

    if (!project || !platform || !contentType || !tone) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    const post = createPost({
      project, platform, contentType, tone, topic,
      caption, hashtags, cta, reelIdea, overlayTitle, scheduledAt,
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const post = getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post non trovato' });
  res.json(post);
});

router.post('/draft', upload.single('media'), async (req, res) => {
  try {
    const { project, platform, contentType, tone, caption, hashtags, scheduledAt, topic, cta, reelIdea, overlayTitle } = req.body;

    if (!project || !platform || !contentType || !tone) {
      return res.status(400).json({ error: 'Campi obbligatori: project, platform, contentType, tone' });
    }

    let mediaPath = req.file ? path.join(config.uploadDir, req.file.filename) : null;
    let mediaMimeType = req.file?.mimetype;
    let mediaPublicUrl = null;

    if (!mediaPath && config.isDesktop && req.body.localMediaPath) {
      const staged = stageLocalMediaFile(req.body.localMediaPath);
      mediaPath = staged.mediaPath;
      mediaMimeType = staged.mediaMimeType;
    }

    if (req.file) {
      mediaPublicUrl = await persistUploadedMedia(req.file);
    } else if (mediaPath) {
      mediaPublicUrl = await persistUploadedMedia({
        path: mediaPath,
        filename: path.basename(mediaPath),
        mimetype: mediaMimeType,
      });
    }

    const validationErrors = validateContentTypeForPlatform(platform, contentType, mediaMimeType);
    if (validationErrors.length) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    const post = createPost({
      project,
      platform,
      contentType,
      tone,
      topic,
      caption,
      hashtags,
      cta,
      reelIdea,
      overlayTitle,
      mediaPath,
      mediaMimeType,
      mediaPublicUrl,
      scheduledAt: scheduledAt || null,
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', upload.single('media'), async (req, res) => {
  try {
    const existing = getPostById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Post non trovato' });

    const platform = req.body.platform || existing.platform;
    const contentType = req.body.contentType || existing.contentType;
    const mimeType = req.file?.mimetype || existing.mediaMimeType;

    const validationErrors = validateContentTypeForPlatform(platform, contentType, mimeType);
    if (validationErrors.length) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }

    let mediaPublicUrl;
    if (req.file) {
      mediaPublicUrl = await persistUploadedMedia(req.file);
    }

    const post = updatePost(req.params.id, {
      project: req.body.project,
      platform: req.body.platform,
      contentType: req.body.contentType,
      tone: req.body.tone,
      caption: req.body.caption,
      hashtags: req.body.hashtags,
      scheduledAt: req.body.scheduledAt !== undefined ? req.body.scheduledAt || null : undefined,
      mediaPath: req.file ? path.join(config.uploadDir, req.file.filename) : undefined,
      mediaMimeType: req.file?.mimetype,
      mediaPublicUrl,
      status: req.body.scheduledAt ? 'scheduled' : undefined,
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/schedule', (req, res) => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt richiesto' });

    const post = updatePost(req.params.id, { scheduledAt, status: 'scheduled' });
    if (!post) return res.status(404).json({ error: 'Post non trovato' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const post = getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });

    const result = await publishPost(post);
    const updated = getPostById(req.params.id);
    res.json({ post: updated, ...result });
  } catch (err) {
    const updated = getPostById(req.params.id);
    res.status(500).json({ error: err.message, post: updated });
  }
});

router.delete('/:id', (req, res) => {
  const result = deletePost(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Post non trovato' });
  res.json({ success: true });
});

export default router;
