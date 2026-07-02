import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { activatePremiumSubscription, getUserPlan } from './planService.js';
import { isAdmin } from './adminService.js';
import {
  getStripeClient,
  getStripePriceId,
  isStripeCheckoutReady,
  isStripeConfigured,
} from './stripeService.js';

const VALID_INTERVALS = ['monthly', 'yearly'];

function normalizeInterval(interval) {
  return VALID_INTERVALS.includes(interval) ? interval : 'monthly';
}

/**
 * @returns {Promise<{ mode: 'stripe', url: string, sessionId: string } | { mode: 'mock', checkoutPath: string, plan: string }>}
 */
export async function createCheckoutSession(docId, { email, interval = 'monthly' } = {}) {
  const planInterval = normalizeInterval(interval);
  const plan = await getUserPlan(docId);

  if (isAdmin(plan)) {
    const err = new Error('Gli account Admin hanno già accesso PRO illimitato');
    err.status = 400;
    err.code = 'ADMIN_NO_CHECKOUT';
    throw err;
  }

  if (plan.plan === 'premium' && plan.premiumUntil && new Date(plan.premiumUntil) > new Date()) {
    const err = new Error('Hai già NovaPromo PRO attivo');
    err.status = 400;
    err.code = 'ALREADY_PREMIUM';
    throw err;
  }

  if (isStripeCheckoutReady(planInterval)) {
    const stripe = getStripeClient();
    const priceId = getStripePriceId(planInterval);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/checkout/cancel`,
      client_reference_id: docId,
      customer_email: email || plan.email || undefined,
      metadata: {
        userDocId: docId,
        planInterval,
      },
      subscription_data: {
        metadata: {
          userDocId: docId,
          planInterval,
        },
      },
    });

    return {
      mode: 'stripe',
      url: session.url,
      sessionId: session.id,
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

export async function handleStripeWebhook(rawBody, signature) {
  if (!isStripeConfigured()) {
    const err = new Error('Stripe non configurato');
    err.status = 503;
    throw err;
  }

  const stripe = getStripeClient();
  const webhookSecret = config.stripe.webhookSecret;
  if (!webhookSecret) {
    const err = new Error('STRIPE_WEBHOOK_SECRET non configurato');
    err.status = 503;
    throw err;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const parseErr = new Error(`Webhook Stripe non valido: ${err.message}`);
    parseErr.status = 400;
    throw parseErr;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const docId = session.metadata?.userDocId || session.client_reference_id;
      const interval = session.metadata?.planInterval || 'monthly';
      if (docId) {
        await activatePremiumSubscription(docId, { interval, source: 'stripe' });
        logger.info('Stripe checkout completed', { docId, interval });
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const docId = subscription.metadata?.userDocId;
      if (docId && subscription.status === 'canceled') {
        logger.info('Stripe subscription canceled', { docId });
      }
      break;
    }
    default:
      logger.info('Stripe webhook ignored', { type: event.type });
  }

  return { received: true };
}

export function getPaymentsInfo() {
  const stripeConfigured = isStripeConfigured();
  return {
    stripeConfigured,
    stripeCheckoutReady: isStripeCheckoutReady('monthly') || isStripeCheckoutReady('yearly'),
    mockCheckoutAvailable: !stripeConfigured || !config.stripe.disableMockWhenStripeConfigured,
    paymentsEnabled: stripeConfigured || !config.stripe.disableMockWhenStripeConfigured,
    paymentsMode: stripeConfigured && isStripeCheckoutReady('monthly')
      ? 'stripe'
      : 'mock',
    testMode: !stripeConfigured,
  };
}
