import { config } from '../config.js';
import { getDueScheduledPosts, getPostById, updatePost } from './postService.js';
import { publishPost } from './publisherService.js';
import { resolveRecoveryStatus } from './publishStatus.js';
import { logger } from '../utils/logger.js';

const publishingLocks = new Set();

function schedLog(phase, message, meta = {}) {
  const payload = { phase, ...meta };
  if (config.schedulerDebug) {
    logger.info(`[scheduler:${phase}] ${message}`, payload);
  } else {
    logger.info(`[scheduler] ${message}`, payload);
  }
}

/**
 * Claim a due post for publishing (prevents double-publish from cron + client tick).
 * @returns {Promise<object|null>} fresh post or null if already claimed/not due
 */
export async function claimDuePost(post) {
  if (!post?.id) return null;
  if (publishingLocks.has(post.id)) {
    schedLog('claim_skip', 'Post already locked in-process', { postId: post.id });
    return null;
  }

  publishingLocks.add(post.id);
  try {
    const now = new Date().toISOString();
    const fresh = await getPostById(post.id);
    if (!fresh) {
      schedLog('claim_skip', 'Post not found', { postId: post.id });
      return null;
    }
    if (fresh.status !== 'scheduled') {
      schedLog('claim_skip', 'Post status is not scheduled', {
        postId: post.id,
        status: fresh.status,
      });
      return null;
    }
    if (!fresh.scheduledAt || fresh.scheduledAt > now) {
      schedLog('claim_skip', 'Post not due yet', {
        postId: post.id,
        scheduledAt: fresh.scheduledAt,
        now,
      });
      return null;
    }

    await updatePost(post.id, { status: 'publishing' });
    schedLog('job_claimed', 'Post claimed for publishing', {
      postId: post.id,
      platform: fresh.platform,
      scheduledAt: fresh.scheduledAt,
      now,
    });
    return { ...fresh, status: 'publishing' };
  } catch (err) {
    publishingLocks.delete(post.id);
    throw err;
  }
}

function releaseClaim(postId) {
  publishingLocks.delete(postId);
}

/**
 * Process all due scheduled posts. Safe to call from node-cron, Vercel Cron, or client tick.
 */
export async function runDuePublishes({ source = 'unknown' } = {}) {
  const startedAt = new Date().toISOString();
  schedLog('tick_start', 'Scheduler tick started', { source, startedAt });

  let duePosts;
  try {
    duePosts = await getDueScheduledPosts();
  } catch (err) {
    logger.error('[scheduler:query_error] Failed to load due posts', {
      phase: 'query_error',
      source,
      error: err.message,
    });
    throw err;
  }

  schedLog('jobs_detected', `Due posts found: ${duePosts.length}`, {
    source,
    count: duePosts.length,
    postIds: duePosts.map((p) => p.id),
    scheduledAts: duePosts.map((p) => p.scheduledAt),
    now: startedAt,
  });

  if (duePosts.length === 0) {
    schedLog('tick_idle', 'No due posts', { source });
    return { source, startedAt, detected: 0, published: 0, failed: 0, skipped: 0, results: [] };
  }

  const results = [];
  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of duePosts) {
    let claimed = null;
    try {
      claimed = await claimDuePost(post);
      if (!claimed) {
        skipped += 1;
        results.push({ postId: post.id, status: 'skipped' });
        continue;
      }

      schedLog('job_execute', 'Executing publish', {
        source,
        postId: claimed.id,
        platform: claimed.platform,
        scheduledAt: claimed.scheduledAt,
        contentType: claimed.contentType,
        hasMedia: Boolean(claimed.mediaPath || claimed.mediaPublicUrl),
      });

      const publishResult = await publishPost(claimed);

      schedLog('job_done', 'Publish completed', {
        source,
        postId: claimed.id,
        platforms: (publishResult.results || []).map((r) => r.platform),
        errors: publishResult.errors || [],
        metaResponse: config.schedulerDebug
          ? (publishResult.results || []).map((r) => ({
            platform: r.platform,
            mediaId: r.mediaId || null,
            postId: r.postId || null,
            containerId: r.containerId || null,
          }))
          : undefined,
      });

      published += 1;
      results.push({
        postId: claimed.id,
        status: 'published',
        results: publishResult.results,
        errors: publishResult.errors,
      });
    } catch (err) {
      failed += 1;
      logger.error('[scheduler:job_error] Publish failed', {
        phase: 'job_error',
        source,
        postId: post.id,
        error: err.message,
        stack: err.stack,
      });
      try {
        const after = await getPostById(post.id);
        const recovery = resolveRecoveryStatus(after, err.message);
        logger.info('[scheduler:status_recovery] Post-exception status decision', {
          phase: 'status_recovery',
          postId: post.id,
          beforeStatus: after?.status || null,
          hasInstagramMediaId: Boolean(after?.instagramMediaId),
          hasFacebookPostId: Boolean(after?.facebookPostId),
          recovery,
          stack: err.stack,
        });
        if (recovery) {
          await updatePost(post.id, {
            status: recovery.status,
            errorMessage: recovery.errorMessage,
            ...(recovery.publishedAt ? { publishedAt: recovery.publishedAt } : {}),
          });
          if (recovery.status === 'published') {
            // Meta already succeeded — do not count as hard failure for history
            published += 1;
            failed -= 1;
            results.push({
              postId: post.id,
              status: 'published',
              recovered: true,
              error: err.message,
            });
            continue;
          }
        }
      } catch (recoveryErr) {
        logger.error('[scheduler:recovery_error] Failed to recover post status', {
          postId: post.id,
          error: recoveryErr.message,
          stack: recoveryErr.stack,
        });
      }
      results.push({ postId: post.id, status: 'error', error: err.message });
    } finally {
      releaseClaim(post.id);
    }
  }

  const summary = {
    source,
    startedAt,
    finishedAt: new Date().toISOString(),
    detected: duePosts.length,
    published,
    failed,
    skipped,
    results,
  };

  schedLog('tick_done', 'Scheduler tick finished', summary);
  return summary;
}
