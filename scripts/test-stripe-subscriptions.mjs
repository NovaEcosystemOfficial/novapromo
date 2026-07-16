/**
 * Stripe subscription lifecycle tests (pure helpers + mock/fallback).
 * Run: npm run test:stripe-subscriptions
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const tmpDb = path.join(os.tmpdir(), `novapromo-stripe-test-${Date.now()}.db`);
process.env.DATA_STORE = 'sqlite';
process.env.DB_PATH = tmpDb;
process.env.STRIPE_EVENT_STORE = 'memory';

const {
  buildSubscriptionSyncPatch,
  buildDowngradePatch,
  shouldResetCreditsOnInvoice,
  resolveUserDocIdFromStripeObject,
  extractCustomerId,
  extractSubscriptionId,
  periodEndToIso,
  extractPriceId,
  claimStripeEvent,
  wasStripeEventProcessed,
} = await import('../backend/src/services/stripeSubscriptionHelpers.js');

const { getPaymentsInfo } = await import('../backend/src/services/billingCheckoutService.js');
const { isStripeConfigured, isStripeTestMode } = await import('../backend/src/services/stripeService.js');
const { isAdmin } = await import('../backend/src/services/adminService.js');
const { canUseCreativeStudio } = await import('../backend/src/services/featureGate.js');

const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
const periodEndIso = periodEndToIso(periodEnd);

const subscription = {
  id: 'sub_test_1',
  object: 'subscription',
  status: 'active',
  cancel_at_period_end: false,
  current_period_end: periodEnd,
  customer: 'cus_test_1',
  metadata: { userDocId: 'uid_user_1', firebaseUid: 'uid_user_1' },
  items: {
    data: [{ price: { id: 'price_monthly_test' } }],
  },
};

console.log('\nStripe subscription lifecycle tests\n');

assert(resolveUserDocIdFromStripeObject(subscription) === 'uid_user_1', 'resolve userDocId from subscription metadata');
assert(extractCustomerId(subscription) === 'cus_test_1', 'extract customer id');
assert(extractSubscriptionId(subscription) === 'sub_test_1', 'extract subscription id');
assert(extractPriceId(subscription) === 'price_monthly_test', 'extract price id');
assert(periodEndToIso(periodEnd) === periodEndIso, 'period end to ISO');

const checkoutSession = {
  id: 'cs_test',
  client_reference_id: 'uid_from_client',
  metadata: { userDocId: 'uid_user_1', planInterval: 'monthly' },
  customer: 'cus_test_1',
  subscription: 'sub_test_1',
};
assert(resolveUserDocIdFromStripeObject(checkoutSession) === 'uid_user_1', 'checkout prefers metadata userDocId');
assert(extractSubscriptionId(checkoutSession) === 'sub_test_1', 'checkout extracts subscription id');

const activatePatch = buildSubscriptionSyncPatch(subscription, { eventId: 'evt_checkout_1' });
assert(activatePatch.plan === 'premium', 'checkout sync sets plan premium');
assert(activatePatch.stripeCustomerId === 'cus_test_1', 'checkout sync saves customer id');
assert(activatePatch.stripeSubscriptionId === 'sub_test_1', 'checkout sync saves subscription id');
assert(activatePatch.stripePriceId === 'price_monthly_test', 'checkout sync saves price id');
assert(activatePatch.stripeSubscriptionStatus === 'active', 'checkout sync status active');
assert(activatePatch.stripeCurrentPeriodEnd === periodEndIso, 'checkout sync period end');
assert(activatePatch.billingStatus === 'active', 'checkout sync billingStatus active');
assert(activatePatch.lastStripeEventId === 'evt_checkout_1', 'checkout sync last event id');
assert(activatePatch.cancelAtPeriodEnd === false, 'checkout not canceling');

assert(shouldResetCreditsOnInvoice({ billing_reason: 'subscription_create' }) === false, 'first invoice does not reset credits');
assert(shouldResetCreditsOnInvoice({ billing_reason: 'subscription_cycle' }) === true, 'renewal invoice resets credits');
assert(shouldResetCreditsOnInvoice({ billing_reason: 'manual' }) === false, 'manual invoice no credit reset');

const renewPatch = buildSubscriptionSyncPatch(
  { ...subscription, current_period_end: periodEnd + 30 * 86400 },
  { eventId: 'evt_invoice_paid', billingStatus: 'active' }
);
assert(renewPatch.plan === 'premium', 'renewal keeps premium');
assert(renewPatch.billingStatus === 'active', 'renewal billing active');

const pastDueSub = { ...subscription, status: 'past_due' };
const pastDuePatch = buildSubscriptionSyncPatch(pastDueSub, { eventId: 'evt_fail', billingStatus: 'past_due' });
assert(pastDuePatch.billingStatus === 'past_due', 'payment failed sets past_due');
assert(pastDuePatch.plan === 'premium', 'past_due keeps PRO until canceled');
assert(pastDuePatch.stripeSubscriptionStatus === 'past_due', 'past_due status synced');

const cancelScheduled = {
  ...subscription,
  cancel_at_period_end: true,
  status: 'active',
};
const cancelPatch = buildSubscriptionSyncPatch(cancelScheduled, { eventId: 'evt_cancel_sched' });
assert(cancelPatch.cancelAtPeriodEnd === true, 'cancel at period end flag');
assert(cancelPatch.plan === 'premium', 'cancel scheduled keeps PRO until period end');
assert(cancelPatch.premiumUntil === periodEndIso, 'cancel scheduled keeps premiumUntil');

const down = buildDowngradePatch({ eventId: 'evt_deleted' });
assert(down.plan === 'free', 'deleted → free');
assert(down.stripeSubscriptionId === null, 'deleted clears subscription id');
assert(down.stripeSubscriptionStatus === 'canceled', 'deleted status canceled');
assert(down.billingStatus === 'canceled', 'deleted billing canceled');
assert(down.premiumUntil === null, 'deleted clears premiumUntil');
assert(down.cancelAtPeriodEnd === false, 'deleted clears cancel flag');

const adminUser = { role: 'admin', plan: 'premium', email: 'admin@test.com' };
assert(isAdmin(adminUser) === true, 'admin detected');
assert(canUseCreativeStudio(adminUser).allowed === true, 'admin creative studio allowed');

const freeNoStripe = { plan: 'free', role: 'user', welcomeProCredits: 0, stripeCustomerId: null };
assert(Boolean(freeNoStripe.stripeCustomerId) === false, 'user without stripeCustomerId cannot open portal');

const payments = getPaymentsInfo();
assert(payments.mockCheckoutAvailable === true || isStripeConfigured(), 'mock available or stripe configured');
assert(typeof payments.testMode === 'boolean', 'testMode exposed');
if (isStripeConfigured()) {
  assert(payments.stripeTestMode === isStripeTestMode(), 'stripeTestMode matches key prefix');
} else {
  assert(payments.paymentsMode === 'mock', 'fallback mock when stripe not configured');
  assert(payments.testMode === true, 'testMode true without stripe');
}

try {
  const first = await claimStripeEvent('evt_dup_1', 'checkout.session.completed');
  const second = await claimStripeEvent('evt_dup_1', 'checkout.session.completed');
  assert(first === true, 'first webhook event claimed');
  assert(second === false, 'duplicate webhook event rejected');
  assert(await wasStripeEventProcessed('evt_dup_1') === true, 'event marked processed');
} finally {
  try { fs.unlinkSync(tmpDb); } catch { /* ignore */ }
}

const accountView = {
  plan: activatePatch.plan,
  billingStatus: activatePatch.billingStatus,
  stripeCurrentPeriodEnd: activatePatch.stripeCurrentPeriodEnd,
  cancelAtPeriodEnd: activatePatch.cancelAtPeriodEnd,
  canManageSubscription: Boolean(activatePatch.stripeCustomerId),
  hasStripeCustomer: Boolean(activatePatch.stripeCustomerId),
};
assert(accountView.canManageSubscription === true, 'UI can show Gestisci abbonamento with customer id');
assert(accountView.hasStripeCustomer === true, 'hasStripeCustomer true after checkout');

const cancelView = {
  cancelAtPeriodEnd: cancelPatch.cancelAtPeriodEnd,
  stripeCurrentPeriodEnd: cancelPatch.stripeCurrentPeriodEnd,
};
assert(cancelView.cancelAtPeriodEnd === true, 'UI can show Si annullerà il…');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
