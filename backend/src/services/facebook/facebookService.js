import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { assertFacebookOAuthReady } from './metaFacebookConfig.js';
import {
  FACEBOOK_PAGE_OAUTH_SCOPES,
} from '../instagram/metaScopes.js';
import {
  FACEBOOK_OAUTH_DIALOG_URL,
  getFacebookGraphApiBase,
} from './metaFacebookConfig.js';
import { toUserFriendlyMetaError } from '../instagram/metaErrors.js';
import {
  ensurePostPublicMediaUrl,
  assertInstagramCanFetchMedia,
} from '../media/publicMediaService.js';

function graphError(data, fallback) {
  const err = new Error(data?.error?.message || fallback);
  err.metaCode = data?.error?.code;
  err.metaType = data?.error?.type;
  err.metaSubcode = data?.error?.error_subcode;
  throw err;
}

async function graphGet(path, accessToken, params = {}) {
  const url = new URL(`${getFacebookGraphApiBase()}${path}`);
  url.searchParams.set('access_token', accessToken);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Richiesta Graph API Facebook fallita');
  }
  return data;
}

async function graphPost(path, accessToken, body = {}) {
  const url = new URL(`${getFacebookGraphApiBase()}${path}`);
  url.searchParams.set('access_token', accessToken);
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value != null && value !== '') form.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    graphError(data, 'Pubblicazione Facebook fallita');
  }
  return data;
}

export function getFacebookAuthUrl(state) {
  assertFacebookOAuthReady();
  const params = new URLSearchParams({
    client_id: config.meta.appId,
    redirect_uri: config.meta.facebookRedirectUri,
    state,
    response_type: 'code',
  });

  const configId = config.meta.facebookConfigId?.trim();
  if (configId) {
    // Facebook Login for Business (app tipo Business) richiede config_id.
    params.set('config_id', configId);
    params.set('override_default_response_type', 'true');
  } else {
    params.set('scope', FACEBOOK_PAGE_OAUTH_SCOPES.join(','));
  }

  return `${FACEBOOK_OAUTH_DIALOG_URL}/${config.meta.graphApiVersion}/dialog/oauth?${params.toString()}`;
}

async function exchangeCodeForUserToken(code) {
  const params = new URLSearchParams({
    client_id: config.meta.appId,
    client_secret: config.meta.appSecret,
    redirect_uri: config.meta.facebookRedirectUri,
    code,
  });

  const res = await fetch(`${getFacebookGraphApiBase()}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error || !data.access_token) {
    graphError(data, 'Scambio authorization code Facebook fallito');
  }
  return data.access_token;
}

async function exchangeForLongLivedUserToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.meta.appId,
    client_secret: config.meta.appSecret,
    fb_exchange_token: shortToken,
  });

  const res = await fetch(`${getFacebookGraphApiBase()}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error || !data.access_token) {
    graphError(data, 'Token long-lived Facebook non ottenuto');
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || null,
  };
}

function pickManagedPage(pages) {
  const list = pages?.data || [];
  if (list.length === 0) return null;

  const withManage = list.find((page) => {
    const tasks = page.tasks || [];
    return tasks.includes('MANAGE') || tasks.includes('CREATE_CONTENT');
  });

  return withManage || list[0];
}

export async function exchangeFacebookCode(code) {
  assertFacebookOAuthReady();

  const shortToken = await exchangeCodeForUserToken(code);
  const longLived = await exchangeForLongLivedUserToken(shortToken);

  const accounts = await graphGet('/me/accounts', longLived.accessToken, {
    fields: 'id,name,access_token,tasks',
  });

  const page = pickManagedPage(accounts);
  if (!page?.id || !page?.access_token) {
    const err = new Error(
      'Nessuna Pagina Facebook gestibile trovata. Assicurati di essere admin della Pagina e di aver concesso i permessi pages_manage_posts.'
    );
    err.code = 'NO_FACEBOOK_PAGES';
    throw err;
  }

  logger.info('Facebook OAuth: page selected', {
    pageId: page.id,
    pageName: page.name,
    grantedPages: (accounts.data || []).length,
  });

  const now = new Date().toISOString();

  return {
    facebookPageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    accessToken: page.access_token,
    expiresIn: longLived.expiresIn,
    scopes: FACEBOOK_PAGE_OAUTH_SCOPES,
    connectedAt: now,
    status: 'connected',
    connectionMode: 'FACEBOOK_PAGE',
  };
}

function buildFacebookMessage(post) {
  return [post.caption, post.hashtags].filter(Boolean).join('\n\n').trim();
}

function isImageMime(mimeType) {
  return mimeType?.startsWith('image/');
}

export async function publishToFacebook(post, account) {
  const meta = account.metadata || {};
  const pageId = meta.facebookPageId || account.externalUserId;
  const pageToken = account.accessToken;

  if (!pageId || !pageToken) {
    throw new Error('Pagina Facebook non collegata correttamente — ricollega da Account');
  }

  const message = buildFacebookMessage(post);
  if (!message) {
    throw new Error('Caption o testo richiesto per pubblicare su Facebook');
  }

  const mediaUrl = await ensurePostPublicMediaUrl(post);
  if (!mediaUrl) {
    throw new Error('Immagine richiesta per pubblicare su Facebook Page');
  }

  await assertInstagramCanFetchMedia(mediaUrl);

  if (!isImageMime(post.mediaMimeType)) {
    throw new Error('Facebook Page supporta immagini (JPEG/PNG/WebP) in questa release — usa un post con immagine');
  }

  const result = await graphPost(`/${pageId}/photos`, pageToken, {
    url: mediaUrl,
    message,
  });

  return {
    postId: result.id || result.post_id || null,
    pageId,
  };
}

export async function refreshFacebookPageToken(account) {
  // Page tokens from /me/accounts are long-lived; re-auth if invalid
  if (!account?.accessToken) {
    throw new Error('Token pagina Facebook mancante — ricollega la Pagina');
  }
  return { accessToken: account.accessToken, expiresIn: null };
}
