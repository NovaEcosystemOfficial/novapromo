import { getFirebaseAdmin } from './firebase/admin.js';
import { useFirebaseDataStore } from './firebase/dataStore.js';
import { getDb } from '../db/index.js';
import {
  getPlanDefinition,
  currentCreditsMonth,
  PLAN_DEFINITIONS,
  nextCreditsResetAt,
} from '../constants/plans.js';
import { WELCOME_PRO_CREDITS } from '../constants/welcomePro.js';
import { isAdmin, hasUnlimitedCredits, UNLIMITED_CREDITS } from './adminService.js';
import { logger } from '../utils/logger.js';

/**
 * @typedef {Object} UserPlanRecord
 * @property {string} docId
 * @property {string} [uid]
 * @property {string} [email]
 * @property {string} [displayName]
 * @property {'admin'|'user'} [role]
 * @property {'free'|'trial'|'premium'|'business'} plan
 * @property {number} [credits]
 * @property {string} [creditsResetAt]
 * @property {string} [trialStartedAt]
 * @property {string} [trialEndsAt]
 * @property {string} [premiumUntil]
 * @property {number} [welcomeProCredits]
 * @property {number} aiCreditsUsedThisMonth
 * @property {number} aiCreditsLimit
 * @property {string} aiCreditsMonth
 * @property {boolean} businessActive
 * @property {string} createdAt
 * @property {string} updatedAt
 */

function applyPlanTransitions(raw, docId) {
  const now = new Date();
  const updates = {};
  let plan = raw.plan || 'free';
  let role = raw.role || 'user';
  let aiCreditsLimit = raw.aiCreditsLimit ?? getPlanDefinition(plan).aiCreditsLimit;
  let aiCreditsUsed = raw.aiCreditsUsedThisMonth ?? 0;
  let creditsMonth = raw.aiCreditsMonth || currentCreditsMonth();
  const month = currentCreditsMonth();

  if (isAdmin({ ...raw, role, email: raw.email })) {
    return {
      applyUpdates: null,
      record: {
        ...raw,
        docId,
        role: 'admin',
        plan: 'premium',
        aiCreditsLimit: UNLIMITED_CREDITS,
        credits: UNLIMITED_CREDITS,
        aiCreditsUsedThisMonth: aiCreditsUsed,
        aiCreditsMonth: month,
        businessActive: Boolean(raw.businessActive),
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      },
    };
  }

  if (plan === 'premium' && raw.premiumUntil && new Date(raw.premiumUntil) < now) {
    plan = 'free';
    aiCreditsLimit = PLAN_DEFINITIONS.free.aiCreditsLimit;
    updates.plan = 'free';
    updates.premiumUntil = null;
    updates.aiCreditsLimit = aiCreditsLimit;
    updates.credits = PLAN_DEFINITIONS.free.aiCreditsLimit;
  }

  if (plan === 'trial' && raw.trialEndsAt && new Date(raw.trialEndsAt) < now) {
    plan = 'free';
    aiCreditsLimit = PLAN_DEFINITIONS.free.aiCreditsLimit;
    updates.plan = 'free';
    updates.aiCreditsLimit = aiCreditsLimit;
    updates.credits = PLAN_DEFINITIONS.free.aiCreditsLimit;
  }

  if (creditsMonth !== month && (plan === 'free' || plan === 'premium')) {
    aiCreditsUsed = 0;
    creditsMonth = month;
    aiCreditsLimit = getPlanDefinition(plan).aiCreditsLimit;
    updates.aiCreditsUsedThisMonth = 0;
    updates.aiCreditsMonth = month;
    updates.aiCreditsLimit = aiCreditsLimit;
    updates.creditsResetAt = nextCreditsResetAt();
  }

  return {
    applyUpdates: Object.keys(updates).length ? updates : null,
    record: {
      ...raw,
      docId,
      role,
      plan,
      aiCreditsLimit,
      aiCreditsUsedThisMonth: aiCreditsUsed,
      aiCreditsMonth: creditsMonth,
      credits: raw.credits ?? aiCreditsLimit,
      email: raw.email || null,
      displayName: raw.displayName || null,
      trialStartedAt: raw.trialStartedAt || null,
      trialEndsAt: raw.trialEndsAt || null,
      premiumUntil: raw.premiumUntil || null,
      welcomeProCredits: raw.welcomeProCredits ?? (plan === 'free' ? 0 : null),
      creditsResetAt: raw.creditsResetAt || nextCreditsResetAt(),
      businessActive: Boolean(raw.businessActive),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    },
  };
}

