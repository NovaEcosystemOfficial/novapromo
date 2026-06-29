import path from 'path';
import { config } from '../config.js';
import { getAccountByPlatform, upsertAccount } from './accountService.js';
import {
  updatePost,
  addPublicationLog,
  estimateMockViews,
} from './postService.js';
import { publishToInstagram, refreshInstagramToken } from './instagram/instagramService.js';
import { INSTAGRAM_TOKEN_MISSING_MESSAGE } from './instagram/instagramToken.js';
import { publishToTikTok, refreshTikTokToken } from './tiktok/tiktokService.js';
import { logger } from '../utils/logger.js';
import { recordPublishEvent } from './desktopEvents.js';

const PLATFORM_MAP = {
  instagram: ['instagram', 'both'],
  tiktok: ['tiktok', 'both'],
};

export async function publishPost(post) {
  const results = [];
  const errors = [];

  const targets = [];
  if (PLATFORM_MAP.instagram.includes(post.platform)) targets.push('instagram');
  if (PLATFORM_MAP.tiktok.includes(post.platform)) targets.push('tiktok');

  for (const platform of targets) {
    try {
      const account = await ensureValidToken(platform);
      if (!account) {
        throw new Error(`Nessun account ${platform} collegato`);
      }

      addPublicationLog({
        postId: post.id,
        platform,
        action: 'publish_start',
        status: 'info',
        message: `Avvio pubblicazione su ${platform}`,
      });

      let result;
      if (platform === 'instagram') {
        if (!post.mediaPath) throw new Error('Media richiesto per Instagram');
        result = await publishToInstagram(post, account);
        await updatePost(post.id, {
          instagramContainerId: result.containerId,
          instagramMediaId: result.mediaId,
        });
      } else {
        result = await publishToTikTok(post, account);
        await updatePost(post.id, { tiktokPublishId: result.publishId });
      }

      addPublicationLog({
        postId: post.id,
        platform,
        action: 'publish_complete',
        status: 'success',
        message: `Pubblicato su ${platform}`,
        details: result,
      });

      results.push({ platform, ...result });

      recordPublishEvent({
        postId: post.id,
        platform,
        status: 'success',
        message: `Pubblicato su ${platform}`,
      });
    } catch (err) {
      logger.error(`Publish failed on ${platform}`, { postId: post.id, error: err.message });
      addPublicationLog({
        postId: post.id,
        platform,
        action: 'publish_error',
        status: 'error',
        message: err.message,
      });
      errors.push({ platform, error: err.message });

      recordPublishEvent({
        postId: post.id,
        platform,
        status: 'error',
        message: err.message,
      });
    }
  }

  if (errors.length > 0 && results.length === 0) {
    await updatePost(post.id, {
      status: 'error',
      errorMessage: errors.map((e) => `${e.platform}: ${e.error}`).join('; '),
    });
    throw new Error(errors.map((e) => e.error).join('; '));
  }

  const now = new Date().toISOString();
  const mockViews = estimateMockViews();
  await updatePost(post.id, {
    status: errors.length > 0 ? 'error' : 'published',
    publishedAt: now,
    viewCount: errors.length === 0 ? mockViews : undefined,
    errorMessage: errors.length > 0 ? errors.map((e) => `${e.platform}: ${e.error}`).join('; ') : null,
  });

  return { results, errors };
}

async function ensureValidToken(platform) {
  const account = getAccountByPlatform(platform);
  if (!account) return null;

  if (platform === 'instagram' && !account.accessToken) {
    throw new Error(INSTAGRAM_TOKEN_MISSING_MESSAGE);
  }

  const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null;
  const needsRefresh = expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh) return account;

  try {
    if (platform === 'instagram') {
      if (!account.accessToken) {
        throw new Error(INSTAGRAM_TOKEN_MISSING_MESSAGE);
      }
      const refreshed = await refreshInstagramToken(account.accessToken);
      return upsertAccount({
        platform,
        externalUserId: account.externalUserId,
        username: account.username,
        displayName: account.displayName,
        accessToken: refreshed.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        scopes: account.scopes,
        metadata: account.metadata,
      });
    }

    if (platform === 'tiktok' && account.refreshToken) {
      const refreshed = await refreshTikTokToken(account.refreshToken);
      return upsertAccount({
        platform,
        externalUserId: account.externalUserId,
        username: account.username,
        displayName: account.displayName,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        scopes: account.scopes,
        metadata: account.metadata,
      });
    }
  } catch (err) {
    logger.error(`Token refresh failed for ${platform}`, { error: err.message });
  }

  return account;
}

export function getPublicMediaUrl(mediaPath) {
  if (!mediaPath) return null;
  const filename = path.basename(mediaPath);
  return `${config.backendUrl}/uploads/${filename}`;
}
