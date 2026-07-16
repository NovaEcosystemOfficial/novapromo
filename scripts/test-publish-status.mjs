/**
 * Publish status resolution tests (false "error" after Meta success).
 * Run: npm run test:publish-status
 */
import {
  resolveFinalPublishStatus,
  resolveRecoveryStatus,
  sanitizePublishDetails,
} from '../backend/src/services/publishStatus.js';

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

console.log('\nPublish status tests\n');

const fullOk = resolveFinalPublishStatus(
  [{ platform: 'instagram', mediaId: '1' }],
  []
);
assert(fullOk.status === 'published', 'full success → published');
assert(fullOk.errorMessage === null, 'full success clears errorMessage');

const partial = resolveFinalPublishStatus(
  [{ platform: 'instagram', mediaId: '1' }],
  [{ platform: 'facebook', error: 'token invalid' }]
);
assert(partial.status === 'published', 'partial success (IG ok, FB fail) → published');
assert(partial.errorMessage.includes('facebook'), 'partial keeps platform error text');

const totalFail = resolveFinalPublishStatus([], [{ platform: 'instagram', error: 'no media' }]);
assert(totalFail.status === 'error', 'total failure → error');
assert(totalFail.ok === false, 'total failure ok=false');

const multiBoth = resolveFinalPublishStatus(
  [{ platform: 'instagram' }, { platform: 'facebook' }],
  []
);
assert(multiBoth.status === 'published', 'multi both ok → published');

const recoveryPublished = resolveRecoveryStatus(
  { status: 'published', instagramMediaId: 'x' },
  'timeout'
);
assert(recoveryPublished.status === 'published', 'recovery keeps published');

const recoveryWithMetaIds = resolveRecoveryStatus(
  { status: 'publishing', instagramMediaId: '1789', facebookPostId: null },
  'FUNCTION_INVOCATION_TIMEOUT'
);
assert(recoveryWithMetaIds.status === 'published', 'recovery with Meta IDs → published not error');
assert(recoveryWithMetaIds.publishedAt, 'recovery sets publishedAt');

const recoveryHardFail = resolveRecoveryStatus(
  { status: 'publishing' },
  'no account'
);
assert(recoveryHardFail.status === 'error', 'recovery without Meta IDs → error');

const sanitized = sanitizePublishDetails({
  postId: '123',
  pageId: '456',
  pageAccessToken: 'SECRET',
  accessToken: 'SECRET2',
  extra: undefined,
});
assert(sanitized.postId === '123', 'sanitize keeps postId');
assert(sanitized.pageAccessToken === undefined, 'sanitize strips pageAccessToken');
assert(sanitized.accessToken === undefined, 'sanitize strips accessToken');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