export function computeCreditsRemaining(record) {
  if (hasUnlimitedCredits(record)) return UNLIMITED_CREDITS;
  const bonus = Math.max(0, Number(record.credits) || 0);
  const monthlyRemaining = Math.max(
    0,
    (record.aiCreditsLimit || 0) - (record.aiCreditsUsedThisMonth || 0)
  );
  if (record.plan === 'trial') {
    return Math.max(0, (record.aiCreditsLimit || 0) - (record.aiCreditsUsedThisMonth || 0));
  }
  return monthlyRemaining + bonus;
}

export function getWelcomeProRemaining(record) {
  if (!record || record.plan !== 'free') return 0;
  const remaining = Number(record.welcomeProCredits);
  if (!Number.isFinite(remaining)) return 0;
  return Math.max(0, remaining);
}

export function getWelcomeProUsed(record) {
  if (!record || record.plan !== 'free') return 0;
  return Math.max(0, WELCOME_PRO_CREDITS - getWelcomeProRemaining(record));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function consumeWelcomeProCredit(docId) {
  const plan = await getUserPlan(docId);
  const remaining = getWelcomeProRemaining(plan);
  if (remaining <= 0) {
    const err = new Error('Crediti benvenuto PRO esauriti');
    err.code = 'WELCOME_PRO_EXHAUSTED';
    err.status = 402;
    throw err;
  }

  const now = new Date().toISOString();
  const newRemaining = remaining - 1;
  const payload = { welcomeProCredits: newRemaining, updatedAt: now };

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set(payload, { merge: true });
    }
  } else {
    const db = getDb();
    db.prepare('UPDATE user_plans SET welcome_pro_credits = ?, updated_at = ? WHERE user_doc_id = ?')
      .run(newRemaining, now, docId);
  }

  return { ...plan, ...payload };
}

export async function activatePremiumSubscription(docId, { interval = 'monthly', source = 'mock' } = {}) {
  const days = interval === 'yearly' ? 365 : 30;
  const premiumUntil = addDays(new Date(), days).toISOString();
  const def = PLAN_DEFINITIONS.premium;
  const now = new Date().toISOString();
  const payload = {
    plan: 'premium',
    premiumUntil,
    aiCreditsLimit: def.aiCreditsLimit,
    credits: def.aiCreditsLimit,
    aiCreditsUsedThisMonth: 0,
    aiCreditsMonth: currentCreditsMonth(),
    creditsResetAt: nextCreditsResetAt(),
    updatedAt: now,
    premiumSource: source,
  };

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set(payload, { merge: true });
    }
  } else {
    const db = getDb();
    db.prepare(`
      UPDATE user_plans
      SET plan = ?, premium_until = ?, ai_credits_limit = ?, credits = ?,
          ai_credits_used = 0, ai_credits_month = ?, credits_reset_at = ?, updated_at = ?
      WHERE user_doc_id = ?
    `).run(
      payload.plan,
      payload.premiumUntil,
      payload.aiCreditsLimit,
      payload.credits,
      payload.aiCreditsMonth,
      payload.creditsResetAt,
      now,
      docId
    );
  }

  logger.info('Premium subscription activated', { docId, interval, source, premiumUntil });
  return getUserPlan(docId);
}

function buildDefaultPlan(docId, uid = null) {
  const now = new Date().toISOString();
  const def = PLAN_DEFINITIONS.free;
  return {
    docId,
    uid,
    role: 'user',
    plan: 'free',
    credits: def.aiCreditsLimit,
    welcomeProCredits: WELCOME_PRO_CREDITS,
    creditsResetAt: nextCreditsResetAt(),
    aiCreditsUsedThisMonth: 0,
    aiCreditsLimit: def.aiCreditsLimit,
    aiCreditsMonth: currentCreditsMonth(),
    businessActive: false,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizePlanRecord(raw, docId) {
  const { applyUpdates, record } = applyPlanTransitions(raw, docId);
  return { record, applyUpdates };
}

async function persistPlanUpdates(docId, updates) {
  if (!updates) return;
  const now = new Date().toISOString();
  const payload = { ...updates, updatedAt: now };

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set(payload, { merge: true });
    }
    return;
  }

  const db = getDb();
  const sets = [];
  const vals = [];
  const map = {
    plan: 'plan',
    aiCreditsLimit: 'ai_credits_limit',
    aiCreditsUsedThisMonth: 'ai_credits_used',
    aiCreditsMonth: 'ai_credits_month',
    credits: 'credits',
    premiumUntil: 'premium_until',
    creditsResetAt: 'credits_reset_at',
    welcomeProCredits: 'welcome_pro_credits',
  };
  for (const [k, col] of Object.entries(map)) {
    if (payload[k] != null) {
      sets.push(`${col} = ?`);
      vals.push(payload[k]);
    }
  }
  if (sets.length) {
    sets.push('updated_at = ?');
    vals.push(now, docId);
    db.prepare(`UPDATE user_plans SET ${sets.join(', ')} WHERE user_doc_id = ?`).run(...vals);
  }
}

