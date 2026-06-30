import { randomUUID } from 'crypto';
import { getFirebaseAdmin } from './admin.js';
import { logger } from '../../utils/logger.js';
import { sanitizeForFirestore } from '../../utils/sanitizeForFirestore.js';

function sanitizeInput(input) {
  if (!input || typeof input !== 'object') return {};

  const topic = input.topic != null ? String(input.topic).slice(0, 500) : '';
  const project = input.project != null ? String(input.project).slice(0, 120) : '';
  const platform = input.platform != null ? String(input.platform).slice(0, 40) : '';
  const contentType = input.contentType != null ? String(input.contentType).slice(0, 40) : '';
  const tone = input.tone != null ? String(input.tone).slice(0, 40) : '';
  const sourceText = input.sourceText != null ? String(input.sourceText).slice(0, 4000) : '';

  const out = { topic, project, platform, contentType, tone, sourceText };

  if (Array.isArray(input.targetPlatforms) && input.targetPlatforms.length > 0) {
    out.targetPlatforms = input.targetPlatforms
      .map((p) => String(p).slice(0, 40))
      .slice(0, 8);
  }

  return out;
}

export async function saveAiGeneration({ userDocId, type, input, output, brandId }) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    logger.warn('AI generation not persisted — Firebase non configurato');
    return { id: null, stored: false };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const doc = sanitizeForFirestore({
    id,
    userId: userDocId,
    type,
    input: sanitizeInput(input),
    output: output ?? null,
    brandId: brandId ?? null,
    createdAt: now,
  });

  await admin.db.collection('ai_generations').doc(id).set(doc);
  return { id, stored: true };
}
