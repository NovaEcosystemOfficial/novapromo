import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { assertFacebookOAuthReady } from './metaFacebookConfig.js';
import {
  FACEBOOK_PAGE_OAUTH_SCOPES,
  FACEBOOK_PUBLISH_REQUIRED_SCOPES,
  getMissingFacebookPublishScopes,
} from '../instagram/metaScopes.js';
import {
  FACEBOOK_OAUTH_DIALOG_URL,
  getFacebookGraphApiBase,
} from './metaFacebookConfig.js';
import { META_ERROR_CODES } from '../instagram/metaConfig.js';
import {
  evaluateFacebookPublishReadiness,
  FACEBOOK_PUBLISH_PENDING_MESSAGE,
} from './facebookPublishReadiness.js';
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

function getAppAccessToken() {
  return `${config.meta.appId}|${config.meta.appSecret}`;
}

export async function debugFacebookToken(token) {
  const data = await graphGet('/debug_token', getAppAccessToken(), {
    input_token: token,
  });
  const info = data.data || {};
  return {
    isValid: Boolean(info.is_valid),
    type: info.type || null,
    scopes: info.scopes || [],
    profileId: info.profile_id || null,
    expiresAt: info.expires_at ? new Date(info.expires_at * 1000).toISOString() : null,
  };
}

export function buildFacebookScopesMissingError(missingScopes, { phase = 'publish' } = {}) {
  const list = missingScopes.join(', ');
  const err = new Error(
    phase === 'oauth'
      ? `Permessi Facebook mancanti sul token Pagina: ${list}. Aggiorna la Configurazione Meta (Facebook Login for Business) con pages_manage_posts e pages_read_engagement, poi scollega e ricollega la Pagina.`
      : `Permesso Facebook mancante per la pubblicazione: ${list}. La Configurazione Meta deve includere pages_manage_posts e pages_read_engagement; poi ricollega la Pagina da Account.`
  );
  err.code = META_ERROR_CODES.FACEBOOK_SCOPES_MISSING;
  err.missingScopes = missingScopes;
  return err;
}

export { evaluateFacebookPublishReadiness, FACEBOOK_PUBLISH_PENDING_MESSAGE } from './facebookPublishReadiness.js';

async function inspectFacebookPageToken(pageToken, { phase = 'inspect', pageId = null, pageName = null } = {}) {
  const debug = await debugFacebookToken(pageToken);
  const readiness = evaluateFacebookPublishReadiness(debug.scopes);

  logger.info('Facebook token permissions', {
    phase,
    pageId,
    pageName,
    tokenType: debug.type,
    isValid: debug.isValid,
    grantedScopes: debug.scopes,
    missingPublishScopes: readiness.missingPublishScopes,
    canPublish: readiness.canPublish,
    publishingStatus: readiness.publishingStatus,
  });

  return {
    ...debug,
    ...readiness,
  };
}

async function assertFacebookPageTokenCanPublish(pageToken, { phase = 'publish' } = {}) {
  const inspected = await inspectFacebookPageToken(pageToken, { phase });
  if (!inspected.isValid) {
    const err = new Error('Token Pagina Facebook non valido — ricollega da Account');
    err.code = 'FACEBOOK_TOKEN_INVALID';
    throw err;
  }

  const missing = inspected.missingPublishScopes;
  if (missing.length > 0) {
    logger.warn('Facebook page token missing publish scopes', {
      phase,
      tokenType: inspected.type,
      grantedScopes: inspected.scopes,
      missingScopes: missing,
    });
    const err = buildFacebookScopesMissingError(missing, { phase });
    err.code = phase === 'publish' ? 'FACEBOOK_PUBLISH_PENDING' : err.code;
    throw err;
  }

  if (inspected.type && inspected.type !== 'PAGE') {
    logger.warn('Facebook publish token is not PAGE type', {
      tokenType: inspected.type,
      profileId: inspected.profileId,
    });
    const err = new Error(
      'Serve un Page Access Token (da /me/accounts), non un User Access Token. Scollega e ricollega la Pagina Facebook da Account.'
    );
    err.code = 'FACEBOOK_WRONG_TOKEN_TYPE';
    throw err;
  }

  return inspected;
}

function pickManagedPage(pages, preferredPageId = null) {
  const list = pages?.data || [];
  if (list.length === 0) return null;

  if (preferredPageId) {
    const match = list.find((page) => page.id === preferredPageId);
    if (match?.access_token) return match;
  }

  const withManage = list.find((page) => {
    const tasks = page.tasks || [];
    return tasks.includes('MANAGE') || tasks.includes('CREATE_CONTENT');
  });

  return withManage || list[0];
}

