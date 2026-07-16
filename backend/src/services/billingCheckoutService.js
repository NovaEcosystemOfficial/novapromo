/**
 * Billing checkout facade — re-exports subscription lifecycle service.
 * Keeps existing import paths stable.
 */
export {
  createCheckoutSession,
  activateMockPremium,
  createBillingPortalSession,
  handleStripeWebhook,
  getPaymentsInfo,
  ensureStripeCustomer,
} from './stripeSubscriptionService.js';
