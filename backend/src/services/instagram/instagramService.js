import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import {
  META_ERROR_CODES,
  assertMetaRealOAuthReady,
  buildInstagramNotBusinessError,
  buildInstagramScopesMissingError,
  isAllowedInstagramAccountType,
} from './metaConfig.js';
import { toUserFriendlyMetaError } from './metaErrors.js';
import {
  INSTAGRAM_OAUTH_SCOPES,
  INSTAGRAM_OAUTH_AUTHORIZE_URL,
  INSTAGRAM_OAUTH_TOKEN_URL,
  INSTAGRAM_GRAPH_URL,
  INSTAGRAM_OAUTH_DEFAULT_OPTIONS,
  normalizeGrantedScopes,
  getMissingInstagramScopes,
} from './metaScopes.js';
import {
  resolveInstagramPublishToken,
  logInstagramGraphRequest,
} from './instagramToken.js';
import {
  buildInstagramMediaContainerFields,
  logInstagramMediaPayload,
} from './instagramMediaPayload.js';
import {
  ensurePostPublicMediaUrl,
  assertInstagramCanFetchMedia,
  PUBLIC_MEDIA_ERROR,
} from '../media/publicMediaService.js';

function getInstagramGraphApiBase() {
  return `${INSTAGRAM_GRAPH_URL}/${config.meta.graphApiVersion}`;
}

function getInstagramClientId() {
  return config.meta.instagramAppId || config.meta.appId;
}

function getInstagramClientSecret() {
  return config.meta.instagramAppSecret || config.meta.appSecret;
}

function graphError(data, fallback) {
  const err = new Error(data?.error?.message || data?.error_message || fallback);
  err.metaCode = data?.error?.code || data?.code;
  err.metaType = data?.error?.type || data?.error_type;
  err.metaSubcode = data?.error?.error_subcode;
  throw err;
}

function summarizeTokenResponse(tokenData) {
  const entry = tokenData?.data?.[0] || tokenData;
  return {
    hasAccessToken: Boolean(entry?.access_token),
    userId: entry?.user_id || null,
    permissionsRaw: entry?.permissions ?? tokenData?.permissions ?? null,
    permissionsType: entry?.permissions == null
      ? 'none'
      : Array.isArray(entry.permissions)
        ? 'array'
        : typeof entry.permissions,
    responseShape: tokenData?.data ? 'data[]' : 'flat',
  };
}

function logInstagramOAuthExchange(stage, meta) {
  logger.info(`Instagram OAuth: ${stage}`, meta);
}

