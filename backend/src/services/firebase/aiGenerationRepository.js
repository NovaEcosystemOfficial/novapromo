import { randomUUID } from 'crypto';
import { getFirebaseAdmin } from './admin.js';
import { logger } from '../../utils/logger.js';

function sanitizeInput(input) {
  if (!input || typeof input !== 'object') return {};
  const { topic, project, platform, contentType, tone, sourceText, targetPlatforms } = input;
  return {
    topic: topic ? String(topic).slice(0, 500) : undefined,
    project: project ? String(project).slice(0, 120) : undefined,
    platform: platform ? String(platform).slice(0, 40) : undefined,
    contentType: contentType ? String(contentType).slice(0, 40) : undefined,
    tone: tone ? String(tone).slice(0, 40) : undefined,
    sourceText: sourceText ? String(sourceText).slice(0, 4000) : undefined,
    targetPlatforms: Array.isArray(targetPlatforms)
      ? targetPlatforms.map((p) => String(p).slice(0, 40)).slice(0, 8)
      : undefined,
  };
}

export async function saveAiGeneration({ userDocId, type, input, output, brandId }) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    logger.warn('AI generation not persisted — Firebase non configurato');
    return { id: null, stored: false };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const doc = {
    id,
    userId: userDocId,
    type,
    input: sanitizeInput(input),
    output,
    brandId: brandId || null,
    createdAt: now,
  };

  await admin.db.collection('ai_generations').doc(id).set(doc);
  return { id, stored: true };
}
