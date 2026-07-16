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
import { publishToFacebook, refreshFacebookPageToken, canPublishToFacebook } from './facebook/facebookService.js';
import { FACEBOOK_PUBLISH_PENDING_MESSAGE } from './facebook/facebookPublishReadiness.js';
import { publishToTikTok, refreshTikTokToken } from './tiktok/tiktokService.js';
import { logger } from '../utils/logger.js';
import { recordPublishEvent } from './desktopEvents.js';
import {
  resolveFinalPublishStatus,
  sanitizePublishDetails,
} from './publishStatus.js';
import { sanitizeForFirestore } from '../utils/sanitizeForFirestore.js';

const PLATFORM_MAP = {
  instagram: ['instagram', 'both', 'multi'],
  facebook: ['facebook', 'multi'],
  tiktok: ['tiktok', 'both'],
};

async function safeAddPublicationLog(entry) {
  try {
    const details = entry.details != null
      ? sanitizeForFirestore(sanitizePublishDetails(entry.details))
      : null;
    await addPublicationLog({ ...entry, details });
  } catch (err) {
    logger.error('[publisher:log_error] Failed to write publication log (ignored)', {
      phase: 'publication_log_error',
      postId: entry.postId,
      platform: entry.platform,
      action: entry.action,
      error: err.message,
      stack: err.stack,
    });
  }
}

