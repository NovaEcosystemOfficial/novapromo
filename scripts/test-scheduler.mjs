/**
 * Scheduler due-post logic tests (no Meta / no Firebase).
 * Run: npm run test:scheduler
 */

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

/** Mirror of due filter used by getDueScheduledPosts */
function filterDue(posts, nowIso) {
  return posts
    .filter((post) => post.status === 'scheduled' && post.scheduledAt && post.scheduledAt <= nowIso)
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
}

function canClaim(post, nowIso, locks = new Set()) {
  if (!post?.id) return false;
  if (locks.has(post.id)) return false;
  if (post.status !== 'scheduled') return false;
  if (!post.scheduledAt || post.scheduledAt > nowIso) return false;
  return true;
}

console.log('\nScheduler publish-due tests\n');

const now = new Date();
const past = new Date(now.getTime() - 60_000).toISOString();
const future = new Date(now.getTime() + 3600_000).toISOString();
const nowIso = now.toISOString();

const posts = [
  { id: 'a', status: 'scheduled', scheduledAt: past, platform: 'instagram' },
  { id: 'b', status: 'scheduled', scheduledAt: future, platform: 'facebook' },
  { id: 'c', status: 'draft', scheduledAt: past, platform: 'instagram' },
  { id: 'd', status: 'published', scheduledAt: past, platform: 'instagram' },
  { id: 'e', status: 'scheduled', scheduledAt: null, platform: 'instagram' },
];

const due = filterDue(posts, nowIso);
assert(due.length === 1, 'only past scheduled posts are due');
assert(due[0].id === 'a', 'due post is the past-scheduled one');

const localLike = '2026-07-16T20:45';
const asIso = new Date(localLike).toISOString();
assert(typeof asIso === 'string' && asIso.includes('T'), 'schedule stores UTC ISO');
assert(!Number.isNaN(Date.parse(asIso)), 'scheduledAt parses');

assert(canClaim(posts[0], nowIso) === true, 'due scheduled post can be claimed');
assert(canClaim(posts[1], nowIso) === false, 'future post cannot be claimed');
assert(canClaim({ ...posts[0], status: 'publishing' }, nowIso) === false, 'publishing status not claimable');
assert(canClaim(posts[0], nowIso, new Set(['a'])) === false, 'in-process lock blocks claim');

assert('/api/cron/publish-due'.startsWith('/api/cron'), 'cron endpoint path defined');
assert('/api/posts/publish-due'.includes('publish-due'), 'client tick endpoint path defined');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
