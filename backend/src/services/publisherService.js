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
import { publishToFacebook, refreshFacebookPageToken } from './facebook/facebookService.js';
import { publishToTikTok, refreshTikTokToken } from './tiktok/tiktokService.js';
import { logger } from '../utils/logger.js';
import { recordPublishEvent } from './desktopEvents.js';

const PLATFORM_MAP = {
  instagram: ['instagram', 'both', 'multi'],
  facebook: ['facebook', 'multi'],
  tiktok: ['tiktok', 'both'],
};

export async function publishPost(post) {
  const results = [];
  const errors = [];

  const targets = [];
  if (PLATFORM_MAP.instagram.includes(post.platform)) targets.push('instagram');
  if (PLATFORM_MAP.facebook.includes(post.platform)) targets.push('facebook');
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
        if (!post.mediaPath && !post.mediaPublicUrl) throw new Error('Media richiesto per Instagram');
        result = await publishToInstagram(post, account);
        await updatePost(post.id, {
          instagramContainerId: result.containerId,
          instagramMediaId: result.mediaId,
        });
      } else if (platform === 'facebook') {
        if (!post.mediaPath && !post.mediaPublicUrl) throw new Error('Immagine richiesta per Facebook');
        result = await publishToFacebook(post, account);
        await updatePost(post.id, { facebookPostId: result.postId });
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
  const account = await getAccountByPlatform(platform);
  if (!account) return null;

  if (platform === 'instagram' && !account.accessToken) {
    throw new Error(INSTAGRAM_TOKEN_MISSING_MESSAGE);
  }

  if (platform === 'facebook' && !account.accessToken) {
    throw new Error('Token Pagina Facebook mancante — ricollega da Account');
  }

  if (platform === 'facebook') {
    try {
      const refreshed = await refreshFacebookPageToken(account);
      return await upsertAccount({
        platform: 'facebook',
        externalUserId: account.externalUserId,
        username: account.username,
        displayName: account.displayName,
        accessToken: refreshed.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.tokenExpiresAt,
        scopes: refreshed.scopes || account.scopes,
        metadata: {
          ...account.metadata,
          grantedScopes: refreshed.scopes || account.metadata?.grantedScopes,
          tokenType: 'page',
        },
      });
    } catch (err) {
      logger.error('Facebook page token resolve failed', { error: err.message, code: err.code });
      throw err;
    }
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
      return await upsertAccount({
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
      return await upsertAccount({
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

export function getPublicMediaUrl(mediaPath, mediaPublicUrl) {
  if (mediaPublicUrl?.startsWith('https://')) return mediaPublicUrl;
  if (!mediaPath) return null;
  const filename = path.basename(mediaPath);
  return `${config.backendUrl}/uploads/${filename}`;
}
