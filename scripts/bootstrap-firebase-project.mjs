/**
 * Bootstrap Firebase services for NovaEcosystem (Firestore DB + Storage bucket).
 * Uses service account from .env.local. Safe output only.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const saPath =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || '', 'Downloads', 'novaecosystem-b8a4b-firebase-adminsdk-fbsvc-1a989c2cd7.json');

if (!projectId) {
  console.error('FIREBASE_PROJECT_ID missing — run setup-firebase-env.mjs first');
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const auth = new GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();

async function enableApi(serviceName) {
  const url = `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}:enable`;
  try {
    await client.request({ url, method: 'POST' });
    console.log('Enabled API:', serviceName);
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message;
    if (/already enabled|has been enabled/i.test(msg)) {
      console.log('API already enabled:', serviceName);
    } else {
      console.warn('Enable API', serviceName, ':', msg);
    }
  }
}

async function createFirestore() {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=(default)`;
  try {
    const res = await client.request({
      url,
      method: 'POST',
      data: {
        locationId: 'europe-west1',
        type: 'FIRESTORE_NATIVE',
      },
    });
    console.log('Firestore database creating:', res.data.name);
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message;
    if (/already exists|ALREADY_EXISTS/i.test(msg)) {
      console.log('Firestore database already exists');
    } else {
      throw new Error(`Firestore: ${msg}`);
    }
  }
}

async function ensureDefaultBucket() {
  const url = `https://firebase.googleapis.com/v1beta1/projects/${projectId}/defaultLocation`;
  try {
    await client.request({
      url,
      method: 'POST',
      data: { locationId: 'europe-west1' },
    });
    console.log('Firebase default location set (europe-west1)');
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message;
    if (/already|exists|ALREADY/i.test(msg)) {
      console.log('Default location already configured');
    } else {
      console.warn('Default location:', msg);
    }
  }

  const bucketUrl = `https://firebasestorage.googleapis.com/v1/projects/${projectId}/buckets/${projectId}.appspot.com`;
  try {
    await client.request({
      url: bucketUrl,
      method: 'POST',
      data: { location: 'europe-west1' },
    });
    console.log('Storage bucket created:', `${projectId}.appspot.com`);
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message;
    if (/already exists|ALREADY_EXISTS/i.test(msg)) {
      console.log('Storage bucket already exists');
    } else {
      console.warn('Storage bucket:', msg);
    }
  }
}

console.log('Bootstrapping Firebase for', projectId);
await enableApi('firestore.googleapis.com');
await enableApi('firebasestorage.googleapis.com');
await enableApi('identitytoolkit.googleapis.com');
await createFirestore();
await ensureDefaultBucket();
console.log('Bootstrap complete — wait ~1 min then run npm run test:firebase');
