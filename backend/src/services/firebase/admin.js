import { config, hasFirebaseAdminCredentials } from '../../config.js';

let adminApp = null;

export async function getFirebaseAdmin() {
  if (!hasFirebaseAdminCredentials()) {
    return null;
  }
  if (adminApp) return adminApp;

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');

  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
  } else {
    adminApp = getApps()[0];
  }

  return { app: adminApp, db: getFirestore(), auth: getAuth() };
}
