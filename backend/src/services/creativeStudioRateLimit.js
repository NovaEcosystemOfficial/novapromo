import { getFirebaseAdmin } from './firebase/admin.js';
import { useFirebaseDataStore } from './firebase/dataStore.js';
import { getDb } from '../db/index.js';
import {
  CREATIVE_STUDIO_DAILY_LIMIT,
  CREATIVE_STUDIO_MIN_INTERVAL_SEC,
} from '../constants/aiCredits.js';
import { currentCreditsMonth } from '../constants/plans.js';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildUsageDefaults() {
  return {
    creativeStudioDailyCount: 0,
    creativeStudioDailyDate: todayKey(),
    creativeStudioLastAt: null,
  };
}

async function getFirestoreUsage(docId) {
  const admin = await getFirebaseAdmin();
  if (!admin) return buildUsageDefaults();
  const snap = await admin.db.collection('users').doc(docId).get();
  const data = snap.exists ? snap.data() : {};
  const date = todayKey();
  if (data.creativeStudioDailyDate !== date) {
    return { ...buildUsageDefaults(), creativeStudioDailyDate: date };
  }
  return {
    creativeStudioDailyCount: data.creativeStudioDailyCount ?? 0,
    creativeStudioDailyDate: data.creativeStudioDailyDate || date,
    creativeStudioLastAt: data.creativeStudioLastAt || null,
  };
}

function getSqliteUsage(docId) {
  const db = getDb();
  const row = db.prepare(
    'SELECT creative_studio_daily_count, creative_studio_daily_date, creative_studio_last_at FROM user_plans WHERE user_doc_id = ?'
  ).get(docId);
  const date = todayKey();
  if (!row) return buildUsageDefaults();
  if (row.creative_studio_daily_date !== date) {
    return { ...buildUsageDefaults(), creativeStudioDailyDate: date };
  }
  return {
    creativeStudioDailyCount: row.creative_studio_daily_count ?? 0,
    creativeStudioDailyDate: row.creative_studio_daily_date || date,
    creativeStudioLastAt: row.creative_studio_last_at || null,
  };
}

async function getUsage(docId) {
  if (useFirebaseDataStore()) {
    return getFirestoreUsage(docId);
  }
  return getSqliteUsage(docId);
}

export async function assertCreativeStudioRateLimit(docId) {
  const usage = await getUsage(docId);
  const now = Date.now();

  if (usage.creativeStudioDailyCount >= CREATIVE_STUDIO_DAILY_LIMIT) {
    const err = new Error(
      `Limite giornaliero Creative Studio raggiunto (${CREATIVE_STUDIO_DAILY_LIMIT} pacchetti/giorno)`
    );
    err.code = 'CREATIVE_STUDIO_DAILY_LIMIT';
    err.status = 429;
    throw err;
  }

  if (usage.creativeStudioLastAt) {
    const elapsed = (now - new Date(usage.creativeStudioLastAt).getTime()) / 1000;
    if (elapsed < CREATIVE_STUDIO_MIN_INTERVAL_SEC) {
      const err = new Error(
        `Attendi ${Math.ceil(CREATIVE_STUDIO_MIN_INTERVAL_SEC - elapsed)}s prima di un nuovo pacchetto creativo`
      );
      err.code = 'CREATIVE_STUDIO_RATE_LIMIT';
      err.status = 429;
      throw err;
    }
  }
}

export async function recordCreativeStudioUsage(docId) {
  const date = todayKey();
  const now = new Date().toISOString();
  const usage = await getUsage(docId);
  const count = usage.creativeStudioDailyDate === date
    ? usage.creativeStudioDailyCount + 1
    : 1;

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set({
        creativeStudioDailyCount: count,
        creativeStudioDailyDate: date,
        creativeStudioLastAt: now,
        updatedAt: now,
      }, { merge: true });
    }
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT user_doc_id FROM user_plans WHERE user_doc_id = ?').get(docId);
  if (!existing) {
    db.prepare(`
      INSERT INTO user_plans (user_doc_id, uid, plan, ai_credits_used, ai_credits_limit, ai_credits_month, business_active, creative_studio_daily_count, creative_studio_daily_date, creative_studio_last_at, created_at, updated_at)
      VALUES (?, ?, 'free', 0, 3, ?, 0, ?, ?, ?, ?, ?)
    `).run(docId, docId, currentCreditsMonth(), count, date, now, now, now);
  } else {
    db.prepare(`
      UPDATE user_plans
      SET creative_studio_daily_count = ?, creative_studio_daily_date = ?, creative_studio_last_at = ?, updated_at = ?
      WHERE user_doc_id = ?
    `).run(count, date, now, now, docId);
  }
}