async function graphGet(path, accessToken, baseUrl = getInstagramGraphApiBase()) {
  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(`${baseUrl}${path}${separator}access_token=${encodeURIComponent(accessToken)}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Richiesta alle API Meta fallita');
  }
  return data;
}

export function getInstagramAuthUrl(state, options = {}) {
  assertMetaRealOAuthReady();

  const redirectUri = config.meta.redirectUri;
  const forceReauth = options.forceReauth ?? INSTAGRAM_OAUTH_DEFAULT_OPTIONS.forceReauth;
  const enableFbLogin = options.enableFbLogin ?? INSTAGRAM_OAUTH_DEFAULT_OPTIONS.enableFbLogin;

  const params = new URLSearchParams({
    client_id: getInstagramClientId(),
    redirect_uri: redirectUri,
    scope: INSTAGRAM_OAUTH_SCOPES.join(','),
    response_type: 'code',
    state,
    force_reauth: forceReauth ? 'true' : 'false',
    enable_fb_login: enableFbLogin ? 'true' : 'false',
  });

  return `${INSTAGRAM_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

function parseShortLivedTokenResponse(tokenData) {
  const entry = tokenData?.data?.[0] || tokenData;
  const accessToken = entry?.access_token;
  const userId = entry?.user_id;

  if (!accessToken || !userId) {
    graphError(tokenData, 'Risposta token Instagram non valida');
  }

  return { accessToken, userId, permissions: entry?.permissions || null };
}

export async function exchangeInstagramCode(code) {
  assertMetaRealOAuthReady();

  const redirectUri = config.meta.redirectUri;
  const form = new URLSearchParams({
    client_id: getInstagramClientId(),
    client_secret: getInstagramClientSecret(),
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });

  let tokenData;
  try {
    const tokenRes = await fetch(INSTAGRAM_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    tokenData = await tokenRes.json();
    logInstagramOAuthExchange('token response', summarizeTokenResponse(tokenData));

    if (!tokenRes.ok || tokenData.error || tokenData.error_type) {
      graphError(tokenData, 'Scambio authorization code fallito');
    }
  } catch (err) {
    logger.error('Instagram OAuth: token exchange failed', {
      message: err.message,
      code: err.code,
      metaCode: err.metaCode,
    });
    throw Object.assign(new Error(toUserFriendlyMetaError(err)), { code: err.code });
  }

  const { accessToken: shortToken, userId, permissions } = parseShortLivedTokenResponse(tokenData);
  const grantedScopes = normalizeGrantedScopes(permissions);
  const missingScopes = getMissingInstagramScopes(grantedScopes);

  logInstagramOAuthExchange('scopes parsed', {
    grantedScopes,
    missingScopes,
    requiredScopes: INSTAGRAM_OAUTH_SCOPES,
    facebookPageRequired: false,
  });

  if (grantedScopes.length > 0 && missingScopes.length > 0) {
    throw buildInstagramScopesMissingError(missingScopes);
  }

  let longLived;
  try {
    longLived = await exchangeInstagramLongLivedToken(shortToken);
    logInstagramOAuthExchange('long-lived token', {
      expiresIn: longLived.expires_in || null,
      hasAccessToken: Boolean(longLived.access_token),
    });
  } catch (err) {
    logger.error('Instagram OAuth: long-lived exchange failed', {
      message: err.message,
      metaCode: err.metaCode,
    });
    throw err;
  }

  let profile;
  try {
    profile = await fetchInstagramProfile(longLived.access_token, userId);
    logInstagramOAuthExchange('profile loaded', {
      instagramAccountId: profile.id || userId,
      username: profile.username,
      accountType: profile.account_type || null,
      pageId: null,
      pageName: null,
      facebookUserId: null,
    });
  } catch (err) {
    logger.error('Instagram OAuth: profile fetch failed', {
      message: err.message,
      metaCode: err.metaCode,
      userId,
    });
    throw err;
  }

  if (!isAllowedInstagramAccountType(profile.account_type)) {
    throw buildInstagramNotBusinessError(profile.account_type);
  }

  const resolvedScopes = grantedScopes.length > 0 ? grantedScopes : [...INSTAGRAM_OAUTH_SCOPES];

  return {
    accessToken: longLived.access_token,
    expiresIn: longLived.expires_in,
    facebookUserId: null,
    facebookUserName: null,
    username: profile.username,
    instagramAccountId: profile.id || profile.user_id || userId,
    pageId: null,
    pageName: null,
    pageAccessToken: null,
    accountType: profile.account_type || null,
    scopes: resolvedScopes,
    connectionMode: 'INSTAGRAM_LOGIN',
  };
}

async function exchangeInstagramLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: getInstagramClientSecret(),
    access_token: shortToken,
  });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/access_token?${params}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Estensione token long-lived fallita');
  }
  return data;
}

async function fetchInstagramProfile(accessToken, fallbackUserId) {
  const fields = 'id,username,account_type,user_id';
  let data;

  try {
    data = await graphGet(`/me?fields=${fields}`, accessToken, INSTAGRAM_GRAPH_URL);
  } catch (err) {
    logger.warn('Instagram OAuth: /me profile fetch failed, retrying by user id', {
      message: err.message,
      metaCode: err.metaCode,
      fallbackUserId,
    });
    data = await graphGet(`/${fallbackUserId}?fields=${fields}`, accessToken, INSTAGRAM_GRAPH_URL);
  }

  if (!data.username) {
    throw new Error('Impossibile leggere lo username Instagram. Riprova il collegamento.');
  }

  return data;
}

