import { v4 as uuidv4 } from 'uuid';
import { getFirestoreDb } from './admin.js';

const COLLECTION = 'posts';

function docToPost(id, data) {
  return {
    id,
    project: data.project,
    platform: data.platform,
    contentType: data.contentType,
    tone: data.tone,
    topic: data.topic || '',
    caption: data.caption || '',
    hashtags: data.hashtags || '',
    cta: data.cta || '',
    reelIdea: data.reelIdea || '',
    overlayTitle: data.overlayTitle || '',
    mediaPath: data.mediaPath || null,
    mediaMimeType: data.mediaMimeType || null,
    mediaPublicUrl: data.mediaPublicUrl || null,
    mediaStoragePath: data.mediaStoragePath || null,
    scheduledAt: data.scheduledAt || null,
    status: data.status,
    errorMessage: data.errorMessage || null,
    instagramMediaId: data.instagramMediaId || null,
    instagramContainerId: data.instagramContainerId || null,
    tiktokPublishId: data.tiktokPublishId || null,
    publishedAt: data.publishedAt || null,
    viewCount: data.viewCount || 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function matchesFilters(post, { status, platform, from, to }) {
  if (status && post.status !== status) return false;
  if (platform && post.platform !== platform && post.platform !== 'both') return false;
  if (from) {
    const ts = post.scheduledAt || post.publishedAt || post.createdAt;
    if (!ts || ts < from) return false;
  }
  if (to) {
    const ts = post.scheduledAt || post.publishedAt || post.createdAt;
    if (!ts || ts > to) return false;
  }
  return true;
}

export async function listPosts(filters = {}) {
  const db = await getFirestoreDb();
  const snap = await db.collection(COLLECTION).get();
  const posts = snap.docs.map((doc) => docToPost(doc.id, doc.data()));
  return posts
    .filter((post) => matchesFilters(post, filters))
    .sort((a, b) => {
      const da = new Date(a.scheduledAt || a.publishedAt || a.createdAt).getTime();
      const db_ = new Date(b.scheduledAt || b.publishedAt || b.createdAt).getTime();
      return db_ - da;
    });
}

export async function getPostById(id) {
  const db = await getFirestoreDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  return doc.exists ? docToPost(doc.id, doc.data()) : null;
}

export async function createPost(data) {
  const db = await getFirestoreDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = data.status || (data.scheduledAt ? 'scheduled' : 'draft');

  const doc = {
    project: data.project,
    platform: data.platform,
    contentType: data.contentType,
    tone: data.tone,
    topic: data.topic || '',
    caption: data.caption || '',
    hashtags: data.hashtags || '',
    cta: data.cta || '',
    reelIdea: data.reelIdea || '',
    overlayTitle: data.overlayTitle || '',
    mediaPath: data.mediaPath || null,
    mediaMimeType: data.mediaMimeType || null,
    mediaPublicUrl: data.mediaPublicUrl || null,
    mediaStoragePath: data.mediaStoragePath || null,
    scheduledAt: data.scheduledAt || null,
    status,
    errorMessage: null,
    instagramMediaId: null,
    instagramContainerId: null,
    tiktokPublishId: null,
    publishedAt: null,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(COLLECTION).doc(id).set(doc);
  return docToPost(id, doc);
}

export async function updatePost(id, data) {
  const existing = await getPostById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  let status = existing.status;

  if (data.scheduledAt !== undefined) {
    if (data.scheduledAt && existing.status === 'draft') status = 'scheduled';
    if (!data.scheduledAt && existing.status === 'scheduled') status = 'draft';
  }
  if (data.status) status = data.status;

  const patch = {
    updatedAt: now,
    status,
  };

  const fields = [
    'project', 'platform', 'contentType', 'tone', 'topic', 'caption', 'hashtags', 'cta',
    'reelIdea', 'overlayTitle', 'mediaPath', 'mediaMimeType', 'mediaPublicUrl', 'mediaStoragePath',
    'scheduledAt', 'errorMessage', 'instagramMediaId', 'instagramContainerId', 'tiktokPublishId',
    'publishedAt', 'viewCount',
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      patch[field] = data[field];
    }
  }

  const db = await getFirestoreDb();
  await db.collection(COLLECTION).doc(id).set(patch, { merge: true });
  return getPostById(id);
}

export async function deletePost(id) {
  const db = await getFirestoreDb();
  await db.collection(COLLECTION).doc(id).delete();
  return { changes: 1 };
}

export async function getDueScheduledPosts() {
  const now = new Date().toISOString();
  const posts = await listPosts({ status: 'scheduled' });
  return posts
    .filter((post) => post.scheduledAt && post.scheduledAt <= now)
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
}

export async function countAccountsByPlatform() {
  const db = await getFirestoreDb();
  const snap = await db.collection('connected_accounts').get();
  const counts = {};
  snap.docs.forEach((doc) => {
    const platform = doc.data()?.platform || doc.id;
    counts[platform] = (counts[platform] || 0) + 1;
  });
  return counts;
}
