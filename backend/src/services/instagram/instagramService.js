import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import {
  META_ERROR_CODES,
  assertMetaRealOAuthReady,
  buildInstagramNotBusinessError,
  isAllowedInstagramAccountType,
} from './metaConfig.js';
import { toUserFriendlyMetaError } from './metaErrors.js';

const GRAPH_BASE = `https://graph.facebook.com/${config.meta.graphApiVersion}`;

const INSTAGRAM_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
];

function graphError(data, fallback) {
  const err = new Error(data?.error?.message || fallback);
  err.metaCode = data?.error?.code;
  err.metaType = data?.error?.type;
  throw err;
}

async function graphGet(path, accessToken) {
  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(`${GRAPH_BASE}${path}${separator}access_token=${encodeURIComponent(accessToken)}`);
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
    client_id: config.meta.appId,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/${config.meta.graphApiVersion}/dialog/oauth?${params.toString()}`;
}

export async function exchangeInstagramCode(code) {
  assertMetaRealOAuthReady();

  const redirectUri = config.meta.redirectUri;

  const tokenParams = new URLSearchParams({
    client_id: config.meta.appId,
    client_secret: config.meta.appSecret,
    redirect_uri: redirectUri,
    code,
  });

  let tokenData;
  try {
    const tokenRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${tokenParams}`);
    tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      graphError(tokenData, 'Scambio authorization code fallito');
    }
  } catch (err) {
    throw Object.assign(new Error(toUserFriendlyMetaError(err)), { code: err.code });
  }

  const longLived = await exchangeLongLivedToken(tokenData.access_token);
  const facebookUser = await fetchFacebookUser(longLived.access_token);
  const pages = await fetchPages(longLived.access_token);
  const igAccount = await findInstagramBusinessAccount(pages, longLived.access_token);

  return {
    accessToken: longLived.access_token,
    expiresIn: longLived.expires_in,
    facebookUserId: facebookUser.id,
    facebookUserName: facebookUser.name,
    username: igAccount.username,
    instagramAccountId: igAccount.instagramAccountId,
    pageId: igAccount.pageId,
    pageName: igAccount.pageName,
    pageAccessToken: igAccount.pageAccessToken,
    accountType: igAccount.accountType,
    scopes: INSTAGRAM_SCOPES,
  };
}

async function exchangeLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.meta.appId,
    client_secret: config.meta.appSecret,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Estensione token long-lived fallita');
  }
  return data;
}

async function fetchFacebookUser(userToken) {
  return graphGet('/me?fields=id,name', userToken);
}

async function fetchPages(userToken) {
  const data = await graphGet('/me/accounts?fields=id,name,access_token', userToken);
  const pages = data.data || [];

  if (pages.length === 0) {
    const err = new Error(
      'Nessuna Pagina Facebook collegata al tuo account Meta. Crea o collega una Pagina e riprova.'
    );
    err.code = META_ERROR_CODES.NO_FACEBOOK_PAGES;
    throw err;
  }
  return pages;
}

async function findInstagramBusinessAccount(pages, userToken) {
  const pagesWithoutIg = [];

  for (const page of pages) {
    const pageToken = page.access_token || userToken;

    let pageData;
    try {
      pageData = await graphGet(`/${page.id}?fields=instagram_business_account`, pageToken);
    } catch (err) {
      logger.warn('[Instagram] Lettura pagina fallita', { pageId: page.id, error: err.message });
      continue;
    }

    const igId = pageData.instagram_business_account?.id;
    if (!igId) {
      pagesWithoutIg.push(page.name || page.id);
      continue;
    }

    const igData = await graphGet(`/${igId}?fields=username,account_type`, pageToken);

    if (!igData.username) {
      throw new Error('Impossibile leggere lo username Instagram collegato. Riprova il collegamento.');
    }

    if (!isAllowedInstagramAccountType(igData.account_type)) {
      throw buildInstagramNotBusinessError(igData.account_type);
    }

    return {
      instagramAccountId: igId,
      username: igData.username,
      accountType: igData.account_type,
      pageId: page.id,
      pageName: page.name || null,
      pageAccessToken: page.access_token,
    };
  }

  const err = new Error(
    pagesWithoutIg.length > 0
      ? `Nessun account Instagram collegato alle tue Pagine Facebook (${pagesWithoutIg.join(', ')}). Collega un profilo Business/Creator in Meta Business Suite.`
      : 'Nessun account Instagram Business/Creator collegato a una Pagina Facebook'
  );
  err.code = META_ERROR_CODES.NO_INSTAGRAM_ON_PAGE;
  throw err;
}

export async function refreshInstagramToken(currentToken) {
  return exchangeLongLivedToken(currentToken);
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
  const instagramAccountId = metadata?.instagramAccountId;
  if (!instagramAccountId) throw new Error('Account Instagram non configurato correttamente. Ricollega Instagram.');

  const fullCaption = [post.caption, post.hashtags].filter(Boolean).join('\n\n');
  const mediaUrl = `${config.backendUrl}/uploads/${post.mediaPath?.split(/[/\\]/).pop()}`;

  const token = metadata.pageAccessToken || account.accessToken;

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
