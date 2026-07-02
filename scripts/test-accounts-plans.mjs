/**
 * Account, plans, welcome PRO credits, billing tests.
 * Run: npm run test:accounts-plans
 */
import { isAdmin, hasUnlimitedCredits } from '../backend/src/services/adminService.js';
import {
  canUseAI,
  canUseCreativeStudio,
  canRegenerateCreativeImage,
  isPremiumPlan,
} from '../backend/src/services/featureGate.js';
import {
  computeCreditsRemaining,
  getWelcomeProRemaining,
  getWelcomeProUsed,
} from '../backend/src/services/planService.js';
import { PLAN_DEFINITIONS } from '../backend/src/constants/plans.js';
import { WELCOME_PRO_CREDITS } from '../backend/src/constants/welcomePro.js';
import {
  getPaymentsInfo,
} from '../backend/src/services/billingCheckoutService.js';
import { isStripeConfigured } from '../backend/src/services/stripeService.js';

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

const future = new Date(Date.now() + 7 * 86400000).toISOString();

const trialUser = {
  plan: 'trial',
  role: 'user',
  aiCreditsUsedThisMonth: 10,
  aiCreditsLimit: 100,
  trialEndsAt: future,
  businessActive: false,
};

const freeUser = {
  plan: 'free',
  role: 'user',
  aiCreditsUsedThisMonth: 0,
  aiCreditsLimit: 30,
  welcomeProCredits: 0,
  businessActive: false,
};

const freeWithWelcome = {
  ...freeUser,
  welcomeProCredits: 3,
};

const premiumUser = {
  plan: 'premium',
  role: 'user',
  aiCreditsUsedThisMonth: 5,
  aiCreditsLimit: 300,
  premiumUntil: future,
  businessActive: false,
};

const adminUser = {
  plan: 'premium',
  role: 'admin',
  email: 'admin@test.com',
  aiCreditsUsedThisMonth: 0,
  aiCreditsLimit: 999999,
  credits: 999999,
  businessActive: false,
};

console.log('\nAccounts / plans / billing tests\n');

assert(PLAN_DEFINITIONS.free.aiCreditsLimit === 30, 'free has 30 monthly credits');
assert(PLAN_DEFINITIONS.premium.aiCreditsLimit === 300, 'premium has 300 credits');
assert(WELCOME_PRO_CREDITS === 3, 'welcome PRO credits = 3');

assert(getWelcomeProRemaining(freeWithWelcome) === 3, 'welcome remaining computed');
assert(getWelcomeProUsed(freeWithWelcome) === 0, 'welcome used starts at 0');
assert(getWelcomeProRemaining(freeUser) === 0, 'free without welcome = 0');

assert(isPremiumPlan(trialUser) === true, 'legacy trial is premium-tier');
assert(canUseCreativeStudio(trialUser).allowed === true, 'legacy trial can use Creative Studio');
assert(canUseCreativeStudio(freeUser).allowed === false, 'free without welcome blocked');
assert(canUseCreativeStudio(freeWithWelcome).allowed === true, 'free with welcome can use Creative Studio');
assert(canUseCreativeStudio(freeWithWelcome).usingWelcomeCredits === true, 'welcome flag set');
assert(canRegenerateCreativeImage(freeWithWelcome).allowed === false, 'regenerate blocked on free welcome');
assert(canUseCreativeStudio(premiumUser).allowed === true, 'premium can use Creative Studio');
assert(canUseCreativeStudio(adminUser).allowed === true, 'admin can use Creative Studio');

assert(hasUnlimitedCredits(adminUser) === true, 'admin has unlimited credits');
assert(canUseAI(freeUser).allowed === true, 'free can use AI text when credits remain');
assert(isAdmin(adminUser) === true, 'admin role detected');

const payments = getPaymentsInfo();
assert(typeof payments.paymentsEnabled === 'boolean', 'payments info exposes paymentsEnabled');
assert(
  payments.paymentsMode === (isStripeConfigured() ? 'stripe' : 'mock'),
  'payments mode matches stripe config'
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
