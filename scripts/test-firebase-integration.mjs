/**
 * Integration smoke tests for NovaPromo Firebase (NovaEcosystem).
 * Run: npm run test:firebase
 * Requires .env or .env.local with FIREBASE_* credentials.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const required = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_STORAGE_BUCKET',
];

const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error('SKIP: variabili mancanti:', missing.join(', '));
  console.error('Copia .env.example → .env.local e incolla le credenziali NovaEcosystem.');
  process.exit(1);
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

async function run() {
  console.log('\nNovaPromo Firebase integration tests\n');

  const { initializeApp, cert, getApps, deleteApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getStorage } = await import('firebase-admin/storage');
  const { v4: uuidv4 } = await import('uuid');

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  let app;
  try {
    for (const existing of getApps()) {
      await deleteApp(existing);
    }
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      storageBucket,
    });
    ok('Firebase Admin init');
  } catch (err) {
    fail('Firebase Admin init', err);
    process.exit(1);
  }

  const db = getFirestore(app);
  const storage = getStorage(app);
  const testId = `integration-test-${uuidv4().slice(0, 8)}`;

  // Firestore write/read
  try {
    const ref = db.collection('_integration_tests').doc(testId);
    const payload = { ok: true, at: new Date().toISOString() };
    await ref.set(payload);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.ok !== true) throw new Error('read mismatch');
    await ref.delete();
    ok('Firestore write/read/delete');
  } catch (err) {
    fail('Firestore write/read/delete', err);
  }

  // Storage upload + public URL
  try {
    const storagePath = `novapromo/media/${testId}.txt`;
    const token = uuidv4();
    const buffer = Buffer.from('novapromo-firebase-integration-test');
    const bucket = storage.bucket(storageBucket);
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      metadata: {
        contentType: 'text/plain',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    const encoded = encodeURIComponent(storagePath);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
    const head = await fetch(publicUrl, { method: 'HEAD' });
    if (!head.ok) throw new Error(`HEAD ${head.status}`);
    await file.delete();
    ok('Storage upload + public HTTPS URL');
  } catch (err) {
    fail('Storage upload + public HTTPS URL', err);
  }

  // Auth custom token (TikTok flow)
  try {
    const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
    const auth = getAdminAuth(app);
    const uid = `integration-test:${testId}`;
    try {
      await auth.createUser({ uid, displayName: 'Integration Test' });
    } catch (e) {
      if (e.code !== 'auth/uid-already-exists') throw e;
    }
    const token = await auth.createCustomToken(uid, { provider: 'test' });
    if (!token || typeof token !== 'string') throw new Error('empty custom token');
    await auth.deleteUser(uid);
    ok('Auth custom token');
  } catch (err) {
    fail('Auth custom token', err);
  }

  // App module import
  try {
    process.env.DATA_STORE = 'firebase';
    const { useFirebaseDataStore, hasFirebaseStorage } = await import(
      '../backend/src/services/firebase/dataStore.js'
    );
    if (!useFirebaseDataStore()) throw new Error('useFirebaseDataStore() false');
    if (!hasFirebaseStorage()) throw new Error('hasFirebaseStorage() false');
    ok('Backend dataStore flags');
  } catch (err) {
    fail('Backend dataStore flags', err);
  }

  // Vercel runtime uses Firestore when Firebase creds present
  try {
    process.env.VERCEL = '1';
    process.env.DATA_STORE = 'firebase';
    const { useFirebaseDataStore } = await import('../backend/src/services/firebase/dataStore.js');
    if (!useFirebaseDataStore()) throw new Error('useFirebaseDataStore() false on Vercel');
    delete process.env.VERCEL;
    ok('Vercel runtime → Firestore (not SQLite)');
  } catch (err) {
    delete process.env.VERCEL;
    fail('Vercel runtime → Firestore (not SQLite)', err);
  }

  // Media upload → mediaPublicUrl (Instagram publish path)
  try {
    const { uploadMediaToFirebaseStorage } = await import('../backend/src/services/firebase/storageService.js');
    const { v4: uuidv4 } = await import('uuid');
    const testId = uuidv4().slice(0, 8);
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]); // JPEG header stub
    const { publicUrl, storagePath } = await uploadMediaToFirebaseStorage({
      buffer,
      filename: `test-${testId}.jpg`,
      mimeType: 'image/jpeg',
    });
    if (!publicUrl?.startsWith('https://firebasestorage.googleapis.com/')) {
      throw new Error('publicUrl not HTTPS Firebase Storage');
    }
    if (!storagePath?.startsWith('novapromo/media/')) {
      throw new Error('storagePath wrong prefix');
    }
    const head = await fetch(publicUrl, { method: 'HEAD' });
    if (!head.ok) throw new Error(`mediaPublicUrl not reachable: ${head.status}`);
    const bucket = storage.bucket(storageBucket);
    await bucket.file(storagePath).delete();
    ok('Media upload → mediaPublicUrl (Instagram-ready HTTPS)');
  } catch (err) {
    fail('Media upload → mediaPublicUrl (Instagram-ready HTTPS)', err);
  }

  await deleteApp(app);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
