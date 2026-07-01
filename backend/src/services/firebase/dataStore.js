import { config, hasFirebaseAdminCredentials } from '../../config.js';

export function useFirebaseDataStore() {
  if (process.env.DATA_STORE === 'sqlite') return false;
  if (process.env.DATA_STORE === 'firebase') return hasFirebaseAdminCredentials();
  if (config.isVercel && hasFirebaseAdminCredentials()) return true;
  return process.env.DATA_STORE === 'firebase' && hasFirebaseAdminCredentials();
}

export function hasFirebaseStorage() {
  return hasFirebaseAdminCredentials() && Boolean(config.firebase.storageBucket?.trim());
}

export const FIREBASE_STORAGE_NOT_CONFIGURED =
  'Firebase Storage non configurato: imposta FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY e FIREBASE_STORAGE_BUCKET su Vercel.';

export const FIREBASE_DATASTORE_NOT_CONFIGURED =
  'Firestore non configurato: imposta le credenziali Firebase Admin e DATA_STORE=firebase su Vercel.';
