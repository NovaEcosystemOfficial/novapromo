import { handleStripeWebhook } from '../services/billingCheckoutService.js';
import { logger } from '../utils/logger.js';

export async function stripeWebhookHandler(req, res) {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Header stripe-signature mancante' });
    }
    const result = await handleStripeWebhook(req.body, signature);
    res.json(result);
  } catch (err) {
    logger.error('Stripe webhook error', { error: err.message });
    res.status(err.status || 500).json({ error: err.message });
  }
}
