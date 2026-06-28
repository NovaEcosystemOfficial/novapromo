/**
 * TikTok Login Kit + Content Posting API — OAuth v2 + PKCE (S256)
 * @see https://developers.tiktok.com/doc/login-kit-web
 */

import { config, hasTikTokCredentials } from '../../config.js';
import { logger } from '../../utils/logger.js';

const TIKTOK_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

export function assertTikTokConfigured() {
  if (!hasTikTokCredentials()) {
    const err = new Error(
      'Credenziali TikTok mancanti: configura TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET'
    );
    err.code = 'TIKTOK_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
}

function parseTokenResponse(body) {
  if (body.error) {
    throw new Error(body.error_description || body.error || 'TikTok token error');
  }
  const data = body.data ?? body;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in),
    refreshExpiresIn: Number(data.refresh_expires_in),
    openId: data.open_id,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

function buildAuthorizationUrl({ state, scopes, redirectUri, codeChallenge }) {
  assertTikTokConfigured();

  if (!codeChallenge) {
    throw new Error('PKCE code_challenge mancante — riavvia il backend');
  }

  const params = new URLSearchParams({
    client_key: config.tiktok.clientKey,
    response_type: 'code',
    scope: scopes.join(','),
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TIKTOK_AUTHORIZE_URL}?${params.toString()}`;
}

export function buildLoginAuthorizationUrl(state, codeChallenge) {
  return buildAuthorizationUrl({
    state,
    scopes: config.tiktok.loginScopes,
    redirectUri: config.tiktok.loginRedirectUri,
    codeChallenge,
  });
}

export function buildContentAuthorizationUrl(state, codeChallenge) {
  return buildAuthorizationUrl({
    state,
    scopes: config.tiktok.contentScopes,
    redirectUri: config.tiktok.apiRedirectUri,
    codeChallenge,
  });
}

export async function exchangeAuthorizationCode(code, redirectUri, codeVerifier) {
  assertTikTokConfigured();

  const uri = redirectUri || config.tiktok.loginRedirectUri;

  const bodyParams = {
    client_key: config.tiktok.clientKey,
    client_secret: config.tiktok.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: uri,
  };

  if (codeVerifier) {
    bodyParams.code_verifier = codeVerifier;
  }

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: new URLSearchParams(bodyParams),
  });

  const body = await res.json();

  if (!res.ok) {
    logger.error('TikTok token exchange failed', {
      status: res.status,
      error: body.error,
      description: body.error_description,
    });
    throw new Error(body.error_description || body.error || 'Scambio token TikTok fallito');
  }

  return parseTokenResponse(body);
}

export async function exchangeLoginCode(code, codeVerifier) {
  if (!codeVerifier) {
    throw new Error('PKCE code_verifier mancante — riavvia il login TikTok');
  }
  return exchangeAuthorizationCode(code, config.tiktok.loginRedirectUri, codeVerifier);
}

export async function exchangeContentCode(code, codeVerifier) {
  if (!codeVerifier) {
    throw new Error('PKCE code_verifier mancante — riavvia OAuth Content API');
  }
  return exchangeAuthorizationCode(code, config.tiktok.apiRedirectUri, codeVerifier);
}

export async function refreshAccessToken(refreshToken) {
  assertTikTokConfigured();

  if (!refreshToken) {
    throw new Error('Refresh token non disponibile');
  }

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: new URLSearchParams({
      client_key: config.tiktok.clientKey,
      client_secret: config.tiktok.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error_description || body.error || 'Refresh token TikTok fallito');
  }

  return parseTokenResponse(body);
}

export async function revokeAccessToken(accessToken) {
  assertTikTokConfigured();
  if (!accessToken) return;

  try {
    await fetch(TIKTOK_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: config.tiktok.clientKey,
        client_secret: config.tiktok.clientSecret,
        token: accessToken,
      }),
    });
  } catch (err) {
    logger.warn('TikTok token revoke failed', { error: err.message });
  }
}

export async function fetchUserProfile(accessToken) {
  assertTikTokConfigured();

  const fields = ['open_id', 'avatar_url', 'display_name', 'username'].join(',');
  const url = `${TIKTOK_USER_INFO_URL}?fields=${encodeURIComponent(fields)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const body = await res.json();

  if (!res.ok || body.error?.code !== 'ok') {
    logger.error('TikTok user info failed', { error: body.error });
    throw new Error(body.error?.message || 'Recupero profilo TikTok fallito');
  }

  const user = body.data?.user || {};
  return {
    openId: user.open_id,
    displayName: user.display_name || '',
    username: user.username || user.display_name || '',
    avatarUrl: user.avatar_url || '',
  };
}

export async function exchangeContentAuthorizationCode(code, codeVerifier) {
  const tokens = await exchangeContentCode(code, codeVerifier);
  const profile = await fetchUserProfile(tokens.accessToken);
  return { ...tokens, ...profile };
}
