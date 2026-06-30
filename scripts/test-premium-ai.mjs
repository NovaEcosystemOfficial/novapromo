/**
 * Test Premium + AI gate logic (no OpenAI calls).
 * Run: node scripts/test-premium-ai.mjs
 */

import { canUseAI, isPremiumPlan } from '../backend/src/services/featureGate.js';
import { getPlanDefinition, PLAN_DEFINITIONS } from '../backend/src/constants/plans.js';
import {
  supportsSamplingParams,
  prefersResponsesApi,
  resolveTemperature,
} from '../backend/src/services/openaiModelUtils.js';

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

console.log('Premium / AI gate tests\n');

const freeUser = {
  plan: 'free',
  aiCreditsUsedThisMonth: 0,
  aiCreditsLimit: PLAN_DEFINITIONS.free.aiCreditsLimit,
  businessActive: false,
};

const freeExhausted = {
  ...freeUser,
  aiCreditsUsedThisMonth: 3,
};

const premiumUser = {
  plan: 'premium',
  aiCreditsUsedThisMonth: 5,
  aiCreditsLimit: PLAN_DEFINITIONS.premium.aiCreditsLimit,
  businessActive: false,
};

const businessInactive = {
  plan: 'business',
  aiCreditsUsedThisMonth: 0,
  aiCreditsLimit: PLAN_DEFINITIONS.business.aiCreditsLimit,
  businessActive: false,
};

const businessActive = {
  ...businessInactive,
  businessActive: true,
};

assert(canUseAI(freeUser).allowed === true, 'free user with credits can use AI');
assert(canUseAI(freeExhausted).allowed === false, 'free user at limit blocked');
assert(canUseAI(freeExhausted).code === 'AI_CREDITS_EXHAUSTED', 'exhausted returns correct code');
assert(canUseAI(premiumUser).allowed === true, 'premium user can use AI');
assert(canUseAI(businessInactive).allowed === false, 'business inactive blocked');
assert(canUseAI(businessActive).allowed === true, 'business active can use AI');
assert(isPremiumPlan(premiumUser) === true, 'premium detected');
assert(isPremiumPlan(freeUser) === false, 'free not premium');
assert(isPremiumPlan(businessActive) === true, 'active business is premium-tier');
assert(getPlanDefinition('free').aiCreditsLimit === 3, 'free limit is 3');
assert(getPlanDefinition('premium').aiCreditsLimit === 300, 'premium limit is 300');
assert(getPlanDefinition('business').aiCreditsLimit === 2000, 'business limit is 2000');

console.log('\nOpenAI model utils\n');

assert(supportsSamplingParams('gpt-4o-mini') === true, 'gpt-4o-mini supports temperature');
assert(supportsSamplingParams('gpt-5.5') === false, 'gpt-5.5 rejects temperature');
assert(supportsSamplingParams('gpt-5-chat-latest') === true, 'gpt-5-chat supports temperature');
assert(supportsSamplingParams('o3-mini') === false, 'o3-mini rejects temperature');
assert(prefersResponsesApi('gpt-5.5') === true, 'gpt-5.5 uses Responses API');
assert(prefersResponsesApi('gpt-4o-mini') === false, 'gpt-4o-mini uses chat completions');
assert(resolveTemperature('gpt-5.5', 0.7) === undefined, 'no temperature for gpt-5.5');
assert(resolveTemperature('gpt-4o-mini', 0.7) === 0.7, 'temperature kept for gpt-4o-mini');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