export async function refreshInstagramToken(currentToken) {
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: currentToken,
  });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}/refresh_access_token?${params}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Refresh token Instagram fallito');
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function createMediaContainer({
  accessToken,
  instagramAccountId,
  caption,
  mediaUrl,
  mediaMimeType,
  contentType,
}) {
  const endpoint = `${getInstagramGraphApiBase()}/${instagramAccountId}/media`;
  const mediaFields = buildInstagramMediaContainerFields({
    mediaUrl,
    mediaMimeType,
    contentType,
  });

  const form = new URLSearchParams({
    access_token: accessToken,
  });

  if (caption) form.set('caption', caption);
  if (mediaFields.image_url) form.set('image_url', mediaFields.image_url);
  if (mediaFields.video_url) form.set('video_url', mediaFields.video_url);
  if (mediaFields.media_type) form.set('media_type', mediaFields.media_type);

  logInstagramGraphRequest({
    action: 'create_media_container',
    endpoint,
    instagramAccountId,
    accessToken,
  });

  logInstagramMediaPayload({
    igUserId: instagramAccountId,
    contentType,
    mediaMimeType,
    fields: mediaFields,
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await res.json();

  logInstagramMediaPayload({
    igUserId: instagramAccountId,
    contentType,
    mediaMimeType,
    fields: mediaFields,
    graphResponse: data?.error ? { error: data.error } : { id: data.id || null },
  });

  if (!res.ok || data.error) {
    graphError(data, 'Creazione contenuto Instagram fallita');
  }
  return { containerId: data.id };
}

export async function checkContainerStatus({ accessToken, containerId }) {
  const endpoint = `${getInstagramGraphApiBase()}/${containerId}?fields=status_code`;
  logInstagramGraphRequest({
    action: 'check_container_status',
    endpoint,
    instagramAccountId: null,
    accessToken,
  });
  const data = await graphGet(`/${containerId}?fields=status_code`, accessToken, getInstagramGraphApiBase());
  return { status: data.status_code, statusCode: data.status_code };
}

export async function publishContainer({ accessToken, instagramAccountId, containerId }) {
  const endpoint = `${getInstagramGraphApiBase()}/${instagramAccountId}/media_publish`;
  const form = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  logInstagramGraphRequest({
    action: 'publish_container',
    endpoint,
    instagramAccountId,
    accessToken,
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Pubblicazione su Instagram fallita');
  }
  return { mediaId: data.id };
}

export async function publishToInstagram(post, account) {
  const { accessToken, instagramAccountId, connectionMode, inspection } = resolveInstagramPublishToken(account);

  if (!instagramAccountId) {
    throw new Error('Account Instagram non configurato correttamente. Ricollega Instagram.');
  }

  logger.info('Instagram publish: starting', {
    postId: post.id,
    instagramAccountId,
    connectionMode,
    tokenPresent: inspection.tokenPresent,
    tokenLength: inspection.tokenLength,
    tokenPrefix: inspection.tokenPrefix,
    mediaUrlHost: config.backendUrl,
  });

  const fullCaption = [post.caption, post.hashtags].filter(Boolean).join('\n\n');
  const mediaUrl = await ensurePostPublicMediaUrl(post);
  await assertInstagramCanFetchMedia(mediaUrl);

  logger.info('Instagram publish: media resolved', {
    postId: post.id,
    hasImageUrl: !post.mediaMimeType?.startsWith('video/'),
    imageUrlPrefix: mediaUrl.slice(0, 48),
    contentType: post.contentType,
    mediaMimeType: post.mediaMimeType || null,
  });

  const { containerId } = await createMediaContainer({
    accessToken,
    instagramAccountId,
    caption: fullCaption,
    mediaUrl,
    mediaMimeType: post.mediaMimeType,
    contentType: post.contentType,
  });

  let status = 'IN_PROGRESS';
  let attempts = 0;
  while (status === 'IN_PROGRESS' && attempts < 30) {
    await sleep(2000);
    const check = await checkContainerStatus({ accessToken, containerId });
    status = check.statusCode;
    attempts++;
  }

  if (status !== 'FINISHED') {
    throw new Error('Instagram non ha completato l’elaborazione del media. Riprova più tardi.');
  }

  const { mediaId } = await publishContainer({
    accessToken,
    instagramAccountId,
    containerId,
  });

  return { containerId, mediaId };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
