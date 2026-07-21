/**
 * AssetManager — generates & stores visual assets for Creative Engine V2.
 * Uses existing OpenAI Images + Firebase Storage (does not replace infrastructure).
 */

import { generateImageBuffer } from '../openaiImageService.js';
import { uploadAiImageToFirebaseStorage } from '../firebase/storageService.js';
import { hasFirebaseStorage } from '../firebase/dataStore.js';
import { CREATIVE_FORMATS } from '../../constants/aiCredits.js';
import { logger } from '../../utils/logger.js';

/**
 * @param {{ prompt: string, format: string, userDocId: string, negativePrompt?: string }} opts
 */
export async function generateAndStoreImage({
  prompt,
  format,
  userDocId,
  negativePrompt = '',
}) {
  if (!hasFirebaseStorage()) {
    const err = new Error('Firebase Storage non configurato — necessario per immagini AI');
    err.code = 'FIREBASE_STORAGE_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  const aspect = CREATIVE_FORMATS[format]?.aspect || '1:1';
  const fullPrompt = [
    prompt,
    negativePrompt && `Avoid: ${negativePrompt}`,
    `Aspect ratio ${aspect}, social-ready, no watermark, no distorted logo`,
  ].filter(Boolean).join('\n\n');

  logger.info('Creative Engine V2 image generation', { userDocId, format });

  const buffer = await generateImageBuffer({
    prompt: fullPrompt,
    format,
  });

  const stored = await uploadAiImageToFirebaseStorage({
    buffer,
    userId: userDocId,
    mimeType: 'image/png',
  });

  return {
    imageUrl: stored.publicUrl,
    storagePath: stored.storagePath,
    imageMimeType: 'image/png',
    promptUsed: fullPrompt,
  };
}

/**
 * Future hooks — not implemented.
 */
export function prepareFutureAssetSlots() {
  return {
    videoAi: null,
    reelAi: null,
    voiceOver: null,
    avatar: null,
    productMockup: null,
    logoAsset: null,
  };
}
