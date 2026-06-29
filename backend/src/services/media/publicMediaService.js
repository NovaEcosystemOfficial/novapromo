import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { updatePost } from '../postService.js';

export const PUBLIC_MEDIA_ERROR =
  'Immagine non pubblicabile: serve URL HTTPS pubblico raggiungibile da Instagram.';

function isHttpsUrl(url) {
  return typeof url === 'string' && url.startsWith('https://');
}

/**
 * Persist upload to a URL Instagram servers can fetch (Vercel Blob when configured).
 */
export async function persistUploadedMedia(file) {
  if (!file?.path && !file?.buffer) {
    throw new Error('File media mancante');
  }

  const filename = file.filename || path.basename(file.path);
  const mimeType = file.mimetype || 'application/octet-stream';
  const buffer = file.buffer || fs.readFileSync(file.path);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`novapromo/${filename}`, buffer, {
      access: 'public',
      contentType: mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    logger.info('Media stored in Vercel Blob', {
      urlPrefix: blob.url.slice(0, 48),
      contentType: mimeType,
    });
    return blob.url;
  }

  if (!isHttpsUrl(config.backendUrl)) {
    throw new Error(PUBLIC_MEDIA_ERROR);
  }

  const localUrl = `${config.backendUrl}/uploads/${filename}`;
  logger.info('Media using backend static URL', { urlPrefix: localUrl.slice(0, 48) });
  return localUrl;
}

export function resolvePostMediaPublicUrl(post) {
  if (isHttpsUrl(post?.mediaPublicUrl)) {
    return post.mediaPublicUrl;
  }
  if (!post?.mediaPath) return null;

  const filename = path.basename(post.mediaPath);
  if (!isHttpsUrl(config.backendUrl)) {
    return null;
  }
  return `${config.backendUrl}/uploads/${filename}`;
}

/**
 * Ensure post has a public HTTPS media URL before Instagram publish.
 */
export async function ensurePostPublicMediaUrl(post) {
  const existing = resolvePostMediaPublicUrl(post);
  if (isHttpsUrl(post?.mediaPublicUrl)) {
    return post.mediaPublicUrl;
  }

  if (post?.mediaPath && fs.existsSync(post.mediaPath) && process.env.BLOB_READ_WRITE_TOKEN) {
    const buffer = fs.readFileSync(post.mediaPath);
    const filename = path.basename(post.mediaPath);
    const mimeType = post.mediaMimeType || 'application/octet-stream';
    const url = await put(`novapromo/${filename}`, buffer, {
      access: 'public',
      contentType: mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    updatePost(post.id, { mediaPublicUrl: url });
    logger.info('Media backfilled to Vercel Blob for publish', { postId: post.id, urlPrefix: url.slice(0, 48) });
    return url;
  }

  if (!isHttpsUrl(existing)) {
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
    if (err.message === PUBLIC_MEDIA_ERROR) throw err;
    logger.warn('Media HEAD check skipped after network error', { message: err.message });
  }
}
