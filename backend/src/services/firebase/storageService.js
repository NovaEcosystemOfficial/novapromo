import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { getFirebaseStorage } from './admin.js';
import { hasFirebaseStorage, FIREBASE_STORAGE_NOT_CONFIGURED } from './dataStore.js';

function buildFirebaseDownloadUrl(bucketName, storagePath, token) {
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

/**
 * Upload AI-generated image for a user (Creative Studio PRO).
 */
export async function uploadAiImageToFirebaseStorage({ buffer, userId, mimeType = 'image/png' }) {
  if (!hasFirebaseStorage()) {
    const err = new Error(FIREBASE_STORAGE_NOT_CONFIGURED);
    err.code = 'FIREBASE_STORAGE_NOT_CONFIGURED';
    throw err;
  }

  const storage = await getFirebaseStorage();
  const bucket = storage.bucket(config.firebase.storageBucket);
  const safeUser = String(userId || 'anonymous').replace(/[^\w.-]/g, '_').slice(0, 128);
  const timestamp = Date.now();
  const storagePath = `novapromo/media/ai/${safeUser}/${timestamp}.png`;
  const downloadToken = uuidv4();

  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const publicUrl = buildFirebaseDownloadUrl(bucket.name, storagePath, downloadToken);

  logger.info('AI image uploaded to Firebase Storage', {
    storagePath,
    userId: safeUser,
    urlPrefix: publicUrl.slice(0, 56),
  });

  return { publicUrl, storagePath };
}

/**
 * Upload media to Firebase Storage and return a stable HTTPS URL for Instagram Graph API.
 */
export async function uploadMediaToFirebaseStorage({ buffer, filename, mimeType }) {
  if (!hasFirebaseStorage()) {
    const err = new Error(FIREBASE_STORAGE_NOT_CONFIGURED);
    err.code = 'FIREBASE_STORAGE_NOT_CONFIGURED';
    throw err;
  }

  const storage = await getFirebaseStorage();
  const bucket = storage.bucket(config.firebase.storageBucket);
  const ext = path.extname(filename) || '';
  const storagePath = `novapromo/media/${uuidv4()}${ext}`;
  const downloadToken = uuidv4();

  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: {
      contentType: mimeType || 'application/octet-stream',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const publicUrl = buildFirebaseDownloadUrl(bucket.name, storagePath, downloadToken);

  logger.info('Media uploaded to Firebase Storage', {
    storagePath,
    contentType: mimeType,
    urlPrefix: publicUrl.slice(0, 56),
    bucket: bucket.name,
  });

  return { publicUrl, storagePath };
}

export async function backfillLocalFileToFirebaseStorage({ filePath, mimeType }) {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  return uploadMediaToFirebaseStorage({ buffer, filename, mimeType });
}
