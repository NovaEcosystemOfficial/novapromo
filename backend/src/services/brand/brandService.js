import { getDb } from '../../db/index.js';
import { getFirebaseAdmin } from '../firebase/admin.js';
import { logger } from '../../utils/logger.js';
import {
  createEmptyBrandProfile,
  normalizeBrandProfile,
} from './brandSchema.js';

const COLLECTION = 'brands';

function getSqliteBrand(ownerUid) {
  const db = getDb();
  const row = db
    .prepare('SELECT profile_json, created_at, updated_at FROM brand_profiles WHERE owner_uid = ?')
    .get(ownerUid);

  if (!row) return null;

  try {
    const profile = JSON.parse(row.profile_json);
    return normalizeBrandProfile(
      {
        ...profile,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      ownerUid
    );
  } catch {
    return null;
  }
}

function saveSqliteBrand(profile) {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare('SELECT created_at FROM brand_profiles WHERE owner_uid = ?')
    .get(profile.ownerUid);

  const createdAt = existing?.created_at || now;
  const payload = { ...profile, createdAt, updatedAt: now };

  db.prepare(
    `INSERT INTO brand_profiles (owner_uid, profile_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(owner_uid) DO UPDATE SET
       profile_json = excluded.profile_json,
       updated_at = excluded.updated_at`
  ).run(profile.ownerUid, JSON.stringify(payload), createdAt, now);

  return payload;
}

async function getFirestoreBrand(ownerUid) {
  const admin = await getFirebaseAdmin();
  if (!admin) return null;

  const snap = await admin.db.collection(COLLECTION).doc(ownerUid).get();
  if (!snap.exists) return null;

  return normalizeBrandProfile(snap.data(), ownerUid);
}

async function saveFirestoreBrand(profile) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    return saveSqliteBrand(profile);
  }

  const now = new Date().toISOString();
  const ref = admin.db.collection(COLLECTION).doc(profile.ownerUid);
  const existing = await ref.get();
  const createdAt = existing.exists ? existing.data()?.createdAt || now : now;

  const payload = {
    ...profile,
    brandId: profile.ownerUid,
    createdAt,
    updatedAt: now,
  };

  await ref.set(payload, { merge: true });
  saveSqliteBrand(payload);
  return payload;
}

export async function getBrandProfile(ownerUid) {
  try {
    const firestoreProfile = await getFirestoreBrand(ownerUid);
    if (firestoreProfile) return firestoreProfile;
  } catch (err) {
    logger.warn('Firestore brand read failed, using SQLite fallback', { error: err.message });
  }

  const sqliteProfile = getSqliteBrand(ownerUid);
  if (sqliteProfile) return sqliteProfile;

  return createEmptyBrandProfile(ownerUid);
}

export async function saveBrandProfile(ownerUid, input) {
  const normalized = normalizeBrandProfile(input, ownerUid);

  try {
    return await saveFirestoreBrand(normalized);
  } catch (err) {
    logger.warn('Firestore brand save failed, using SQLite fallback', { error: err.message });
    return saveSqliteBrand(normalized);
  }
}

export async function addBrandLibraryAsset(ownerUid, category, asset) {
  const profile = await getBrandProfile(ownerUid);
  const library = { ...profile.library };
  const items = Array.isArray(library[category]) ? [...library[category]] : [];
  items.push(asset);
  library[category] = items;

  return saveBrandProfile(ownerUid, { ...profile, library });
}

export async function getBrandProfileForAi(ownerUid) {
  const profile = await getBrandProfile(ownerUid);
  if (!profile?.identity?.companyName && !profile?.toneOfVoice?.length) {
    return null;
  }
  return profile;
}
