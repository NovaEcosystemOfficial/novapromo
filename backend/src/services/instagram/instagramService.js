import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import {
  META_ERROR_CODES,
  assertMetaRealOAuthReady,
  buildInstagramNotBusinessError,
  isAllowedInstagramAccountType,
} from './metaConfig.js';
import { toUserFriendlyMetaError } from './metaErrors.js';
import {
  INSTAGRAM_OAUTH_SCOPES,
  INSTAGRAM_OAUTH_AUTHORIZE_URL,
  INSTAGRAM_OAUTH_TOKEN_URL,
  INSTAGRAM_GRAPH_URL,
} from './metaScopes.js';

const GRAPH_BASE = `https://graph.facebook.com/${config.meta.graphApiVersion}`;

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
  throw err;
}

async function graphGet(path, accessToken, baseUrl = GRAPH_BASE) {
  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(`${baseUrl}${path}${separator}access_token=${encodeURIComponent(accessToken)}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Richiesta alle API Meta fallita');
  }
  return data;
}

export function getInstagramAuthUrl(state) {
  assertMetaRealOAuthReady();

  const redirectUri = config.meta.redirectUri;
  const params = new URLSearchParams({
    client_id: getInstagramClientId(),
    redirect_uri: redirectUri,
    scope: INSTAGRAM_OAUTH_SCOPES.join(','),
    response_type: 'code',
    state,
    enable_fb_login: 'true',
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
    if (!tokenRes.ok || tokenData.error || tokenData.error_type) {
      graphError(tokenData, 'Scambio authorization code fallito');
    }
  } catch (err) {
    throw Object.assign(new Error(toUserFriendlyMetaError(err)), { code: err.code });
  }

  const { accessToken: shortToken, userId, permissions } = parseShortLivedTokenResponse(tokenData);
  const longLived = await exchangeInstagramLongLivedToken(shortToken);
  const profile = await fetchInstagramProfile(userId, longLived.access_token);

  if (!isAllowedInstagramAccountType(profile.account_type)) {
    throw buildInstagramNotBusinessError(profile.account_type);
  }

  return {
    accessToken: longLived.access_token,
    expiresIn: longLived.expires_in,
    facebookUserId: null,
    facebookUserName: null,
    username: profile.username,
    instagramAccountId: profile.id || userId,
    pageId: null,
    pageName: null,
    pageAccessToken: null,
    accountType: profile.account_type,
    scopes: permissions
      ? String(permissions).split(',').map((s) => s.trim()).filter(Boolean)
      : [...INSTAGRAM_OAUTH_SCOPES],
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

async function fetchInstagramProfile(userId, accessToken) {
  const fields = 'id,username,account_type';
  const data = await graphGet(`/${userId}?fields=${fields}`, accessToken, INSTAGRAM_GRAPH_URL);

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

export async function createMediaContainer({ accessToken, instagramAccountId, caption, mediaUrl, mediaType, contentType }) {
  const isVideo = mediaType?.startsWith('video/') || contentType === 'reel';
  const isStory = contentType === 'story';

  const body = {
    caption: caption || undefined,
    access_token: accessToken,
  };

  if (isStory) {
    body.media_type = isVideo ? 'VIDEO' : 'STORIES';
    if (isVideo) body.video_url = mediaUrl;
    else body.image_url = mediaUrl;
  } else if (isVideo || contentType === 'reel') {
    body.media_type = 'REELS';
    body.video_url = mediaUrl;
  } else {
    body.image_url = mediaUrl;
  }

  const res = await fetch(`${GRAPH_BASE}/${instagramAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Creazione contenuto Instagram fallita');
  }
  return { containerId: data.id };
}

export async function checkContainerStatus({ accessToken, containerId }) {
  const data = await graphGet(`/${containerId}?fields=status_code`, accessToken);
  return { status: data.status_code, statusCode: data.status_code };
}

export async function publishContainer({ accessToken, instagramAccountId, containerId }) {
  const res = await fetch(`${GRAPH_BASE}/${instagramAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Pubblicazione su Instagram fallita');
  }
  return { mediaId: data.id };
}

export async function publishToInstagram(post, account) {
  const { metadata } = account;
  const instagramAccountId = metadata?.instagramAccountId || account.externalUserId;
  if (!instagramAccountId) throw new Error('Account Instagram non configurato correttamente. Ricollega Instagram.');

  const fullCaption = [post.caption, post.hashtags].filter(Boolean).join('\n\n');
  const mediaUrl = `${config.backendUrl}/uploads/${post.mediaPath?.split(/[/\\]/).pop()}`;

  const token = metadata?.pageAccessToken || account.accessToken;

  const { containerId } = await createMediaContainer({
    accessToken: token,
    instagramAccountId,
    caption: fullCaption,
    mediaUrl,
    mediaType: post.mediaMimeType,
    contentType: post.contentType,
  });

  let status = 'IN_PROGRESS';
  let attempts = 0;
  while (status === 'IN_PROGRESS' && attempts < 30) {
    await sleep(2000);
    const check = await checkContainerStatus({ accessToken: token, containerId });
    status = check.statusCode;
    attempts++;
  }

  if (status !== 'FINISHED') {
    throw new Error('Instagram non ha completato l’elaborazione del media. Riprova più tardi.');
  }

  const { mediaId } = await publishContainer({
    accessToken: token,
    instagramAccountId,
    containerId,
  });

  return { containerId, mediaId };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
