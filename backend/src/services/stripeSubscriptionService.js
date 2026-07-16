import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { getUserPlan, applyUserBillingPatch, activatePremiumSubscription } from './planService.js';
import { isAdmin } from './adminService.js';
import {
  getStripeClient,
  isStripeConfigured,
  isStripeCheckoutReady,
  getStripePriceId,
  isStripeTestMode,
} from './stripeService.js';
import {
  claimStripeEvent,
  buildSubscriptionSyncPatch,
  buildDowngradePatch,
  shouldResetCreditsOnInvoice,
  resolveUserDocIdFromStripeObject,
  extractCustomerId,
  extractSubscriptionId,
  periodEndToIso,
  extractPriceId,
} from './stripeSubscriptionHelpers.js';
import { PLAN_DEFINITIONS, currentCreditsMonth, nextCreditsResetAt } from '../constants/plans.js';

const VALID_INTERVALS = ['monthly', 'yearly'];

function normalizeInterval(interval) {
  return VALID_INTERVALS.includes(interval) ? interval : 'monthly';
}

async function retrieveSubscription(stripe, subscriptionId) {
  if (!subscriptionId) return null;
  if (typeof subscriptionId === 'object' && subscriptionId.id) return subscriptionId;
  return stripe.subscriptions.retrieve(String(subscriptionId));
}

/**
 * Ensure a Stripe Customer exists for the NovaPromo user (UID + email in metadata).
 */
export async function ensureStripeCustomer(docId, { email } = {}) {
  const stripe = getStripeClient();
  if (!stripe) {
    const err = new Error('Stripe non configurato');
    err.status = 503;
    throw err;
  }

  const plan = await getUserPlan(docId);
  if (plan.stripeCustomerId) {
    return plan.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: email || plan.email || undefined,
    metadata: {
      userDocId: docId,
      firebaseUid: docId,
      email: email || plan.email || '',
    },
  });

  await applyUserBillingPatch(docId, {
    stripeCustomerId: customer.id,
    updatedAt: new Date().toISOString(),
  });

  return customer.id;
}

