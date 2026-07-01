import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { useFirebaseDataStore } from './firebase/dataStore.js';
import * as firebaseAccounts from './firebase/accountRepository.js';

function safeDecryptToken(encrypted, platform) {
  if (!encrypted) return null;
  try {
    const value = decrypt(encrypted);
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      logger.warn('Account token decrypt produced invalid value', {
        platform,
        tokenPresent: Boolean(trimmed),
        tokenLength: trimmed.length,
        tokenPrefix: trimmed ? trimmed.slice(0, 6) : null,
      });
      return null;
    }
    return trimmed;
  } catch (err) {
    logger.error('Account token decrypt failed', { platform, error: err.message });
    return null;
  }
}

function sqliteToPublicAccount(row) {
  const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  return {
    id: row.id,
    platform: row.platform,
    externalUserId: row.external_user_id,
    username: row.username,
    displayName: row.display_name,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes ? JSON.parse(row.scopes) : [],
    metadata,
    connectionMode: metadata.connectionMode || 'REAL',
    connectedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sqliteToAccountWithTokens(row) {
  return {
    ...sqliteToPublicAccount(row),
    accessToken: safeDecryptToken(row.access_token_encrypted, row.platform),
    refreshToken: row.refresh_token_encrypted
      ? safeDecryptToken(row.refresh_token_encrypted, row.platform)
      : null,
  };
}

export async function listAccounts() {
  if (useFirebaseDataStore()) {
    return firebaseAccounts.listAccounts(decrypt);
  }
  const rows = getDb().prepare('SELECT * FROM connected_accounts ORDER BY platform, username').all();
  return rows.map(sqliteToPublicAccount);
}

export async function getAccountByPlatform(platform) {
  if (useFirebaseDataStore()) {
    return firebaseAccounts.getAccountByPlatform(platform, decrypt);
  }
  const row = getDb().prepare('SELECT * FROM connected_accounts WHERE platform = ? LIMIT 1').get(platform);
  return row ? sqliteToAccountWithTokens(row) : null;
}

export async function upsertAccount({
  platform,
  externalUserId,
  username,
  displayName,
  accessToken,
  refreshToken,
  expiresAt,
  scopes,
  metadata,
}) {
  if (useFirebaseDataStore()) {
    return firebaseAccounts.upsertAccount(
      { platform, externalUserId, username, displayName, accessToken, refreshToken, expiresAt, scopes, metadata },
      encrypt,
      decrypt
    );
  }

  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  if (!token) {
    const err = new Error('Token di accesso mancante durante il salvataggio account');
    err.code = 'INSTAGRAM_TOKEN_MISSING';
    throw err;
  }

  const existing = getDb()
    .prepare('SELECT id FROM connected_accounts WHERE platform = ? AND external_user_id = ?')
    .get(platform, externalUserId);

  const id = existing?.id || uuidv4();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO connected_accounts (
        id, platform, external_user_id, username, display_name,
        access_token_encrypted, refresh_token_encrypted, token_expires_at,
        scopes, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(platform, external_user_id) DO UPDATE SET
        username = excluded.username,
        display_name = excluded.display_name,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        token_expires_at = excluded.token_expires_at,
        scopes = excluded.scopes,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at`
    )
    .run(
      id,
      platform,
      externalUserId,
      username || null,
      displayName || null,
      encrypt(token),
      refreshToken ? encrypt(refreshToken) : null,
      expiresAt || null,
      scopes ? JSON.stringify(scopes) : null,
      metadata ? JSON.stringify(metadata) : null,
      existing ? getDb().prepare('SELECT created_at FROM connected_accounts WHERE id = ?').get(id)?.created_at || now : now,
      now
    );

  return await getAccountByPlatform(platform);
}

export async function deleteAccount(id) {
  if (useFirebaseDataStore()) {
    return firebaseAccounts.deleteAccount(id);
  }
  return getDb().prepare('DELETE FROM connected_accounts WHERE id = ?').run(id);
}
