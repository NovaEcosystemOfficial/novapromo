import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]);

const maxBytes = config.maxFileSizeMb * 1024 * 1024;

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error(`Tipo file non supportato: ${file.mimetype}`));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxBytes },
});

const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

/** Copy a local file into uploads (desktop Electron picker). */
export function stageLocalMediaFile(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error('File media non trovato sul disco');
  }

  const stats = fs.statSync(sourcePath);
  if (stats.size > maxBytes) {
    throw new Error(`File troppo grande (max ${config.maxFileSizeMb}MB)`);
  }

  const ext = path.extname(sourcePath).toLowerCase();
  const mimeType = EXT_MIME[ext];
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Tipo file non supportato: ${ext || 'sconosciuto'}`);
  }

  const filename = `${uuidv4()}${ext}`;
  const dest = path.join(config.uploadDir, filename);
  fs.copyFileSync(sourcePath, dest);

  return { mediaPath: dest, mediaMimeType: mimeType, filename };
}

export function validateContentTypeForPlatform(platform, contentType, mimeType) {
  const errors = [];

  const videoTypes = ['tiktok_video', 'reel', 'behind_scenes'];
  const igOnlyTypes = ['post', 'story'];

  if (platform === 'tiktok' && igOnlyTypes.includes(contentType)) {
    errors.push('Tipo non supportato su TikTok');
  }

  if (videoTypes.includes(contentType)) {
    if (mimeType && !mimeType.startsWith('video/')) {
      errors.push(`${contentType} richiede un file video`);
    }
  }

  if (contentType === 'post' && mimeType?.startsWith('video/')) {
    errors.push('I post Instagram immagine non accettano video (usa reel)');
  }

  if (platform === 'facebook' || platform === 'multi') {
    const fbTypes = ['post', 'annuncio', 'roadmap', 'behind_scenes'];
    if (!fbTypes.includes(contentType)) {
      errors.push('Facebook supporta solo post con immagine in questa release');
    }
    if (mimeType && !mimeType.startsWith('image/')) {
      errors.push('Facebook Page richiede un\'immagine (JPEG, PNG o WebP)');
    }
  }

  if (platform === 'multi' && contentType === 'story') {
    errors.push('Le storie non sono supportate in pubblicazione multi (Instagram + Facebook)');
  }

  return errors;
}
