import { useFirebaseDataStore } from './firebase/dataStore.js';

/** In-memory store for unit tests (STRIPE_EVENT_STORE=memory) */
const memoryClaimedEvents = new Set();

/**
 * Claim a Stripe event for idempotent processing.
 * @returns {Promise<boolean>} true if this process should handle the event
 */
export async function claimStripeEvent(eventId, eventType) {
  if (!eventId) return false;
  const now = new Date().toISOString();

  if (process.env.STRIPE_EVENT_STORE === 'memory') {
    if (memoryClaimedEvents.has(eventId)) return false;
    memoryClaimedEvents.add(eventId);
    return true;
  }

  if (useFirebaseDataStore()) {
    const { getFirebaseAdmin } = await import('./firebase/admin.js');
    const admin = await getFirebaseAdmin();
    if (!admin) return true;
    const ref = admin.db.collection('stripe_webhook_events').doc(eventId);
    try {
      await ref.create({
        eventId,
        type: eventType || null,
        processedAt: now,
      });
      return true;
    } catch (err) {
      const code = err.code;
      if (code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS') {
        return false;
      }
      if (/already exists/i.test(err.message || '')) return false;
      throw err;
    }
  }

  const { getDb } = await import('../db/index.js');
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO stripe_webhook_events (event_id, type, processed_at)
      VALUES (?, ?, ?)
    `).run(eventId, eventType || null, now);
    return true;
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE') || err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return false;
    }
    throw err;
  }
}

export async function wasStripeEventProcessed(eventId) {
  if (!eventId) return false;

  if (process.env.STRIPE_EVENT_STORE === 'memory') {
    return memoryClaimedEvents.has(eventId);
  }

  if (useFirebaseDataStore()) {
    const { getFirebaseAdmin } = await import('./firebase/admin.js');
    const admin = await getFirebaseAdmin();
    if (!admin) return false;
    const snap = await admin.db.collection('stripe_webhook_events').doc(eventId).get();
    return snap.exists;
  }

  const { getDb } = await import('../db/index.js');
  const db = getDb();
  const row = db.prepare('SELECT event_id FROM stripe_webhook_events WHERE event_id = ?').get(eventId);
  return Boolean(row);
}

/**
 * Pure helpers for subscription → user field mapping (unit-testable).
 */
export function periodEndToIso(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

export function extractPriceId(subscription) {
  return subscription?.items?.data?.[0]?.price?.id
    || subscription?.items?.data?.[0]?.price
    || null;
}

export function extractCustomerId(obj) {
  if (!obj) return null;
  if (typeof obj.customer === 'string') return obj.customer;
  if (obj.customer?.id) return obj.customer.id;
  return null;
}

export function extractSubscriptionId(obj) {
  if (!obj) return null;
  if (typeof obj.subscription === 'string') return obj.subscription;
  if (obj.subscription?.id) return obj.subscription.id;
  if (obj.id && obj.object === 'subscription') return obj.id;
  return null;
}

export function resolveUserDocIdFromStripeObject(obj) {
  return obj?.metadata?.userDocId
    || obj?.metadata?.firebaseUid
    || obj?.client_reference_id
    || null;
}

/**
 * Build Firestore/user patch from a Stripe Subscription object.
 */
export function buildSubscriptionSyncPatch(subscription, { eventId, billingStatus } = {}) {
  const periodEnd = periodEndToIso(subscription.current_period_end);
  const status = subscription.status || null;
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  const patch = {
    stripeCustomerId: extractCustomerId(subscription),
    stripeSubscriptionId: subscription.id || null,
    stripePriceId: extractPriceId(subscription),
    stripeSubscriptionStatus: status,
    stripeCurrentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
    premiumUntil: periodEnd,
    lastStripeEventId: eventId || null,
    updatedAt: new Date().toISOString(),
  };

  if (billingStatus) {
    patch.billingStatus = billingStatus;
  } else if (status === 'past_due' || status === 'unpaid') {
    patch.billingStatus = 'past_due';
  } else if (status === 'active' || status === 'trialing') {
    patch.billingStatus = 'active';
  } else if (status === 'canceled') {
    patch.billingStatus = 'canceled';
  }

  const keepPremium = ['active', 'trialing', 'past_due'].includes(status)
    || (cancelAtPeriodEnd && periodEnd && new Date(periodEnd) > new Date());

  if (keepPremium && status !== 'canceled') {
    patch.plan = 'premium';
  }

  return patch;
}

export function shouldResetCreditsOnInvoice(invoice) {
  return invoice?.billing_reason === 'subscription_cycle';
}

export function buildDowngradePatch({ eventId } = {}) {
  return {
    plan: 'free',
    premiumUntil: null,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: 'canceled',
    stripeCurrentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    billingStatus: 'canceled',
    stripePriceId: null,
    lastStripeEventId: eventId || null,
    updatedAt: new Date().toISOString(),
  };
}
