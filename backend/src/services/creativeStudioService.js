import { chatCompletion } from './openaiService.js';
import { generateImageBuffer } from './openaiImageService.js';
import { getBrand, buildBrandSystemPrompt } from './brandService.js';
import { saveAiGeneration } from './firebase/aiGenerationRepository.js';
import { uploadAiImageToFirebaseStorage } from './firebase/storageService.js';
import { getUserPlan, consumeAICredits, computeCreditsRemaining, consumeWelcomeProCredit } from './planService.js';
import { canUseCreativeStudio, canRegenerateCreativeImage } from './featureGate.js';
import { isAdmin } from './adminService.js';
import { assertCreativeStudioRateLimit, recordCreativeStudioUsage } from './creativeStudioRateLimit.js';
import { hasFirebaseStorage } from './firebase/dataStore.js';
import { DEFAULT_BRAND_ID } from '../constants/plans.js';
import {
  AI_CREDIT_COSTS,
  CREATIVE_FORMATS,
  CREATIVE_STYLES,
  CREATIVE_PLATFORMS,
} from '../constants/aiCredits.js';
import { logger } from '../utils/logger.js';

const STYLE_HINTS = {
  premium: 'elegante, scuro, lussuoso, pulito, alta qualità',
  minimal: 'minimalista, molto spazio negativo, tipografia semplice',
  tech: 'futuristico, tech, gradienti viola e arancione, UI moderna',
  cinematic: 'cinematografico, contrasto alto, luce drammatica, profondità',
};

function validateInput(input) {
  const idea = String(input.idea || '').trim();
  if (!idea) {
    const err = new Error('Campo idea obbligatorio');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }

  const platform = CREATIVE_PLATFORMS.includes(input.platform) ? input.platform : 'instagram';
  const format = CREATIVE_FORMATS[input.format] ? input.format : 'square';
  const style = CREATIVE_STYLES.includes(input.style) ? input.style : 'premium';
  const includeImage = input.includeImage !== false;
  const includeVideoPrompt = input.includeVideoPrompt !== false;
  const regenerateImage = input.regenerateImage === true;

  return {
    idea: idea.slice(0, 2000),
    platform,
    format,
    style,
    includeImage,
    includeVideoPrompt,
    regenerateImage,
    imagePrompt: input.imagePrompt ? String(input.imagePrompt).slice(0, 4000) : null,
    project: input.project ? String(input.project).slice(0, 120) : null,
    brandId: input.brandId || DEFAULT_BRAND_ID,
  };
}

function buildCreativeSystemPrompt(brand, style) {
  const styleHint = STYLE_HINTS[style] || STYLE_HINTS.premium;
  return [
    buildBrandSystemPrompt(brand),
    `Stile visivo richiesto: ${styleHint}.`,
    `Palette brand: ${(brand.colors || []).join(', ')}.`,
    'Per Nova Ecosystem: fondo scuro elegante, accenti viola/arancione, look tech professionale, niente clickbait.',
    'Genera contenuti pronti per social media in italiano.',
    'Rispondi sempre in JSON valido.',
  ].join('\n');
}

function buildCreativeUserPrompt(params, brand) {
  const fmt = CREATIVE_FORMATS[params.format];
  return [
    `Idea creativa: ${params.idea}`,
    params.project && `Progetto: ${params.project}`,
    `Piattaforma: ${params.platform}`,
    `Formato social: ${fmt.label} (${fmt.aspect})`,
    `Stile: ${params.style}`,
    `Brand: ${brand.name}`,
    '',
    'Genera un pacchetto creativo completo.',
    params.includeVideoPrompt
      ? 'Includi script reel 15 secondi, scene breakdown, testi overlay, camera movement, mood musica e prompt video AI futuro.'
      : 'Non includere dettagli video.',
    '',
    'Rispondi JSON con chiavi:',
    '{"caption":"","hashtags":"","cta":"","imagePrompt":"","videoPrompt":"","musicMood":"","visualStyle":"","socialFormat":"","platformVariants":{"instagram_post":"","instagram_story":"","facebook_post":""},"videoScript":{"durationSeconds":15,"script":"","scenes":[{"seconds":"","visual":"","overlayText":"","camera":""}],"overlayTexts":[],"cameraMovement":"","futureAiVideoPrompt":""}}',
  ].filter(Boolean).join('\n');
}

function parseCreativePack(raw, params) {
  const videoScript = raw.videoScript || {};
  const videoPrompt = raw.videoPrompt
    || videoScript.futureAiVideoPrompt
    || videoScript.script
    || '';

  return {
    caption: raw.caption || '',
    hashtags: raw.hashtags || '',
    cta: raw.cta || '',
    imagePrompt: raw.imagePrompt || '',
    videoPrompt,
    musicMood: raw.musicMood || videoScript.musicMood || '',
    visualStyle: raw.visualStyle || params.style,
    socialFormat: raw.socialFormat || CREATIVE_FORMATS[params.format].label,
    platformVariants: raw.platformVariants || {},
    videoScript: params.includeVideoPrompt ? {
      durationSeconds: videoScript.durationSeconds || 15,
      script: videoScript.script || '',
      scenes: Array.isArray(videoScript.scenes) ? videoScript.scenes : [],
      overlayTexts: videoScript.overlayTexts || [],
      cameraMovement: videoScript.cameraMovement || '',
      futureAiVideoPrompt: videoScript.futureAiVideoPrompt || videoPrompt,
    } : null,
    imageUrl: null,
    storagePath: null,
  };
}

