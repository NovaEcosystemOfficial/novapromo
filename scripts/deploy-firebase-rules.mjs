/**
 * Deploy Firestore + Storage rules via Firebase Rules API (service account).
 * Requires firebaserules.releases.create on the service account, OR use Firebase CLI
 * with an Owner account: npx firebase-tools deploy --only firestore:rules,storage
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

async function createRuleset(files) {
  const res = await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    method: 'POST',
    data: { source: { files } },
  });
  return res.data.name;
}

async function releaseRules(rulesetName, releaseId) {
  const res = await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
    method: 'POST',
    data: {
      name: `projects/${projectId}/releases/${releaseId}`,
      rulesetName,
    },
  });
  return res.data;
}

async function deployRulesFile(filename, releaseId) {
  const content = fs.readFileSync(path.join(root, filename), 'utf8');
  const rulesetName = await createRuleset([{ name: filename, content }]);
  const release = await releaseRules(rulesetName, releaseId);
  console.log(`Deployed ${releaseId}:`, release.name);
}

console.log('Deploying rules to', projectId);

try {
  await deployRulesFile('firestore.rules', 'cloud.firestore');
  await deployRulesFile('storage.rules', 'firebase.storage');
  console.log('Rules deploy complete');
} catch (err) {
  const code = err?.response?.status || err?.code;
  if (code === 403) {
    console.error('\nDeploy regole bloccato: permessi IAM insufficienti sul service account.');
    console.error('Esegui con account Owner del progetto:');
    console.error('  npx -y firebase-tools@latest login');
    console.error('  npx -y firebase-tools@latest deploy --only firestore:rules,storage --project', projectId);
    console.error('Oppure incolla le regole da firestore.rules / storage.rules nella Console Firebase.');
    process.exit(1);
  }
  throw err;
}
