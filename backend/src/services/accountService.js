import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export function listAccounts() {
  const rows = getDb().prepare('SELECT * FROM connected_accounts ORDER BY platform, username').all();
  return rows.map(toPublicAccount);
}

export function getAccountByPlatform(platform) {
  const row = getDb().prepare('SELECT * FROM connected_accounts WHERE platform = ? LIMIT 1').get(platform);
  return row ? toAccountWithTokens(row) : null;
}

export function upsertAccount({ platform, externalUserId, username, displayName, accessToken, refreshToken, expiresAt, scopes, metadata }) {
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
      encrypt(accessToken),
      refreshToken ? encrypt(refreshToken) : null,
      expiresAt || null,
      scopes ? JSON.stringify(scopes) : null,
      metadata ? JSON.stringify(metadata) : null,
      existing ? getDb().prepare('SELECT created_at FROM connected_accounts WHERE id = ?').get(id)?.created_at || now : now,
      now
    );

  return getAccountByPlatform(platform);
}

export function deleteAccount(id) {
  return getDb().prepare('DELETE FROM connected_accounts WHERE id = ?').run(id);
}

function toPublicAccount(row) {
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

function toAccountWithTokens(row) {
  return {
    ...toPublicAccount(row),
    accessToken: decrypt(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted ? decrypt(row.refresh_token_encrypted) : null,
  };
}
