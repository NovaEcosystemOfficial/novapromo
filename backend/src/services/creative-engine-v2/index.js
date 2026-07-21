/**
 * Nova Creative Engine V2 — orchestrator (Creative Director AI).
 * Parallel engine: does not replace Creative Studio V1.
 *
 * Pipeline:
 * BrandAnalyzer → CreativeBrief → CreativeDirector → StyleEngine →
 * TemplateEngine → LayoutPlanner → PromptComposer → (text LLM) →
 * AssetManager → QualityChecker → PostAssembler → CreativeReport
 */

import { chatCompletion } from '../openaiService.js';
import { getBrand } from '../brandService.js';
import { saveAiGeneration } from '../firebase/aiGenerationRepository.js';
import { getUserPlan, consumeAICredits, computeCreditsRemaining, consumeWelcomeProCredit } from '../planService.js';
import { canUseCreativeStudio, canRegenerateCreativeImage } from '../featureGate.js';
import { isAdmin } from '../adminService.js';
import { assertCreativeStudioRateLimit, recordCreativeStudioUsage } from '../creativeStudioRateLimit.js';
import { DEFAULT_BRAND_ID } from '../../constants/plans.js';
import {
  AI_CREDIT_COSTS,
  CREATIVE_FORMATS,
  CREATIVE_STYLES,
  CREATIVE_PLATFORMS,
} from '../../constants/aiCredits.js';
import { logger } from '../../utils/logger.js';

import { ENGINE_ID, ENGINE_LABEL, ENGINE_VERSION } from './constants.js';
import { analyzeBrand } from './BrandAnalyzer.js';
import { buildCreativeBrief } from './CreativeBrief.js';
import { directCreative } from './CreativeDirector.js';
import { resolveTemplate } from './TemplateEngine.js';
import { planLayout } from './LayoutPlanner.js';
import { composePrompts } from './PromptComposer.js';
import { generateAndStoreImage, prepareFutureAssetSlots } from './AssetManager.js';
import { checkQuality, reinforcePrompt } from './QualityChecker.js';
import { assemblePost, assembleRegenerateBase } from './PostAssembler.js';
import { buildAndLogReport } from './CreativeReport.js';

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
    imagePrompt: input.imagePrompt ? String(input.imagePrompt).slice(0, 8000) : null,
    project: input.project ? String(input.project).slice(0, 120) : null,
    brandId: input.brandId || DEFAULT_BRAND_ID,
    useCreativeEngineV2: true,
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
 * Generate a creative pack with Nova Creative Engine V2 (Beta).
 * Response stays compatible with Creative Studio V1 UI + publish flow.
 */
export async function generateCreativePackV2(userDocId, input) {
  const startedAt = Date.now();
  const params = validateInput(input);
  const creditCost = resolveCreditCost(params);
  const { useWelcomeCredit } = await assertCreativeAccess(userDocId, creditCost, {
    regenerateImage: params.regenerateImage,
  });

  const brandAnalysis = await analyzeBrand({
    brandId: params.brandId,
    userDocId,
    project: params.project,
  });

  const brand = brandAnalysis.legacy || await getBrand(params.brandId || DEFAULT_BRAND_ID);

  // 1) Creative Brief — drives the whole engine
  const brief = buildCreativeBrief({ brandAnalysis, params });

  // 2) Creative Director + Style Engine (brief-driven, not random)
  const director = await directCreative({
    brief,
    brandAnalysis,
    includeVideoPrompt: params.includeVideoPrompt,
  });
  const stylePack = director.stylePack;

  const template = resolveTemplate({
    platform: params.platform,
    format: params.format,
    contentType: director.contentType,
  });

  // 3) Layout Planner — before image
  const layout = planLayout({
    brief,
    styleId: stylePack.id,
    format: params.format,
    templateId: template.id,
  });

  // 4) Prompt Composer — long professional prompts
  const prompts = composePrompts({
    brief,
    stylePack,
    layout,
    template,
    includeVideoPrompt: params.includeVideoPrompt,
    brandAnalysis,
  });

  let rawPack;
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
    rawPack = assembleRegenerateBase(input, params);
    prompts.imagePrompt = params.imagePrompt;
  } else {
    logger.info('Creative Engine V2 text pack', {
      userDocId,
      style: stylePack.id,
      layout: layout.id,
    });
    const raw = await chatCompletion({
      system: prompts.systemPrompt,
      user: prompts.userPrompt,
      json: true,
    });
    rawPack = raw && typeof raw === 'object' ? raw : {};
  }

  let asset = null;
  let quality = null;

  if (params.includeImage) {
    let imagePrompt = params.regenerateImage && params.imagePrompt
      ? params.imagePrompt
      : prompts.imagePrompt;

    let attempt = 0;

    // 5) Quality Score — pre-check
    quality = await checkQuality({
      imagePrompt,
      pack: rawPack,
      director,
      brief,
      stylePack,
      layout,
      attempt,
    });

    if (quality.shouldRegenerate) {
      imagePrompt = reinforcePrompt(imagePrompt, quality);
      attempt += 1;
    }

    asset = await generateAndStoreImage({
      prompt: imagePrompt,
      format: params.format,
      userDocId,
      negativePrompt: prompts.negativePrompt,
    });

    const postQuality = await checkQuality({
      imagePrompt,
      pack: { ...rawPack, imageUrl: asset.imageUrl },
      director,
      brief,
      stylePack,
      layout,
      attempt,
    });

    if (postQuality.shouldRegenerate && attempt < postQuality.maxRegenerations) {
      logger.info('Creative Engine V2 auto-regenerate image', {
        userDocId,
        score: postQuality.score,
        threshold: postQuality.threshold,
        issues: postQuality.issues,
      });
      imagePrompt = reinforcePrompt(imagePrompt, postQuality);
      asset = await generateAndStoreImage({
        prompt: imagePrompt,
        format: params.format,
        userDocId,
        negativePrompt: prompts.negativePrompt,
      });
      attempt += 1;
      quality = await checkQuality({
        imagePrompt,
        pack: { ...rawPack, imageUrl: asset.imageUrl },
        director,
        brief,
        stylePack,
        layout,
        attempt,
      });
    } else {
      quality = postQuality;
    }

    prompts.imagePrompt = imagePrompt;
  }

  // 7) Report
  const report = buildAndLogReport({
    brief,
    stylePack,
    layout,
    prompts,
    quality,
    startedAt,
    userDocId,
  });

  const pack = assemblePost({
    rawPack,
    params,
    brandAnalysis,
    director,
    layout,
    template,
    prompts,
    asset,
    quality,
    brief,
    report,
  });

  // 6) Future-ready slots
  pack.futureAssets = prepareFutureAssetSlots();

  if (useWelcomeCredit) {
    await consumeWelcomeProCredit(userDocId);
  } else {
    await consumeAICredits(userDocId, creditCost);
  }
  await recordCreativeStudioUsage(userDocId);

  const saved = await saveAiGeneration({
    userDocId,
    type: params.regenerateImage
      ? 'creative_pack_v2_regenerate_image'
      : 'creative_pack_v2',
    input: { ...params, engine: ENGINE_ID },
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
    engineId: ENGINE_ID,
    engineLabel: ENGINE_LABEL,
    engineVersion: ENGINE_VERSION,
  };
}

export {
  ENGINE_ID,
  ENGINE_LABEL,
  ENGINE_VERSION,
};
