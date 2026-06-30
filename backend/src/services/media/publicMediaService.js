import fs from 'fs';
import path from 'path';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { updatePost } from '../postService.js';
import {
  hasFirebaseStorage,
  useFirebaseDataStore,
  FIREBASE_STORAGE_NOT_CONFIGURED,
} from '../firebase/dataStore.js';
import {
  uploadMediaToFirebaseStorage,
  backfillLocalFileToFirebaseStorage,
} from '../firebase/storageService.js';

export const PUBLIC_MEDIA_ERROR =
  'Immagine non pubblicabile: serve URL HTTPS pubblico raggiungibile da Instagram.';

function isHttpsUrl(url) {
  return typeof url === 'string' && url.startsWith('https://');
}

/**
 * Persist upload to Firebase Storage (production) or local HTTPS URL (desktop dev only).
 */
export async function persistUploadedMedia(file) {
  if (!file?.path && !file?.buffer) {
    throw new Error('File media mancante');
  }

  const filename = file.filename || path.basename(file.path);
  const mimeType = file.mimetype || 'application/octet-stream';
  const buffer = file.buffer || fs.readFileSync(file.path);

  if (hasFirebaseStorage()) {
    const { publicUrl, storagePath } = await uploadMediaToFirebaseStorage({ buffer, filename, mimeType });
    return { publicUrl, storagePath };
  }

  if (useFirebaseDataStore()) {
    const err = new Error(FIREBASE_STORAGE_NOT_CONFIGURED);
    err.code = 'FIREBASE_STORAGE_NOT_CONFIGURED';
    throw err;
  }

  if (!isHttpsUrl(config.backendUrl)) {
    throw new Error(PUBLIC_MEDIA_ERROR);
  }

  const localUrl = `${config.backendUrl}/uploads/${filename}`;
  logger.info('Media using local backend URL (dev/desktop)', { urlPrefix: localUrl.slice(0, 48) });
  return { publicUrl: localUrl, storagePath: null };
}

export function resolvePostMediaPublicUrl(post) {
  if (isHttpsUrl(post?.mediaPublicUrl)) {
    return post.mediaPublicUrl;
  }
  return null;
}

export async function ensurePostPublicMediaUrl(post) {
  if (isHttpsUrl(post?.mediaPublicUrl)) {
    return post.mediaPublicUrl;
  }

  if (post?.mediaPath && fs.existsSync(post.mediaPath) && hasFirebaseStorage()) {
    const { publicUrl, storagePath } = await backfillLocalFileToFirebaseStorage({
      filePath: post.mediaPath,
      mimeType: post.mediaMimeType,
    });
    await updatePost(post.id, { mediaPublicUrl: publicUrl, mediaStoragePath: storagePath });
    logger.info('Media backfilled to Firebase Storage for publish', {
      postId: post.id,
      urlPrefix: publicUrl.slice(0, 56),
    });
    return publicUrl;
  }

  const existing = resolvePostMediaPublicUrl(post);
  if (!isHttpsUrl(existing)) {
    if (useFirebaseDataStore()) {
      throw new Error(FIREBASE_STORAGE_NOT_CONFIGURED);
    }
    throw new Error(PUBLIC_MEDIA_ERROR);
  }

  return existing;
}

export async function assertInstagramCanFetchMedia(url) {
  if (!isHttpsUrl(url)) {
    throw new Error(PUBLIC_MEDIA_ERROR);
  }

  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!res.ok) {
      logger.warn('Media URL not reachable for Instagram', {
        status: res.status,
        urlPrefix: url.slice(0, 48),
      });
      throw new Error(PUBLIC_MEDIA_ERROR);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (
      contentType &&
      !contentType.startsWith('image/') &&
      !contentType.startsWith('video/') &&
      !contentType.includes('octet-stream')
    ) {
      logger.warn('Media URL content-type unexpected for Instagram', {
        contentType,
        urlPrefix: url.slice(0, 48),
      });
      throw new Error(PUBLIC_MEDIA_ERROR);
    }
  } catch (err) {
    if (err.message === PUBLIC_MEDIA_ERROR || err.message === FIREBASE_STORAGE_NOT_CONFIGURED) throw err;
    logger.warn('Media HEAD check skipped after network error', { message: err.message });
  }
}
