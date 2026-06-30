/**
 * Deploy Firestore + Storage rules via firebase-admin Security Rules API.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID || 'novaecosystem-b8a4b';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

const { initializeApp, cert, getApps, deleteApp } = await import('firebase-admin/app');
const { getSecurityRules } = await import('firebase-admin/security-rules');

for (const app of getApps()) await deleteApp(app);

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
  storageBucket,
});

const rules = getSecurityRules(app);

const firestoreSource = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'storage.rules'), 'utf8');

console.log('Deploying rules to', projectId);

await rules.releaseFirestoreRulesetFromSource(firestoreSource);
console.log('  ✓ Firestore rules released');

await rules.releaseStorageRulesetFromSource(storageSource, storageBucket);
console.log('  ✓ Storage rules released for', storageBucket);

await deleteApp(app);
console.log('Done');