export async function createCheckoutSession(docId, { email, interval = 'monthly' } = {}) {
  const planInterval = normalizeInterval(interval);
  const plan = await getUserPlan(docId);

  if (isAdmin(plan)) {
    const err = new Error('Gli account Admin hanno già accesso PRO illimitato');
    err.status = 400;
    err.code = 'ADMIN_NO_CHECKOUT';
    throw err;
  }

  const hasActiveStripeSub = Boolean(plan.stripeSubscriptionId)
    && ['active', 'trialing', 'past_due'].includes(plan.stripeSubscriptionStatus);

  if (hasActiveStripeSub) {
    const err = new Error('Hai già un abbonamento NovaPromo PRO attivo');
    err.status = 400;
    err.code = 'ALREADY_PREMIUM';
    throw err;
  }

  if (isStripeCheckoutReady(planInterval)) {
    const stripe = getStripeClient();
    const priceId = getStripePriceId(planInterval);
    const customerId = await ensureStripeCustomer(docId, {
      email: email || plan.email,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/checkout/cancel`,
      client_reference_id: docId,
      metadata: {
        userDocId: docId,
        firebaseUid: docId,
        planInterval,
        email: email || plan.email || '',
      },
      subscription_data: {
        metadata: {
          userDocId: docId,
          firebaseUid: docId,
          planInterval,
          email: email || plan.email || '',
        },
      },
    });

    return {
      mode: 'stripe',
      url: session.url,
      sessionId: session.id,
      testMode: isStripeTestMode(),
    };
  }

  return {
    mode: 'mock',
    checkoutPath: `/checkout/mock?plan=${planInterval}`,
    plan: planInterval,
    testMode: true,
  };
}

export async function activateMockPremium(docId, { interval = 'monthly' } = {}) {
  if (isStripeConfigured() && config.stripe.disableMockWhenStripeConfigured) {
    const err = new Error('Checkout mock disabilitato — Stripe è configurato. Usa il pagamento reale.');
    err.status = 403;
    err.code = 'MOCK_CHECKOUT_DISABLED';
    throw err;
  }

  const plan = await getUserPlan(docId);
  if (isAdmin(plan)) {
    const err = new Error('Gli account Admin hanno già accesso PRO illimitato');
    err.status = 400;
    err.code = 'ADMIN_NO_CHECKOUT';
    throw err;
  }

  const updated = await activatePremiumSubscription(docId, {
    interval: normalizeInterval(interval),
    source: 'mock',
  });

  logger.info('Mock premium activated', { docId, interval });
  return { testMode: true, plan: updated };
}

export async function createBillingPortalSession(docId) {
  const plan = await getUserPlan(docId);

  if (isAdmin(plan)) {
    const err = new Error('Gli account Admin non gestiscono abbonamenti Stripe');
    err.status = 400;
    err.code = 'ADMIN_NO_PORTAL';
    throw err;
  }

  if (!plan.stripeCustomerId) {
    const err = new Error('Nessun abbonamento Stripe collegato. Attiva PRO prima di gestire il pagamento.');
    err.status = 400;
    err.code = 'NO_STRIPE_CUSTOMER';
    throw err;
  }

  if (!isStripeConfigured()) {
    const err = new Error('Stripe non configurato');
    err.status = 503;
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: plan.stripeCustomerId,
    return_url: `${config.frontendUrl}/accounts`,
  });

  return {
    url: session.url,
    testMode: isStripeTestMode(),
  };
}

async function resolveDocIdFromSubscription(stripe, subscription) {
  let docId = resolveUserDocIdFromStripeObject(subscription);
  if (docId) return docId;

  const customerId = extractCustomerId(subscription);
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(customerId);
  docId = resolveUserDocIdFromStripeObject(customer);
  if (docId) return docId;

  // Fallback: find user by stripeCustomerId in plan (via getUserPlan is per-doc — skip scan in serverless)
  return null;
}

async function syncSubscriptionToUser(docId, subscription, { eventId, resetCredits = false, billingStatus } = {}) {
  const patch = buildSubscriptionSyncPatch(subscription, { eventId, billingStatus });
  patch.premiumSource = 'stripe';

  if (resetCredits || (patch.plan === 'premium' && !subscription)) {
    // no-op guard
  }

  if (resetCredits) {
    const def = PLAN_DEFINITIONS.premium;
    patch.aiCreditsLimit = def.aiCreditsLimit;
    patch.credits = def.aiCreditsLimit;
    patch.aiCreditsUsedThisMonth = 0;
    patch.aiCreditsMonth = currentCreditsMonth();
    patch.creditsResetAt = nextCreditsResetAt();
  }

  await applyUserBillingPatch(docId, patch);
  return patch;
}

async function activateFromCheckout(docId, subscription, { eventId, interval } = {}) {
  const periodEnd = periodEndToIso(subscription?.current_period_end);
  const def = PLAN_DEFINITIONS.premium;
  const now = new Date().toISOString();

  const patch = {
    plan: 'premium',
    premiumUntil: periodEnd || undefined,
    premiumSource: 'stripe',
    aiCreditsLimit: def.aiCreditsLimit,
    credits: def.aiCreditsLimit,
    aiCreditsUsedThisMonth: 0,
    aiCreditsMonth: currentCreditsMonth(),
    creditsResetAt: nextCreditsResetAt(),
    billingStatus: 'active',
    stripeCustomerId: extractCustomerId(subscription),
    stripeSubscriptionId: subscription?.id || null,
    stripePriceId: extractPriceId(subscription),
    stripeSubscriptionStatus: subscription?.status || 'active',
    stripeCurrentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    lastStripeEventId: eventId || null,
    updatedAt: now,
  };

  // If Stripe didn't return period end yet, fall back to interval days
  if (!patch.premiumUntil) {
    const days = interval === 'yearly' ? 365 : 30;
    const d = new Date();
    d.setDate(d.getDate() + days);
    patch.premiumUntil = d.toISOString();
  }

  await applyUserBillingPatch(docId, patch);
  logger.info('PRO activated from Stripe checkout', { docId, subscriptionId: subscription?.id });
  return patch;
}

export async function handleCheckoutSessionCompleted(session, { eventId, stripe } = {}) {
  const docId = resolveUserDocIdFromStripeObject(session);
  if (!docId) {
    logger.warn('checkout.session.completed without userDocId');
    return { skipped: true };
  }

  const subscriptionId = extractSubscriptionId(session);
  const subscription = await retrieveSubscription(stripe, subscriptionId);
  const interval = session.metadata?.planInterval || 'monthly';

  if (subscription) {
    await activateFromCheckout(docId, subscription, { eventId, interval });
  } else {
    // Payment complete but subscription not expanded — still activate with session data
    await activatePremiumSubscription(docId, { interval, source: 'stripe' });
    await applyUserBillingPatch(docId, {
      stripeCustomerId: extractCustomerId(session),
      stripeSubscriptionId: subscriptionId,
      billingStatus: 'active',
      lastStripeEventId: eventId,
      premiumSource: 'stripe',
    });
  }

  return { activated: true, docId };
}

export async function handleInvoicePaid(invoice, { eventId, stripe } = {}) {
  const subscriptionId = extractSubscriptionId(invoice);
  if (!subscriptionId) {
    return { skipped: true, reason: 'not_subscription_invoice' };
  }

  const subscription = await retrieveSubscription(stripe, subscriptionId);
  if (!subscription) return { skipped: true };

  const docId = await resolveDocIdFromSubscription(stripe, subscription);
  if (!docId) {
    logger.warn('invoice.paid without userDocId', { subscriptionId });
    return { skipped: true };
  }

  const resetCredits = shouldResetCreditsOnInvoice(invoice);
  await syncSubscriptionToUser(docId, subscription, {
    eventId,
    resetCredits,
    billingStatus: 'active',
  });

  return { renewed: true, docId, resetCredits };
}

export async function handleInvoicePaymentFailed(invoice, { eventId, stripe } = {}) {
  const subscriptionId = extractSubscriptionId(invoice);
  if (!subscriptionId) {
    return { skipped: true, reason: 'not_subscription_invoice' };
  }

  const subscription = await retrieveSubscription(stripe, subscriptionId);
  const docId = subscription
    ? await resolveDocIdFromSubscription(stripe, subscription)
    : resolveUserDocIdFromStripeObject(invoice);

  if (!docId) {
    logger.warn('invoice.payment_failed without userDocId');
    return { skipped: true };
  }

  if (subscription) {
    await syncSubscriptionToUser(docId, subscription, {
      eventId,
      billingStatus: 'past_due',
    });
  } else {
    await applyUserBillingPatch(docId, {
      billingStatus: 'past_due',
      stripeSubscriptionStatus: 'past_due',
      lastStripeEventId: eventId,
    });
  }

  return { pastDue: true, docId };
}

export async function handleSubscriptionUpdated(subscription, { eventId } = {}) {
  const docId = resolveUserDocIdFromStripeObject(subscription);
  if (!docId) {
    logger.warn('subscription.updated without userDocId', { id: subscription.id });
    return { skipped: true };
  }

  // Canceled at period end: keep PRO until current_period_end
  if (subscription.cancel_at_period_end && subscription.status !== 'canceled') {
    await syncSubscriptionToUser(docId, subscription, { eventId });
    return { cancelScheduled: true, docId };
  }

  if (subscription.status === 'canceled') {
    const patch = buildDowngradePatch({ eventId });
    // Keep stripeCustomerId for portal / re-subscribe
    const plan = await getUserPlan(docId);
    patch.stripeCustomerId = plan.stripeCustomerId || extractCustomerId(subscription);
    await applyUserBillingPatch(docId, patch);
    return { downgraded: true, docId };
  }

  await syncSubscriptionToUser(docId, subscription, { eventId });
  return { synced: true, docId };
}

export async function handleSubscriptionDeleted(subscription, { eventId } = {}) {
  const docId = resolveUserDocIdFromStripeObject(subscription);
  if (!docId) {
    logger.warn('subscription.deleted without userDocId', { id: subscription.id });
    return { skipped: true };
  }

  const plan = await getUserPlan(docId);
  const patch = buildDowngradePatch({ eventId });
  patch.stripeCustomerId = plan.stripeCustomerId || extractCustomerId(subscription);
  // Preserve drafts/history — only change plan fields
  await applyUserBillingPatch(docId, patch);
  logger.info('Subscription deleted — downgraded to free', { docId });
  return { downgraded: true, docId };
}

export async function handleStripeWebhook(rawBody, signature) {
  if (!isStripeConfigured()) {
    const err = new Error('Stripe non configurato');
    err.status = 503;
    throw err;
  }

  const webhookSecret = config.stripe.webhookSecret;
  if (!webhookSecret) {
    const err = new Error('STRIPE_WEBHOOK_SECRET non configurato');
    err.status = 503;
    throw err;
  }

  const stripe = getStripeClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const parseErr = new Error(`Webhook Stripe non valido: ${err.message}`);
    parseErr.status = 400;
    throw parseErr;
  }

  const claimed = await claimStripeEvent(event.id, event.type);
  if (!claimed) {
    logger.info('Stripe webhook duplicate ignored', { id: event.id, type: event.type });
    return { received: true, duplicate: true };
  }

  const ctx = { eventId: event.id, stripe };
  let result = {};

  switch (event.type) {
    case 'checkout.session.completed':
      result = await handleCheckoutSessionCompleted(event.data.object, ctx);
      break;
    case 'invoice.paid':
      result = await handleInvoicePaid(event.data.object, ctx);
      break;
    case 'invoice.payment_failed':
      result = await handleInvoicePaymentFailed(event.data.object, ctx);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      result = await handleSubscriptionUpdated(event.data.object, ctx);
      break;
    case 'customer.subscription.deleted':
      result = await handleSubscriptionDeleted(event.data.object, ctx);
      break;
    default:
      logger.info('Stripe webhook ignored', { type: event.type });
      result = { ignored: true };
  }

  return { received: true, type: event.type, ...result };
}

export function getPaymentsInfo() {
  const stripeConfigured = isStripeConfigured();
  const testMode = !stripeConfigured || isStripeTestMode();
  return {
    stripeConfigured,
    stripeCheckoutReady: isStripeCheckoutReady('monthly') || isStripeCheckoutReady('yearly'),
    mockCheckoutAvailable: !stripeConfigured || !config.stripe.disableMockWhenStripeConfigured,
    paymentsEnabled: stripeConfigured || !config.stripe.disableMockWhenStripeConfigured,
    paymentsMode: stripeConfigured && isStripeCheckoutReady('monthly')
      ? 'stripe'
      : 'mock',
    testMode,
    stripeTestMode: isStripeTestMode(),
  };
}
