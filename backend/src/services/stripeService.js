import Stripe from 'stripe';
import { config } from '../config.js';

let stripeClient = null;

export function isStripeConfigured() {
  return Boolean(config.stripe.secretKey);
}

export function isStripeTestMode() {
  const key = config.stripe.secretKey || '';
  return key.startsWith('sk_test_');
}

export function isStripeCheckoutReady(interval = 'monthly') {
  if (!isStripeConfigured()) return false;
  const priceId = interval === 'yearly'
    ? config.stripe.priceYearly
    : config.stripe.priceMonthly;
  return Boolean(priceId);
}

export function getStripeClient() {
  if (!isStripeConfigured()) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return stripeClient;
}

export function getStripePriceId(interval = 'monthly') {
  return interval === 'yearly'
    ? config.stripe.priceYearly
    : config.stripe.priceMonthly;
}
