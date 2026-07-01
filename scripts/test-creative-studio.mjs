/**
 * Creative Studio PRO gate & credit tests (no OpenAI calls).
 * Run: npm run test:creative-studio
 */
import { canUseCreativeStudio, isPremiumPlan } from '../backend/src/services/featureGate.js';
import { AI_CREDIT_COSTS, CREATIVE_FORMATS, CREATIVE_STUDIO_DAILY_LIMIT } from '../backend/src/constants/aiCredits.js';
import { resolveImageSize } from '../backend/src/services/openaiImageService.js';
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

console.log('\nCreative Studio PRO tests\n');

const freeUser = {
  plan: 'free',
  aiCreditsUsedThisMonth: 0,
  aiCreditsLimit: PLAN_DEFINITIONS.free.aiCreditsLimit,
  businessActive: false,
};

const premiumUser = {
  plan: 'premium',
  aiCreditsUsedThisMonth: 10,
  aiCreditsLimit: PLAN_DEFINITIONS.premium.aiCreditsLimit,
  businessActive: false,
};

const premiumLowCredits = {
  ...premiumUser,
  aiCreditsUsedThisMonth: 298,
};

assert(canUseCreativeStudio(freeUser).allowed === false, 'free user blocked from Creative Studio');
assert(canUseCreativeStudio(freeUser).code === 'CREATIVE_STUDIO_PREMIUM_ONLY', 'free gets premium-only code');
const trialUser = {
  plan: 'trial',
  aiCreditsUsedThisMonth: 10,
  aiCreditsLimit: 100,
  businessActive: false,
};

assert(canUseCreativeStudio(trialUser).allowed === true, 'trial user can use Creative Studio');
assert(canUseCreativeStudio(premiumUser).allowed === true, 'premium user can use Creative Studio');
assert(isPremiumPlan(premiumUser) === true, 'premium plan detected');

const lowRemaining = premiumLowCredits.aiCreditsLimit - premiumLowCredits.aiCreditsUsedThisMonth;
assert(lowRemaining === 2, 'premium low credits has 2 remaining');
assert(lowRemaining < AI_CREDIT_COSTS.creativePackWithImage, 'not enough for full pack (8)');
assert(canUseCreativeStudio(premiumLowCredits).allowed === true, 'gate allows if any credits remain');

assert(AI_CREDIT_COSTS.creativePackWithImage === 8, 'pack with image costs 8');
assert(AI_CREDIT_COSTS.creativePackNoImage === 3, 'pack without image costs 3');
assert(AI_CREDIT_COSTS.regenerateImage === 5, 'regenerate image costs 5');
assert(AI_CREDIT_COSTS.text === 1, 'text AI still 1 credit');

assert(resolveImageSize('square') === CREATIVE_FORMATS.square.size, 'square image size');
assert(resolveImageSize('story') === CREATIVE_FORMATS.story.size, 'story image size');
assert(CREATIVE_STUDIO_DAILY_LIMIT === 10, 'daily limit is 10');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
