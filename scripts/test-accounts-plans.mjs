/**
 * Account, plans, trial, admin, coupon tests (no Firebase calls).
 * Run: npm run test:accounts-plans
 */
import { isAdmin, hasUnlimitedCredits } from '../backend/src/services/adminService.js';
import { canUseAI, canUseCreativeStudio, isPremiumPlan } from '../backend/src/services/featureGate.js';
import { computeCreditsRemaining } from '../backend/src/services/planService.js';
import { PLAN_DEFINITIONS } from '../backend/src/constants/plans.js';

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
const past = new Date(Date.now() - 86400000).toISOString();

const trialUser = {
  plan: 'trial',
  role: 'user',
  aiCreditsUsedThisMonth: 10,
  aiCreditsLimit: 100,
  trialEndsAt: future,
  businessActive: false,
};

const expiredTrialUser = {
  ...trialUser,
  trialEndsAt: past,
};

const freeUser = {
  plan: 'free',
  role: 'user',
  aiCreditsUsedThisMonth: 0,
  aiCreditsLimit: 30,
  businessActive: false,
};

const premiumUser = {
  plan: 'premium',
  role: 'user',
  aiCreditsUsedThisMonth: 5,
  aiCreditsLimit: 300,
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

console.log('\nAccounts / plans tests\n');

assert(PLAN_DEFINITIONS.trial.aiCreditsLimit === 100, 'trial has 100 credits');
assert(PLAN_DEFINITIONS.free.aiCreditsLimit === 30, 'free has 30 monthly credits');
assert(PLAN_DEFINITIONS.premium.aiCreditsLimit === 300, 'premium has 300 credits');

assert(isPremiumPlan(trialUser) === true, 'trial is premium-tier for features');
assert(canUseCreativeStudio(trialUser).allowed === true, 'trial can use Creative Studio');
assert(canUseCreativeStudio(freeUser).allowed === false, 'free blocked from Creative Studio');
assert(canUseCreativeStudio(premiumUser).allowed === true, 'premium can use Creative Studio');
assert(canUseCreativeStudio(adminUser).allowed === true, 'admin can use Creative Studio');

assert(hasUnlimitedCredits(adminUser) === true, 'admin has unlimited credits');
assert(computeCreditsRemaining(trialUser) === 90, 'trial remaining credits computed');
assert(canUseAI(freeUser).allowed === true, 'free can use AI text when credits remain');

assert(isAdmin(adminUser) === true, 'admin role detected');
assert(isAdmin(freeUser) === false, 'free user not admin');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