async function fetchPageFromUserToken(userToken, preferredPageId = null) {
  const accounts = await graphGet('/me/accounts', userToken, {
    fields: 'id,name,access_token,tasks',
  });
  const page = pickManagedPage(accounts, preferredPageId);
  if (!page?.id || !page?.access_token) {
    const err = new Error(
      'Nessuna Pagina Facebook gestibile trovata. Devi essere admin della Pagina con permesso CREATE_CONTENT/MANAGE.'
    );
    err.code = 'NO_FACEBOOK_PAGES';
    throw err;
  }
  return page;
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

export async function exchangeFacebookCode(code) {
  assertFacebookOAuthReady();

  const shortToken = await exchangeCodeForUserToken(code);
  const longLived = await exchangeForLongLivedUserToken(shortToken);

  const page = await fetchPageFromUserToken(longLived.accessToken);
  const pageDebug = await inspectFacebookPageToken(page.access_token, {
    phase: 'oauth',
    pageId: page.id,
    pageName: page.name,
  });

  if (!pageDebug.isValid) {
    const err = new Error('Token Pagina Facebook non valido dopo OAuth — riprova il collegamento');
    err.code = 'FACEBOOK_TOKEN_INVALID';
    throw err;
  }

  if (!pageDebug.canPublish) {
    logger.warn('Facebook Page connected without publish permission', {
      pageId: page.id,
      pageName: page.name,
      grantedScopes: pageDebug.grantedScopes,
      missingPublishScopes: pageDebug.missingPublishScopes,
      hint: 'Advanced Access / App Review required for pages_manage_posts',
    });
  }

  const now = new Date().toISOString();

  return {
    facebookPageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    accessToken: page.access_token,
    userAccessToken: longLived.accessToken,
    expiresIn: longLived.expiresIn,
    scopes: pageDebug.grantedScopes,
    grantedScopes: pageDebug.grantedScopes,
    missingPublishScopes: pageDebug.missingPublishScopes,
    canPublish: pageDebug.canPublish,
    publishingStatus: pageDebug.publishingStatus,
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

async function resolveFacebookPageToken(account) {
  const meta = account.metadata || {};
  const pageId = meta.facebookPageId || account.externalUserId;

  if (account.refreshToken) {
    try {
      const page = await fetchPageFromUserToken(account.refreshToken, pageId);
      if (page.id === pageId) {
        return page.access_token;
      }
    } catch (err) {
      logger.warn('Facebook page token refresh via user token failed', {
        pageId,
        error: err.message,
      });
    }
  }

  return account.accessToken;
}

export async function canPublishToFacebook(account) {
  const meta = account.metadata || {};
  const pageId = meta.facebookPageId || account.externalUserId;
  const pageToken = await resolveFacebookPageToken(account);

  if (!pageId || !pageToken) {
    return {
      canPublish: false,
      publishingStatus: 'pending_meta_permission',
      missingPublishScopes: ['pages_manage_posts', 'pages_read_engagement'],
      grantedScopes: [],
    };
  }

  try {
    return await inspectFacebookPageToken(pageToken, {
      phase: 'publish_precheck',
      pageId,
      pageName: meta.pageName || account.displayName,
    });
  } catch (err) {
    logger.warn('Facebook publish precheck failed', { pageId, error: err.message });
    return evaluateFacebookPublishReadiness(meta.grantedScopes || account.scopes || []);
  }
}

export async function publishToFacebook(post, account) {
  const publishCheck = await canPublishToFacebook(account);
  if (!publishCheck.canPublish) {
    const err = new Error(FACEBOOK_PUBLISH_PENDING_MESSAGE);
    err.code = 'FACEBOOK_PUBLISH_PENDING';
    err.missingScopes = publishCheck.missingPublishScopes;
    throw err;
  }

  const meta = account.metadata || {};
  const pageId = meta.facebookPageId || account.externalUserId;
  const pageToken = await resolveFacebookPageToken(account);

  if (!pageId || !pageToken) {
    throw new Error('Pagina Facebook non collegata correttamente — ricollega da Account');
  }

  await assertFacebookPageTokenCanPublish(pageToken, { phase: 'publish' });

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

  try {
    const result = await graphPost(`/${pageId}/photos`, pageToken, {
      url: mediaUrl,
      message,
    });

    return {
      postId: result.id || result.post_id || null,
      pageId,
      pageAccessToken: pageToken,
    };
  } catch (err) {
    if (
      err.metaCode === 200
      && String(err.message || '').toLowerCase().includes('pages_manage_posts')
    ) {
      throw buildFacebookScopesMissingError(['pages_manage_posts'], { phase: 'publish' });
    }
    throw err;
  }
}

export async function refreshFacebookPageToken(account) {
  const meta = account.metadata || {};
  const pageId = meta.facebookPageId || account.externalUserId;

  let pageToken = account.accessToken;
  let pageName = meta.pageName || account.displayName;

  if (account.refreshToken) {
    const page = await fetchPageFromUserToken(account.refreshToken, pageId);
    pageToken = page.access_token;
    pageName = page.name;
  } else if (!pageToken) {
    throw new Error('Token pagina Facebook mancante — ricollega la Pagina');
  }

  const inspected = await inspectFacebookPageToken(pageToken, {
    phase: 'token_refresh',
    pageId,
    pageName,
  });

  return {
    accessToken: pageToken,
    expiresIn: null,
    scopes: inspected.grantedScopes,
    grantedScopes: inspected.grantedScopes,
    missingPublishScopes: inspected.missingPublishScopes,
    canPublish: inspected.canPublish,
    publishingStatus: inspected.publishingStatus,
  };
}
