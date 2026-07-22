/**
 * Crea/aggiorna il coupon tester Premium in Firestore.
 *
 * Uso:
 *   node scripts/create-tester-coupon.mjs
 *   node scripts/create-tester-coupon.mjs BetaPromo30 30 3
 *
 * Args: [CODE] [DAYS] [MAX_USES]
 * Default: BETAPROMO30 / 30 giorni / 3 usi
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value.replace(/\\n/g, '\n');
    }
  }
}

loadEnvFile(resolve(root, '.env'));
loadEnvFile(resolve(root, '.env.local'));

const code = String(process.argv[2] || 'BETAPROMO30').trim().toUpperCase();
const days = Math.max(1, parseInt(process.argv[3] || '30', 10) || 30);
const maxUses = Math.max(1, parseInt(process.argv[4] || '3', 10) || 3);

const { getFirebaseAdmin } = await import('../backend/src/services/firebase/admin.js');

const admin = await getFirebaseAdmin();
if (!admin) {
  console.error('Firebase Admin non configurato. Imposta FIREBASE_* in .env / .env.local');
  process.exit(1);
}

const now = new Date().toISOString();
const payload = {
  code,
  active: true,
  type: 'premium_days',
  value: days,
  maxUses,
  usedCount: 0,
  label: 'Beta Promo — Premium',
  description: `Accesso beta: Creative Studio PRO e Premium per ${days} giorni (max ${maxUses} usi).`,
  createdAt: now,
  updatedAt: now,
};

await admin.db.collection('coupons').doc(code).set(payload, { merge: true });

console.log('Coupon creato/aggiornato in Firestore:');
console.log(`  collection: coupons`);
console.log(`  docId/code: ${code}`);
console.log(`  type: premium_days`);
console.log(`  value: ${days} giorni`);
console.log(`  maxUses: ${maxUses}`);
console.log('');
console.log('Istruzione tester:');
console.log('  1. Apri https://novapromo.vercel.app e registrati');
console.log('  2. Vai in Account → Codice promo');
console.log(`  3. Inserisci: ${code}`);
