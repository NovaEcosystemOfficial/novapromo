/**
 * Compare deployed Firebase rules with repo files (service account read).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID || 'novaecosystem-b8a4b';
const saPath =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || '', 'Downloads', 'novaecosystem-b8a4b-firebase-adminsdk-fbsvc-1a989c2cd7.json');

const creds = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const auth = new GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});
const client = await auth.getClient();

function normalizeRules(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

async function getDeployedRules(releaseId) {
  const releaseRes = await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/${releaseId}`,
  });
  const rulesetName = releaseRes.data.rulesetName;
  const rulesetRes = await client.request({ url: `https://firebaserules.googleapis.com/v1/${rulesetName}` });
  const file = rulesetRes.data.source?.files?.[0];
  return file?.content || '';
}

const checks = [
  { releases: ['cloud.firestore'], file: 'firestore.rules' },
  { releases: ['firebase.storage', `firebase.storage/${process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`}`], file: 'storage.rules' },
];

let ok = 0;
let fail = 0;

console.log('\nFirebase rules check —', projectId, '\n');

for (const { releases, file } of checks) {
  const expected = normalizeRules(fs.readFileSync(path.join(root, file), 'utf8'));
  let matched = false;
  let lastError = null;

  for (const release of releases) {
    try {
      const deployed = normalizeRules(await getDeployedRules(release));
      if (deployed === expected) {
        console.log(`  ✓ ${release} matches ${file}`);
        ok++;
        matched = true;
        break;
      }
      lastError = `content differs from ${file}`;
    } catch (err) {
      lastError = err?.response?.data?.error?.message || err.message;
    }
  }

  if (!matched) {
    console.error(`  ✗ ${file}:`, lastError);
    fail++;
  }
}

console.log(`\n${ok} matched, ${fail} need deploy\n`);
process.exit(fail > 0 ? 1 : 0);
