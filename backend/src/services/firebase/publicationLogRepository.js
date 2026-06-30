import { v4 as uuidv4 } from 'uuid';
import { getFirestoreDb } from './admin.js';

const COLLECTION = 'publication_logs';

export async function addPublicationLog({ postId, platform, action, status, message, details }) {
  const db = await getFirestoreDb();
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const doc = {
    postId,
    platform,
    action,
    status,
    message: message || null,
    details: details || null,
    createdAt,
  };

  await db.collection(COLLECTION).doc(id).set(doc);
  return id;
}

export async function listPublicationLogs({ postId, limit = 100 } = {}) {
  const db = await getFirestoreDb();
  const snap = postId
    ? await db.collection(COLLECTION).where('postId', '==', postId).get()
    : await db.collection(COLLECTION).get();

  const logs = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      postId: data.postId,
      platform: data.platform,
      action: data.action,
      status: data.status,
      message: data.message,
      details: data.details,
      createdAt: data.createdAt,
    };
  });

  return logs
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}
