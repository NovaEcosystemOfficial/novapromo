import { getFirebaseAdmin } from './firebase/admin.js';
import { DEFAULT_BRAND_ID } from '../constants/plans.js';
import { logger } from '../utils/logger.js';

export const NOVA_PROMO_BRAND_ID = 'nova-promo';

export const NOVA_PROMO_BRAND = {
  id: NOVA_PROMO_BRAND_ID,
  name: 'NovaPromo',
  tone: 'professionale, chiaro, orientato al prodotto',
  colors: ['#f97316', '#7c3aed', '#050506', '#fafafa'],
  forbiddenWords: ['clickbait', 'urgente!!!', 'non crederai'],
  preferredCTA: 'Prova NovaPromo oggi',
  styleNotes: 'Social media marketing, autopublish, tono tech professionale, arancione/viola.',
};

export const DEFAULT_BRAND = {
  id: DEFAULT_BRAND_ID,
  name: 'Nova Ecosystem',
  tone: 'professionale, elegante, semplice',
  colors: ['#7c3aed', '#f97316', '#050506', '#fafafa'],
  forbiddenWords: ['clickbait', 'urgente!!!', 'non crederai', 'shock', 'incredibile'],
  preferredCTA: 'Scopri di più nel link in bio',
  styleNotes: [
    'Tono motivante ma non esagerato',
    'Niente clickbait',
    'Linguaggio pulito e professionale',
    'Accento visivo arancione/nero',
    'Messaggi chiari e diretti',
  ].join('. '),
};

const BRAND_SEEDS = {
  [DEFAULT_BRAND_ID]: DEFAULT_BRAND,
  [NOVA_PROMO_BRAND_ID]: NOVA_PROMO_BRAND,
};

async function seedBrandIfMissing(admin, brandId) {
  const ref = admin.db.collection('brands').doc(brandId);
  const snap = await ref.get();
  if (snap.exists) return { id: brandId, ...snap.data() };

  const seed = BRAND_SEEDS[brandId] || DEFAULT_BRAND;
  const now = new Date().toISOString();
  const doc = { ...seed, id: brandId, createdAt: now, updatedAt: now };
  await ref.set(doc);
  return doc;
}

const FIREBASE_UID_PATTERN = /^[A-Za-z0-9]{20,}$/;

function looksLikeFirebaseUid(value) {
  return typeof value === 'string' && FIREBASE_UID_PATTERN.test(value) && !value.includes('-');
}

/**
 * Risolve il nome visualizzato del progetto senza esporre UID Firestore.
 * Profili Brand Intelligence usano identity.companyName; i seed brand usano name.
 */
function resolveProjectDisplayName(brandId, data = {}) {
  const companyName = data.identity?.companyName?.trim();
  if (companyName && !looksLikeFirebaseUid(companyName)) {
    return companyName;
  }

  const explicitName = typeof data.name === 'string' ? data.name.trim() : '';
  if (explicitName && !looksLikeFirebaseUid(explicitName)) {
    return explicitName;
  }

  if (brandId === NOVA_PROMO_BRAND_ID) return NOVA_PROMO_BRAND.name;
  if (brandId === DEFAULT_BRAND_ID) return DEFAULT_BRAND.name;

  if (looksLikeFirebaseUid(brandId)) return null;

  return explicitName || null;
}

function toProjectOption(brandId, data) {
  const name = resolveProjectDisplayName(brandId, data);
  if (!name) return null;

  const colors = data.colors || data.brand?.colors || [];
  return {
    id: brandId,
    brandId,
    name,
    color: colors[0] || '#7c3aed',
    colorRgb: null,
  };
}

/**
 * Brands/progetti dal Firestore brand store (+ seed NovaPromo / Nova Ecosystem).
 */
export async function listBrands() {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    return [
      toProjectOption(NOVA_PROMO_BRAND_ID, NOVA_PROMO_BRAND),
      toProjectOption(DEFAULT_BRAND_ID, DEFAULT_BRAND),
    ];
  }

  await seedBrandIfMissing(admin, DEFAULT_BRAND_ID);
  await seedBrandIfMissing(admin, NOVA_PROMO_BRAND_ID);

  const snap = await admin.db.collection('brands').get();
  const byId = new Map();

  for (const doc of snap.docs) {
    const option = toProjectOption(doc.id, doc.data());
    if (option) byId.set(doc.id, option);
  }

  if (!byId.has(NOVA_PROMO_BRAND_ID)) {
    byId.set(NOVA_PROMO_BRAND_ID, toProjectOption(NOVA_PROMO_BRAND_ID, NOVA_PROMO_BRAND));
  }
  if (!byId.has(DEFAULT_BRAND_ID)) {
    byId.set(DEFAULT_BRAND_ID, toProjectOption(DEFAULT_BRAND_ID, DEFAULT_BRAND));
  }

  const priority = [NOVA_PROMO_BRAND_ID, DEFAULT_BRAND_ID];
  const sorted = [...byId.values()].sort((a, b) => {
    const ai = priority.indexOf(a.id);
    const bi = priority.indexOf(b.id);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name, 'it');
  });

  return sorted;
}

export async function getBrand(brandId = DEFAULT_BRAND_ID) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    logger.warn('Firebase non configurato — uso brand default in memoria');
    return { ...DEFAULT_BRAND, id: brandId };
  }

  const ref = admin.db.collection('brands').doc(brandId);
  const snap = await ref.get();
  if (!snap.exists) {
    return seedBrandIfMissing(admin, brandId);
  }
  return { id: brandId, ...snap.data() };
}

export function buildBrandSystemPrompt(brand) {
  return [
    `Sei il copywriter di ${brand.name}.`,
    `Tono: ${brand.tone}.`,
    `Note di stile: ${brand.styleNotes}.`,
    `CTA preferita: ${brand.preferredCTA}.`,
    `Parole da evitare: ${(brand.forbiddenWords || []).join(', ')}.`,
    'Scrivi in italiano. Output conciso, premium, senza emoji eccessive.',
    'Non usare clickbait. Non inventare dati o statistiche.',
  ].join('\n');
}