export async function publishPost(post) {
  const results = [];
  const errors = [];
  const skips = [];

  const targets = [];
  if (PLATFORM_MAP.instagram.includes(post.platform)) targets.push('instagram');
  if (PLATFORM_MAP.facebook.includes(post.platform)) targets.push('facebook');
  if (PLATFORM_MAP.tiktok.includes(post.platform)) targets.push('tiktok');

  logger.info('[publisher:start] Pubblicazione avviata', {
    phase: 'meta_publish_start',
    postId: post.id,
    platform: post.platform,
    targets,
    scheduledAt: post.scheduledAt || null,
    status: post.status,
  });

  for (const platform of targets) {
    try {
      const account = await ensureValidToken(platform);
      if (!account) {
        throw new Error(`Nessun account ${platform} collegato`);
      }

      await safeAddPublicationLog({
        postId: post.id,
        platform,
        action: 'publish_start',
        status: 'info',
        message: `Avvio pubblicazione su ${platform}`,
      });

      logger.info('[publisher:meta] Chiamata Graph API', {
        phase: 'meta_api_call',
        postId: post.id,
        platform,
        accountId: account.instagramAccountId || account.pageId || account.externalUserId || null,
      });

      let result;
      if (platform === 'instagram') {
        if (!post.mediaPath && !post.mediaPublicUrl) throw new Error('Media richiesto per Instagram');
        result = await publishToInstagram(post, account);
        logger.info('[publisher:meta_response] Instagram OK', {
          phase: 'meta_api_response',
          postId: post.id,
          platform,
          metaResponse: { containerId: result.containerId || null, mediaId: result.mediaId || null },
        });
        await updatePost(post.id, {
          instagramContainerId: result.containerId,
          instagramMediaId: result.mediaId,
          // Persist progress immediately so a later failure cannot erase Meta success
          status: 'published',
          publishedAt: new Date().toISOString(),
          errorMessage: null,
        });
      } else if (platform === 'facebook') {
        const publishCheck = await canPublishToFacebook(account);
        if (!publishCheck.canPublish) {
          const skipMessage = FACEBOOK_PUBLISH_PENDING_MESSAGE;
          logger.info('[publisher:skip] Facebook skipped — missing Meta permission', {
            phase: 'meta_skip',
            postId: post.id,
            grantedScopes: publishCheck.grantedScopes,
            missingPublishScopes: publishCheck.missingPublishScopes,
          });
          await safeAddPublicationLog({
            postId: post.id,
            platform,
            action: 'publish_skipped',
            status: 'warning',
            message: skipMessage,
            details: {
              grantedScopes: publishCheck.grantedScopes,
              missingPublishScopes: publishCheck.missingPublishScopes,
            },
          });
          recordPublishEvent({
            postId: post.id,
            platform,
            status: 'skipped',
            message: skipMessage,
          });
          skips.push({ platform, reason: skipMessage });
          continue;
        }
        if (!post.mediaPath && !post.mediaPublicUrl) throw new Error('Immagine richiesta per Facebook');
        result = await publishToFacebook(post, account);
        const safeResult = {
          postId: result.postId || null,
          pageId: result.pageId || null,
        };
        logger.info('[publisher:meta_response] Facebook OK', {
          phase: 'meta_api_response',
          postId: post.id,
          platform,
          metaResponse: safeResult,
        });
        await updatePost(post.id, {
          facebookPostId: safeResult.postId,
          status: 'published',
          publishedAt: new Date().toISOString(),
          errorMessage: null,
        });
        result = safeResult;
      } else {
        result = await publishToTikTok(post, account);
        logger.info('[publisher:meta_response] TikTok OK', {
          phase: 'meta_api_response',
          postId: post.id,
          platform,
          metaResponse: { publishId: result.publishId || null },
        });
        await updatePost(post.id, {
          tiktokPublishId: result.publishId,
          status: 'published',
          publishedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }

      // Record success before optional logging (logging must never flip status to error)
      results.push({ platform, ...sanitizePublishDetails(result) });

      await safeAddPublicationLog({
        postId: post.id,
        platform,
        action: 'publish_complete',
        status: 'success',
        message: `Pubblicato su ${platform}`,
        details: result,
      });

      recordPublishEvent({
        postId: post.id,
        platform,
        status: 'success',
        message: `Pubblicato su ${platform}`,
      });
    } catch (err) {
      logger.error('[publisher:meta_error] Publish failed', {
        phase: 'meta_api_error',
        postId: post.id,
        platform,
        error: err.message,
        code: err.code || err.metaCode || null,
        stack: err.stack,
      });
      await safeAddPublicationLog({
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

  const final = resolveFinalPublishStatus(results, errors);
  const now = new Date().toISOString();

  logger.info('[publisher:status_final] Determinazione stato finale', {
    phase: 'status_final',
    postId: post.id,
    resultsCount: results.length,
    errorsCount: errors.length,
    skipsCount: skips.length,
    nextStatus: final.status,
    errorMessage: final.errorMessage,
    stackHint: final.ok ? null : 'no successful platforms',
  });

  if (!final.ok) {
    await updatePost(post.id, {
      status: 'error',
      errorMessage: final.errorMessage,
    });
    const err = new Error(final.errorMessage);
    err.code = 'PUBLISH_FAILED';
    throw err;
  }

  const mockViews = estimateMockViews();
  await updatePost(post.id, {
    status: 'published',
    publishedAt: now,
    viewCount: mockViews,
    // Keep partial platform errors visible without marking the post as failed
    errorMessage: final.errorMessage,
  });

  logger.info('[publisher:status_saved] Stato salvato come published', {
    phase: 'status_saved',
    postId: post.id,
    status: 'published',
    partialErrors: final.errorMessage,
  });

  return { results, errors, skips };
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
          grantedScopes: refreshed.grantedScopes || refreshed.scopes || account.metadata?.grantedScopes,
          missingPublishScopes: refreshed.missingPublishScopes ?? account.metadata?.missingPublishScopes,
          canPublish: refreshed.canPublish === true,
          publishingStatus: refreshed.publishingStatus || account.metadata?.publishingStatus,
          tokenType: 'page',
        },
      });
    } catch (err) {
      logger.error('Facebook page token resolve failed', {
        error: err.message,
        code: err.code,
        stack: err.stack,
      });
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
    logger.error(`Token refresh failed for ${platform}`, {
      error: err.message,
      stack: err.stack,
    });
  }

  return account;
}

export function getPublicMediaUrl(mediaPath, mediaPublicUrl) {
  if (mediaPublicUrl?.startsWith('https://')) return mediaPublicUrl;
  if (!mediaPath) return null;
  const filename = path.basename(mediaPath);
  return `${config.backendUrl}/uploads/${filename}`;
}
