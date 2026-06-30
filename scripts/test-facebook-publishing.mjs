/**
 * Facebook Page Publishing smoke tests (no live Graph API calls).
 * Run: npm run test:facebook
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function backendImport(relPath) {
  return import(pathToFileURL(path.join(root, relPath)).href);
}

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, err) {
  failed++;
  console.error(`  ✗ ${name}:`, err?.message || err);
}

function assertEqual(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    fail(name, `expected ${e}, got ${a}`);
    return;
  }
  ok(name);
}

const PLATFORM_MAP = {
  instagram: ['instagram', 'both', 'multi'],
  facebook: ['facebook', 'multi'],
  tiktok: ['tiktok', 'both'],
};

function resolvePublishTargets(platform) {
  const targets = [];
  if (PLATFORM_MAP.instagram.includes(platform)) targets.push('instagram');
  if (PLATFORM_MAP.facebook.includes(platform)) targets.push('facebook');
  if (PLATFORM_MAP.tiktok.includes(platform)) targets.push('tiktok');
  return targets;
}

async function run() {
  console.log('\nNovaPromo Facebook publishing tests\n');

  process.env.META_APP_ID = process.env.META_APP_ID || 'test-app-id';
  process.env.META_APP_SECRET = process.env.META_APP_SECRET || 'test-app-secret';
  process.env.BACKEND_URL = process.env.BACKEND_URL || 'https://novapromo-backend.vercel.app';

  assertEqual('instagram only → instagram', resolvePublishTargets('instagram'), ['instagram']);
  assertEqual('facebook only → facebook', resolvePublishTargets('facebook'), ['facebook']);
  assertEqual('multi → instagram + facebook', resolvePublishTargets('multi'), ['instagram', 'facebook']);
  assertEqual('legacy both → instagram + tiktok', resolvePublishTargets('both'), ['instagram', 'tiktok']);

  const { evaluateInstagramConnection } = await backendImport('backend/src/services/integrationService.js');

  const igDisconnected = evaluateInstagramConnection(null);
  if (!igDisconnected.connected && igDisconnected.connectionStatus === 'disconnected') {
    ok('Instagram evaluateInstagramConnection (disconnected) unchanged');
  } else {
    fail('Instagram evaluateInstagramConnection (disconnected) unchanged', igDisconnected);
  }

  const igConnected = evaluateInstagramConnection({
    accessToken: 'tok',
    username: 'novaecosystem',
    externalUserId: '178414000',
    metadata: { instagramAccountId: '178414000' },
    tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  if (igConnected.connected && igConnected.connectionStatus === 'connected') {
    ok('Instagram evaluateInstagramConnection (connected) unchanged');
  } else {
    fail('Instagram evaluateInstagramConnection (connected) unchanged', igConnected);
  }

  const { getFacebookIntegrationStatus } = await backendImport('backend/src/services/integrationService.js');
  const fbStatus = await getFacebookIntegrationStatus();
  if (fbStatus.platform === 'facebook' && fbStatus.name === 'Facebook Page') {
    ok('getFacebookIntegrationStatus returns facebook platform');
  } else {
    fail('getFacebookIntegrationStatus returns facebook platform', fbStatus);
  }

  const { validateContentTypeForPlatform } = await backendImport('backend/src/middleware/upload.js');

  const fbImageOk = validateContentTypeForPlatform('facebook', 'post', 'image/jpeg');
  if (fbImageOk.length === 0) ok('Facebook post + JPEG passes validation');
  else fail('Facebook post + JPEG passes validation', fbImageOk.join('; '));

  const fbVideoErr = validateContentTypeForPlatform('facebook', 'post', 'video/mp4');
  if (fbVideoErr.some((m) => m.includes('immagine'))) {
    ok('Facebook rejects video for post');
  } else {
    fail('Facebook rejects video for post', fbVideoErr);
  }

  const { FACEBOOK_PAGE_OAUTH_SCOPES } = await backendImport('backend/src/services/instagram/metaScopes.js');
  if (FACEBOOK_PAGE_OAUTH_SCOPES.includes('pages_manage_posts')) {
    ok('Facebook OAuth scopes include pages_manage_posts');
  } else {
    fail('Facebook OAuth scopes include pages_manage_posts', FACEBOOK_PAGE_OAUTH_SCOPES);
  }

  const { getFacebookAuthUrl, publishToFacebook } = await backendImport('backend/src/services/facebook/facebookService.js');

  try {
    const url = getFacebookAuthUrl('test-state-123');
    if (url.includes('facebook.com') && url.includes('pages_manage_posts') && url.includes('test-state-123')) {
      ok('getFacebookAuthUrl builds OAuth dialog URL');
    } else {
      fail('getFacebookAuthUrl builds OAuth dialog URL', url);
    }
  } catch (err) {
    fail('getFacebookAuthUrl builds OAuth dialog URL', err);
  }

  if (typeof publishToFacebook === 'function') {
    ok('facebookService exports publishToFacebook');
  } else {
    fail('facebookService exports publishToFacebook');
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
