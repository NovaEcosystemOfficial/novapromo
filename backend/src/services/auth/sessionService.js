import crypto from 'crypto';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { getDb } from '../../db/index.js';
import { refreshAccessToken } from '../tiktok/tiktokLoginService.js';
import { logger } from '../../utils/logger.js';
import { createPkcePair } from '../../utils/pkce.js';
import { config } from '../../config.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const PKCE_PLATFORMS = new Set(['tiktok_login', 'tiktok_content']);
const STATELESS_PLATFORMS = new Set(['instagram', 'facebook']);

function useStatelessOAuthState(platform) {
  return STATELESS_PLATFORMS.has(platform) && (config.isVercel || (config.isProduction && !config.isDesktop));
}

function signStatelessPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyStatelessState(state) {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) {
    throw Object.assign(new Error('State OAuth non valido (possibile CSRF)'), { status: 403 });
  }

  const expected = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(encoded)
    .digest('base64url');

  if (signature !== expected) {
    throw Object.assign(new Error('State OAuth non valido (possibile CSRF)'), { status: 403 });
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload?.platform || !payload?.nonce || !payload?.exp) {
    throw Object.assign(new Error('State OAuth non valido'), { status: 403 });
  }
  if (payload.exp < Date.now()) {
    throw Object.assign(new Error('State OAuth scaduto — riprova il collegamento'), { status: 403 });
  }

  return {
    platform: payload.platform,
    codeVerifier: null,
  };
}

export function createOAuthState(platform) {
  const usePkce = PKCE_PLATFORMS.has(platform);

  if (useStatelessOAuthState(platform)) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = signStatelessPayload({
      platform,
      nonce,
      exp: Date.now() + OAUTH_STATE_TTL_MS,
    });
    return { state, codeChallenge: null };
  }

  const state = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();

  if (usePkce) {
    const { codeVerifier, codeChallenge } = createPkcePair();
    getDb()
      .prepare(
        `INSERT INTO oauth_states (state, platform, expires_at, code_verifier) VALUES (?, ?, ?, ?)`
      )
      .run(state, platform, expiresAt, codeVerifier);
    return { state, codeChallenge };
  }

  getDb()
    .prepare(`INSERT INTO oauth_states (state, platform, expires_at) VALUES (?, ?, ?)`)
    .run(state, platform, expiresAt);

  return { state, codeChallenge: null };
}

export function validateAndConsumeOAuthState(state) {
  if (!state || typeof state !== 'string') {
    throw Object.assign(new Error('Parametro state mancante'), { status: 400 });
  }

  if (state.includes('.')) {
    return verifyStatelessState(state);
  }

  const row = getDb().prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);

  if (!row) {
    throw Object.assign(new Error('State OAuth non valido o scaduto (possibile CSRF)'), { status: 403 });
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    getDb().prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
    throw Object.assign(new Error('State OAuth scaduto'), { status: 403 });
  }

  getDb().prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
  return {
    platform: row.platform,
    codeVerifier: row.code_verifier || null,
  };
}

export function saveUserSession({ uid, openId, profile, tokens }) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const accessExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
  const refreshExpiresAt = tokens.refreshExpiresIn
    ? new Date(Date.now() + tokens.refreshExpiresIn * 1000).toISOString()
    : null;

  const existing = getDb().prepare('SELECT id FROM user_sessions WHERE open_id = ?').get(openId);

  if (existing) {
    getDb()
      .prepare(
        `UPDATE user_sessions SET
          uid = ?, display_name = ?, username = ?, avatar_url = ?,
          access_token_encrypted = ?, refresh_token_encrypted = ?,
          expires_at = ?, refresh_expires_at = ?, updated_at = datetime('now')
         WHERE open_id = ?`
      )
      .run(
        uid,
        profile.displayName,
        profile.username,
        profile.avatarUrl,
        encrypt(tokens.accessToken),
        tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        accessExpiresAt,
        refreshExpiresAt,
        openId
      );
    return existing.id;
  }

  getDb()
    .prepare(
      `INSERT INTO user_sessions (
        id, uid, open_id, display_name, username, avatar_url,
        access_token_encrypted, refresh_token_encrypted,
        expires_at, refresh_expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      sessionId,
      uid,
      openId,
      profile.displayName,
      profile.username,
      profile.avatarUrl,
      encrypt(tokens.accessToken),
      tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      accessExpiresAt,
      refreshExpiresAt
    );

  return sessionId;
}

export function getSession(sessionId) {
  if (!sessionId) return null;

  const row = getDb()
    .prepare(
      `SELECT id, uid, open_id AS openId, display_name AS displayName,
              username, avatar_url AS avatarUrl,
              expires_at AS expiresAt, refresh_expires_at AS refreshExpiresAt
       FROM user_sessions WHERE id = ?`
    )
    .get(sessionId);

  if (!row) return null;

  const refreshExpired = row.refreshExpiresAt && new Date(row.refreshExpiresAt).getTime() < Date.now();
  const accessExpired = new Date(row.expiresAt).getTime() < Date.now();

  if (refreshExpired && accessExpired) {
    deleteSession(sessionId);
    return null;
  }

  return row;
}

export function deleteSession(sessionId) {
  if (!sessionId) return;
  getDb().prepare('DELETE FROM user_sessions WHERE id = ?').run(sessionId);
}

export function getSessionTokens(sessionId) {
  const row = getDb()
    .prepare(
      `SELECT access_token_encrypted, refresh_token_encrypted,
              expires_at, refresh_expires_at
       FROM user_sessions WHERE id = ?`
    )
    .get(sessionId);

  if (!row) return null;
  return {
    accessToken: decrypt(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted ? decrypt(row.refresh_token_encrypted) : null,
    expiresAt: row.expires_at,
    refreshExpiresAt: row.refresh_expires_at,
  };
}

export function updateSessionTokens(sessionId, tokens) {
  getDb()
    .prepare(
      `UPDATE user_sessions SET
        access_token_encrypted = ?,
        refresh_token_encrypted = ?,
        expires_at = ?,
        refresh_expires_at = ?
       WHERE id = ?`
    )
    .run(
      encrypt(tokens.accessToken),
      tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
      tokens.refreshExpiresIn
        ? new Date(Date.now() + tokens.refreshExpiresIn * 1000).toISOString()
        : null,
      sessionId
    );
}

/**
 * Refresh access token before expiry per TikTok docs (24h access, 365d refresh).
 * Uses newly returned refresh_token when TikTok rotates it.
 */
export async function ensureFreshSessionTokens(sessionId) {
  const tokens = getSessionTokens(sessionId);
  if (!tokens) return null;

  const accessExpires = new Date(tokens.expiresAt).getTime();
  const needsRefresh = accessExpires - Date.now() < REFRESH_BUFFER_MS;

  if (!needsRefresh) return tokens;

  if (!tokens.refreshToken) {
    logger.warn('Access token expired and no refresh token', { sessionId });
    return tokens;
  }

  if (tokens.refreshExpiresAt && new Date(tokens.refreshExpiresAt).getTime() < Date.now()) {
    deleteSession(sessionId);
    return null;
  }

  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    updateSessionTokens(sessionId, refreshed);
    return getSessionTokens(sessionId);
  } catch (err) {
    logger.error('Session token refresh failed', { error: err.message });
    deleteSession(sessionId);
    return null;
  }
}

export function getSessionIdByOpenId(openId) {
  const row = getDb().prepare('SELECT id FROM user_sessions WHERE open_id = ?').get(openId);
  return row?.id || null;
}
