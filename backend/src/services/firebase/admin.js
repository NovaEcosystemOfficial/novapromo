import { config, hasFirebaseAdminCredentials } from '../../config.js';
import { logger } from '../../utils/logger.js';

let cached = null;

export async function getFirebaseAdmin() {
  if (!hasFirebaseAdminCredentials()) {
    return null;
  }
  if (cached) return cached;

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');
  const { getStorage } = await import('firebase-admin/storage');

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
        storageBucket: config.firebase.storageBucket || undefined,
      });

  cached = {
    app,
    db: getFirestore(app),
    auth: getAuth(app),
    storage: getStorage(app),
  };

  logger.info('Firebase Admin initialized', {
    projectId: config.firebase.projectId,
    storageBucket: config.firebase.storageBucket || null,
  });

  return cached;
}

export async function getFirestoreDb() {
  const admin = await getFirebaseAdmin();
  return admin?.db || null;
}

export async function getFirebaseStorage() {
  const admin = await getFirebaseAdmin();
  return admin?.storage || null;
}