async function finalizePlan(raw, docId) {
  const { record, applyUpdates } = normalizePlanRecord(raw, docId);
  await persistPlanUpdates(docId, applyUpdates);
  return record;
}

async function getFirestorePlan(docId) {
  const admin = await getFirebaseAdmin();
  if (!admin) return null;
  const snap = await admin.db.collection('users').doc(docId).get();
  if (!snap.exists) return null;
  return finalizePlan(snap.data(), docId);
}

async function ensureFirestorePlan(docId, { uid, displayName, username, email } = {}) {
  const admin = await getFirebaseAdmin();
  if (!admin) return buildDefaultPlan(docId, uid);

  const ref = admin.db.collection('users').doc(docId);
  const snap = await ref.get();
  const now = new Date().toISOString();
  const month = currentCreditsMonth();

  if (!snap.exists) {
    const def = buildDefaultPlan(docId, uid);
    await ref.set({
      uid: uid || docId,
      email: email || null,
      displayName: displayName || username || null,
      role: 'user',
      plan: def.plan,
      credits: def.credits,
      welcomeProCredits: def.welcomeProCredits,
      creditsResetAt: def.creditsResetAt,
      aiCreditsUsedThisMonth: 0,
      aiCreditsLimit: def.aiCreditsLimit,
      aiCreditsMonth: month,
      businessActive: false,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    return def;
  }

  const data = snap.data();
  const merged = {
    ...data,
    email: email || data.email,
    displayName: displayName || data.displayName || username,
  };
  return finalizePlan(merged, docId);
}

function mapSqliteRow(row) {
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    plan: row.plan,
    credits: row.credits,
    creditsResetAt: row.credits_reset_at,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    premiumUntil: row.premium_until,
    welcomeProCredits: row.welcome_pro_credits,
    aiCreditsUsedThisMonth: row.ai_credits_used,
    aiCreditsLimit: row.ai_credits_limit,
    aiCreditsMonth: row.ai_credits_month,
    businessActive: row.business_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSqlitePlan(docId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_plans WHERE user_doc_id = ?').get(docId);
  if (!row) return null;
  return finalizePlan(mapSqliteRow(row), docId);
}

async function ensureSqlitePlan(docId, { uid, email, displayName } = {}) {
  const existing = await getSqlitePlan(docId);
  if (existing) return existing;

  const def = buildDefaultPlan(docId, uid);
  const db = getDb();
  db.prepare(`
    INSERT INTO user_plans (
      user_doc_id, uid, email, display_name, role, plan, credits, credits_reset_at,
      welcome_pro_credits,
      ai_credits_used, ai_credits_limit, ai_credits_month, business_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)
  `).run(
    docId,
    uid || docId,
    email || null,
    displayName || null,
    def.plan,
    def.credits,
    def.creditsResetAt,
    def.welcomeProCredits ?? WELCOME_PRO_CREDITS,
    def.aiCreditsLimit,
    def.aiCreditsMonth,
    def.createdAt,
    def.updatedAt
  );
  return getSqlitePlan(docId);
}

export async function ensureUserPlan(docId, profile = {}) {
  if (useFirebaseDataStore()) {
    return ensureFirestorePlan(docId, profile);
  }
  return ensureSqlitePlan(docId, profile);
}

export async function getUserPlan(docId) {
  if (useFirebaseDataStore()) {
    const plan = await getFirestorePlan(docId);
    if (plan) return plan;
    return ensureFirestorePlan(docId);
  }
  const plan = await getSqlitePlan(docId);
  if (plan) return plan;
  return ensureSqlitePlan(docId);
}

export async function consumeAICredit(docId) {
  return consumeAICredits(docId, 1);
}

export async function consumeAICredits(docId, amount = 1) {
  const credits = Math.max(1, Math.floor(Number(amount) || 1));
  const plan = await getUserPlan(docId);

  if (hasUnlimitedCredits(plan)) {
    return plan;
  }

  const remaining = computeCreditsRemaining(plan);
  if (remaining < credits) {
    const err = new Error(
      `Crediti AI insufficienti: servono ${credits}, ne restano ${Math.max(0, remaining)}`
    );
    err.code = 'AI_CREDITS_EXHAUSTED';
    err.status = 402;
    throw err;
  }

  const used = plan.aiCreditsUsedThisMonth + credits;
  const bonus = Math.max(0, Number(plan.credits) || 0);
  let newBonus = bonus;
  const monthlyRemaining = Math.max(0, plan.aiCreditsLimit - plan.aiCreditsUsedThisMonth);

  if (plan.plan !== 'trial' && monthlyRemaining < credits) {
    newBonus = Math.max(0, bonus - (credits - monthlyRemaining));
  }

  const now = new Date().toISOString();
  const month = currentCreditsMonth();
  const payload = {
    aiCreditsUsedThisMonth: used,
    aiCreditsMonth: month,
    credits: plan.plan === 'trial' ? Math.max(0, plan.aiCreditsLimit - used) : newBonus,
    updatedAt: now,
  };

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set(payload, { merge: true });
    }
  } else {
    const db = getDb();
    db.prepare(`
      UPDATE user_plans
      SET ai_credits_used = ?, ai_credits_month = ?, credits = ?, updated_at = ?
      WHERE user_doc_id = ?
    `).run(used, month, payload.credits, now, docId);
  }

  return { ...plan, ...payload, aiCreditsUsedThisMonth: used };
}

export async function getBillingStatus(docId) {
  const userPlan = await ensureUserPlan(docId);
  const def = getPlanDefinition(userPlan.plan);
  const remaining = computeCreditsRemaining(userPlan);
  const unlimited = hasUnlimitedCredits(userPlan);

  return {
    plan: userPlan.plan,
    planLabel: def.label,
    planDescription: def.description,
    role: userPlan.role || 'user',
    isAdmin: isAdmin(userPlan),
    email: userPlan.email || null,
    displayName: userPlan.displayName || null,
    credits: unlimited ? null : (userPlan.credits ?? remaining),
    creditsRemaining: unlimited ? null : remaining,
    creditsUnlimited: unlimited,
    creditsResetAt: userPlan.creditsResetAt || null,
    trialStartedAt: userPlan.trialStartedAt || null,
    trialEndsAt: userPlan.trialEndsAt || null,
    premiumUntil: userPlan.premiumUntil || null,
    welcomeProCredits: getWelcomeProRemaining(userPlan),
    welcomeProCreditsTotal: userPlan.plan === 'free' ? WELCOME_PRO_CREDITS : 0,
    welcomeProCreditsUsed: getWelcomeProUsed(userPlan),
    aiCreditsUsed: userPlan.aiCreditsUsedThisMonth,
    aiCreditsLimit: unlimited ? null : userPlan.aiCreditsLimit,
    aiCreditsRemaining: unlimited ? null : remaining,
    aiCreditsMonth: userPlan.aiCreditsMonth,
    isPremium: userPlan.plan === 'premium' || userPlan.plan === 'trial' || isAdmin(userPlan)
      || (userPlan.plan === 'business' && userPlan.businessActive),
    isTrial: userPlan.plan === 'trial',
    businessActive: userPlan.businessActive,
    plans: Object.values(PLAN_DEFINITIONS).map((p) => ({
      id: p.id,
      label: p.label,
      aiCreditsLimit: p.aiCreditsLimit,
      aiEnabled: p.id === 'business' ? false : p.aiEnabled,
      creativeStudio: p.creativeStudio,
      description: p.description,
    })),
  };
}

export async function setUserPlan(docId, planId, { businessActive } = {}) {
  if (!PLAN_DEFINITIONS[planId]) {
    throw Object.assign(new Error('Piano non valido'), { status: 400 });
  }
  const def = getPlanDefinition(planId);
  const now = new Date().toISOString();
  const payload = {
    plan: planId,
    aiCreditsLimit: def.aiCreditsLimit,
    credits: def.aiCreditsLimit,
    updatedAt: now,
  };
  if (planId === 'business' && businessActive != null) {
    payload.businessActive = Boolean(businessActive);
  }

  if (useFirebaseDataStore()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.db.collection('users').doc(docId).set(payload, { merge: true });
    }
  } else {
    const db = getDb();
    db.prepare(`
      UPDATE user_plans SET plan = ?, ai_credits_limit = ?, credits = ?, business_active = ?, updated_at = ?
      WHERE user_doc_id = ?
    `).run(
      planId,
      def.aiCreditsLimit,
      def.aiCreditsLimit,
      planId === 'business' && businessActive ? 1 : 0,
      now,
      docId
    );
  }

  logger.info('User plan updated', { docId, plan: planId });
  return getUserPlan(docId);
}

