/**
 * Pure helpers for final publish status (unit-tested).
 */

/**
 * Decide post status after attempting one or more platforms.
 * Any successful Meta publish ⇒ published (partial failures stay in errorMessage).
 */
export function resolveFinalPublishStatus(results = [], errors = []) {
  if (results.length > 0) {
    return {
      status: 'published',
      errorMessage: errors.length
        ? errors.map((e) => `${e.platform}: ${e.error}`).join('; ')
        : null,
      ok: true,
    };
  }
  return {
    status: 'error',
    errorMessage: errors.length
      ? errors.map((e) => `${e.platform}: ${e.error}`).join('; ')
      : 'Pubblicazione fallita',
    ok: false,
  };
}

/**
 * After a scheduler/client exception, avoid marking a successfully posted item as error.
 */
export function resolveRecoveryStatus(post, errMessage) {
  if (!post) {
    return { status: 'error', errorMessage: errMessage || 'Pubblicazione fallita' };
  }
  if (post.status === 'published') {
    return { status: 'published', errorMessage: post.errorMessage || null };
  }
  const hasMetaIds = Boolean(
    post.instagramMediaId || post.facebookPostId || post.tiktokPublishId
  );
  if (hasMetaIds) {
    return {
      status: 'published',
      errorMessage: errMessage
        ? `Pubblicato su Meta; errore post-publish: ${errMessage}`
        : post.errorMessage || null,
      publishedAt: post.publishedAt || new Date().toISOString(),
    };
  }
  if (post.status === 'publishing') {
    return { status: 'error', errorMessage: errMessage || 'Pubblicazione interrotta' };
  }
  return null;
}

/** Strip secrets / undefined before Firestore log write */
export function sanitizePublishDetails(details) {
  if (!details || typeof details !== 'object') return details || null;
  const {
    pageAccessToken,
    accessToken,
    access_token,
    token,
    ...rest
  } = details;
  const out = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
