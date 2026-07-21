/**
 * Smoke test — Nova Creative Engine V2 modules (no OpenAI / network).
 * Run: node scripts/test-creative-engine-v2.mjs
 */

import { resolveStyle, suggestConceptFromHints, listConcepts } from '../backend/src/services/creative-engine-v2/StyleEngine.js';
import { planLayout, listLayouts } from '../backend/src/services/creative-engine-v2/LayoutPlanner.js';
import { resolveTemplate, listTemplates } from '../backend/src/services/creative-engine-v2/TemplateEngine.js';
import { composePrompts } from '../backend/src/services/creative-engine-v2/PromptComposer.js';
import { assemblePost } from '../backend/src/services/creative-engine-v2/PostAssembler.js';
import { reinforcePrompt } from '../backend/src/services/creative-engine-v2/QualityChecker.js';
import {
  VISUAL_CONCEPTS,
  ENGINE_ID,
  FUTURE_CAPABILITIES,
} from '../backend/src/services/creative-engine-v2/constants.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const concept = suggestConceptFromHints({ style: 'tech', sector: 'SaaS AI' });
assert(VISUAL_CONCEPTS.includes(concept), 'concept must be valid');

const style = resolveStyle(concept, { palette: ['#7C3AED', '#F97316'] });
assert(style.palette.includes('#7C3AED'), 'brand palette merged');

const template = resolveTemplate({ platform: 'instagram', format: 'square' });
assert(template.id === 'instagram_feed', 'instagram feed template');

const layout = planLayout({ conceptId: 'split_layout', format: 'square', templateId: template.id });
assert(layout.id === 'split', 'split layout');

const brandAnalysis = {
  companyName: 'NovaPromo',
  sector: 'MarTech',
  shortDescription: 'Autopublisher',
  palette: ['#7C3AED'],
  toneOfVoice: ['professionale'],
  wordsToUse: ['automazione'],
  wordsToAvoid: ['clickbait'],
  hashtags: ['#NovaPromo'],
  preferredCtas: ['Prova gratis'],
  marketingGoals: ['brand_awareness'],
  summary: 'Brand: NovaPromo',
  project: 'Demo',
};

const director = {
  conceptId: concept,
  conceptLabel: style.label,
  rationale: 'Test rationale',
  marketingObjective: 'brand_awareness',
  ctaStrategy: 'Prova gratis',
  tonePlan: 'professionale',
  photographyMode: concept === 'brand_photography',
  stylePack: style,
};

const prompts = composePrompts({
  brandAnalysis,
  director,
  layout,
  template,
  idea: 'Lancio Nova Creative Engine V2',
  platform: 'instagram',
  format: 'square',
  includeVideoPrompt: true,
});

assert(prompts.imagePrompt.length > 500, 'image prompt must be long');
assert(/NEGATIVE PROMPT/i.test(prompts.imagePrompt), 'negative prompt present');
assert(/Camera:/i.test(prompts.imagePrompt), 'camera direction present');

const pack = assemblePost({
  rawPack: {
    caption: 'NovaPromo accelera il publishing.',
    hashtags: '#NovaPromo #AI',
    cta: 'Prova gratis',
    altText: 'Creatività NovaPromo',
    variantA: { caption: 'A', cta: 'A' },
    variantB: { caption: 'B', cta: 'B' },
    storyCopy: 'Story copy',
    reelCoverLine: 'Cover',
    carouselSlides: [{ title: '1', body: 'Hook' }],
    platformVariants: {},
  },
  params: { style: 'tech', format: 'square', includeVideoPrompt: true, idea: 'test' },
  brandAnalysis,
  director,
  layout,
  template,
  prompts,
  asset: { imageUrl: 'https://example.com/x.png', storagePath: 'ai/x.png', imageMimeType: 'image/png' },
  quality: { pass: true, score: 88, issues: [] },
});

assert(pack.engine.id === ENGINE_ID, 'engine id');
assert(pack.variantA && pack.variantB, 'variants');
assert(pack.story?.copy, 'story');
assert(pack.coverReel?.line, 'cover reel');
assert(pack.carousel?.length === 1, 'carousel');
assert(FUTURE_CAPABILITIES.videoAi.status === 'planned', 'future hooks');

const reinforced = reinforcePrompt(prompts.imagePrompt, { issues: ['testo errato'] });
assert(reinforced.includes('CRITICAL QUALITY'), 'reinforce works');

assert(listConcepts().length === VISUAL_CONCEPTS.length, 'list concepts');
assert(listLayouts().length > 0, 'list layouts');
assert(listTemplates().length > 0, 'list templates');

console.log('OK — Creative Engine V2 smoke test passed');
console.log({
  engine: ENGINE_ID,
  concept,
  layout: layout.id,
  template: template.id,
  promptChars: prompts.imagePrompt.length,
  futureHooks: Object.keys(FUTURE_CAPABILITIES).length,
});
