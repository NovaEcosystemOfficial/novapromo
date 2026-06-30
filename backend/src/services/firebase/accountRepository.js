import { v4 as uuidv4 } from 'uuid';
import { encrypt } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { getFirestoreDb } from './admin.js';

const COLLECTION = 'connected_accounts';

function safeDecryptToken(encrypted, platform, decryptFn) {
  if (!encrypted) return null;
  try {
    const value = decryptFn(encrypted);
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      logger.warn('Firestore account token decrypt produced invalid value', {
        platform,
        tokenLength: trimmed.length,
        tokenPrefix: trimmed ? trimmed.slice(0, 6) : null,
      });
      return null;
    }
    return trimmed;
  } catch (err) {
    logger.error('Firestore account token decrypt failed', { platform, error: err.message });
    return null;
  }
}

function docToPublic(id, data) {
  const metadata = data.metadata || {};
  return {
    id,
    platform: data.platform,
    externalUserId: data.externalUserId,
    username: data.username,
    displayName: data.displayName,
    tokenExpiresAt: data.tokenExpiresAt || null,
    scopes: data.scopes || [],
    metadata,
    connectionMode: metadata.connectionMode || 'REAL',
    connectedAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listAccounts(decryptFn) {
  const db = await getFirestoreDb();
  const snap = await db.collection(COLLECTION).orderBy('platform').get();
  return snap.docs.map((doc) => docToPublic(doc.id, doc.data()));
}

export async function getAccountByPlatform(platform, decryptFn) {
  const db = await getFirestoreDb();
  const doc = await db.collection(COLLECTION).doc(platform).get();
  if (!doc.exists) return null;

  const data = doc.data();
  return {
    ...docToPublic(doc.id, data),
    accessToken: safeDecryptToken(data.accessTokenEncrypted, platform, decryptFn),
    refreshToken: data.refreshTokenEncrypted
      ? safeDecryptToken(data.refreshTokenEncrypted, platform, decryptFn)
      : null,
  };
}

export async function upsertAccount(payload, encryptFn, decryptFn) {
  const db = await getFirestoreDb();
  const { platform, externalUserId, username, displayName, accessToken, refreshToken, expiresAt, scopes, metadata } = payload;
  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  if (!token) {
    const err = new Error('Token di accesso mancante durante il salvataggio account');
    err.code = 'INSTAGRAM_TOKEN_MISSING';
    throw err;
  }

  const ref = db.collection(COLLECTION).doc(platform);
  const existing = await ref.get();
  const now = new Date().toISOString();

  const doc = {
    platform,
    externalUserId,
    username: username || null,
    displayName: displayName || null,
    accessTokenEncrypted: encryptFn(token),
    refreshTokenEncrypted: refreshToken ? encryptFn(refreshToken) : null,
    tokenExpiresAt: expiresAt || null,
    scopes: scopes || [],
    metadata: metadata || {},
    updatedAt: now,
    createdAt: existing.exists ? existing.data()?.createdAt || now : now,
  };

  await ref.set(doc, { merge: true });
  return await getAccountByPlatform(platform, decryptFn);
}

export async function deleteAccount(id) {
  const db = await getFirestoreDb();
  await db.collection(COLLECTION).doc(id).delete();
  return { changes: 1 };
}
