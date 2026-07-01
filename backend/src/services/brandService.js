import { getFirebaseAdmin } from './firebase/admin.js';
import { DEFAULT_BRAND_ID } from '../constants/plans.js';
import { logger } from '../utils/logger.js';

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

async function seedBrandIfMissing(admin, brandId) {
  const ref = admin.db.collection('brands').doc(brandId);
  const snap = await ref.get();
  if (snap.exists) return snap.data();

  const now = new Date().toISOString();
  const doc = { ...DEFAULT_BRAND, createdAt: now, updatedAt: now };
  await ref.set(doc);
  return doc;
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