function resolveCreditCost(params) {
  if (params.regenerateImage) return AI_CREDIT_COSTS.regenerateImage;
  if (params.includeImage) return AI_CREDIT_COSTS.creativePackWithImage;
  return AI_CREDIT_COSTS.creativePackNoImage;
}

async function assertCreativeAccess(userDocId, creditCost, { regenerateImage = false } = {}) {
  const plan = await getUserPlan(userDocId);
  const gate = regenerateImage
    ? canRegenerateCreativeImage(plan)
    : canUseCreativeStudio(plan);
  if (!gate.allowed) {
    const err = new Error(gate.reason);
    err.code = gate.code;
    err.status = gate.code === 'AI_CREDITS_EXHAUSTED' ? 402 : 403;
    err.details = gate;
    throw err;
  }

  const useWelcomeCredit = !regenerateImage && gate.usingWelcomeCredits === true;

  if (!useWelcomeCredit && gate.remaining != null && gate.remaining < creditCost && !isAdmin(plan)) {
    const remaining = computeCreditsRemaining(plan);
    const err = new Error(
      `Crediti AI insufficienti per questa operazione (servono ${creditCost}, ne restano ${remaining})`
    );
    err.code = 'AI_CREDITS_EXHAUSTED';
    err.status = 402;
    throw err;
  }

  await assertCreativeStudioRateLimit(userDocId);
  return { plan, useWelcomeCredit };
}

/**
 * Creative Studio PRO — full pack or image regeneration.
 */
export async function generateCreativePack(userDocId, input) {
  const params = validateInput(input);
  const creditCost = resolveCreditCost(params);
  const { useWelcomeCredit } = await assertCreativeAccess(userDocId, creditCost, {
    regenerateImage: params.regenerateImage,
  });

  const brand = await getBrand(params.brandId || DEFAULT_BRAND_ID);
  let pack;

  if (params.regenerateImage) {
    if (!params.imagePrompt) {
      const err = new Error('imagePrompt richiesto per rigenerare l\'immagine');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }
    if (!params.includeImage) {
      const err = new Error('includeImage deve essere true per rigenerare l\'immagine');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }
    pack = {
      caption: input.caption || '',
      hashtags: input.hashtags || '',
      cta: input.cta || '',
      imagePrompt: params.imagePrompt,
      videoPrompt: input.videoPrompt || '',
      musicMood: input.musicMood || '',
      visualStyle: input.visualStyle || params.style,
      socialFormat: CREATIVE_FORMATS[params.format].label,
      platformVariants: input.platformVariants || {},
      videoScript: input.videoScript || null,
      imageUrl: null,
      storagePath: null,
    };
  } else {
    const system = buildCreativeSystemPrompt(brand, params.style);
    const user = buildCreativeUserPrompt(params, brand);
    const raw = await chatCompletion({ system, user, json: true });
    pack = parseCreativePack(raw, params);
  }

  if (params.includeImage) {
    if (!hasFirebaseStorage()) {
      const err = new Error('Firebase Storage non configurato — necessario per immagini AI');
      err.code = 'FIREBASE_STORAGE_NOT_CONFIGURED';
      err.status = 503;
      throw err;
    }

    const promptForImage = [
      pack.imagePrompt,
      `Stile: ${STYLE_HINTS[params.style]}`,
      `Brand ${brand.name}, colori ${(brand.colors || []).join(', ')}`,
      `Formato ${CREATIVE_FORMATS[params.format].aspect}, social media, no text watermark, no logo distorto`,
    ].filter(Boolean).join('. ');

    logger.info('Creative Studio image generation', {
      userDocId,
      format: params.format,
      regenerate: params.regenerateImage,
    });

    const buffer = await generateImageBuffer({
      prompt: promptForImage,
      format: params.format,
    });

    const stored = await uploadAiImageToFirebaseStorage({
      buffer,
      userId: userDocId,
      mimeType: 'image/png',
    });

    pack.imageUrl = stored.publicUrl;
    pack.storagePath = stored.storagePath;
    pack.imageMimeType = 'image/png';
  }

  if (useWelcomeCredit) {
    await consumeWelcomeProCredit(userDocId);
  } else {
    await consumeAICredits(userDocId, creditCost);
  }
  await recordCreativeStudioUsage(userDocId);

  const saved = await saveAiGeneration({
    userDocId,
    type: params.regenerateImage ? 'creative_pack_regenerate_image' : 'creative_pack',
    input: params,
    output: pack,
    brandId: brand.id,
  });

  return {
    ...pack,
    generationId: saved.id,
    brandId: brand.id,
    creditsUsed: useWelcomeCredit ? 0 : creditCost,
    welcomeCreditUsed: useWelcomeCredit,
    format: params.format,
    platform: params.platform,
    style: params.style,
  };
}
