/**
 * Disattiva un coupon in Firestore.
 * Uso: node scripts/deactivate-coupon.mjs TESTER30
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

const code = String(process.argv[2] || '').trim().toUpperCase();
if (!code) {
  console.error('Uso: node scripts/deactivate-coupon.mjs CODE');
  process.exit(1);
}

const { getFirebaseAdmin } = await import('../backend/src/services/firebase/admin.js');
const admin = await getFirebaseAdmin();
if (!admin) {
  console.error('Firebase Admin non configurato');
  process.exit(1);
}

await admin.db.collection('coupons').doc(code).set(
  { active: false, updatedAt: new Date().toISOString() },
  { merge: true },
);
console.log(`Coupon ${code} disattivato`);
