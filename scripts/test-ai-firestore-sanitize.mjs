/**
 * Tests sanitizeForFirestore + AI generation doc shape (no OpenAI / no live Firestore required).
 * Run: node scripts/test-ai-firestore-sanitize.mjs
 */

import { sanitizeForFirestore, hasUndefinedDeep } from '../backend/src/utils/sanitizeForFirestore.js';

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

console.log('sanitizeForFirestore tests\n');

const nested = sanitizeForFirestore({
  a: 1,
  b: undefined,
  c: null,
  d: { x: undefined, y: 'ok', z: [1, undefined, 2] },
  e: ['a', undefined, 'b'],
});

assert(!hasUndefinedDeep(nested), 'no undefined after sanitize');
assert(nested.b === undefined && !('b' in nested), 'top-level undefined key removed');
assert(nested.c === null, 'null preserved');
assert(nested.d.y === 'ok' && !('x' in nested.d), 'nested undefined removed');
assert(nested.d.z.length === 2, 'undefined array elements removed');

const contentPackInput = {
  project: 'NovaDocs',
  platform: 'instagram',
  contentType: 'post',
  tone: 'professionale',
  topic: 'Cloud Sync',
  sourceText: undefined,
  targetPlatforms: undefined,
};

const legacySanitized = {
  topic: contentPackInput.topic ?? '',
  project: contentPackInput.project ?? '',
  platform: contentPackInput.platform ?? '',
  contentType: contentPackInput.contentType ?? '',
  tone: contentPackInput.tone ?? '',
  sourceText: contentPackInput.sourceText != null ? String(contentPackInput.sourceText) : '',
};

const aiDoc = sanitizeForFirestore({
  id: 'test-id',
  userId: 'local-desktop',
  type: 'content_pack',
  input: legacySanitized,
  output: {
    caption: 'Hello',
    hashtags: '#test',
    platformVariants: { instagram_post: 'Post', twitter_post: undefined },
  },
  brandId: 'nova-ecosystem',
  createdAt: new Date().toISOString(),
});

assert(!hasUndefinedDeep(aiDoc), 'content_pack doc has no undefined');
assert(aiDoc.input.sourceText === '', 'sourceText is empty string not undefined');
assert(!('targetPlatforms' in aiDoc.input), 'missing targetPlatforms omitted or empty');
assert(aiDoc.output.platformVariants.instagram_post === 'Post', 'output variants kept');
assert(!('twitter_post' in aiDoc.output.platformVariants), 'undefined variant key removed');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
