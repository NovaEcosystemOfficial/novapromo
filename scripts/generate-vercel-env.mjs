/**
 * Generate Vercel-importable .env files from local env (no secrets printed).
 * Output: .env.vercel.backend, frontend/.env.vercel (gitignored)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value.replace(/\\n/g, '\n');
  }
  return out;
}

function formatEnvValue(value) {
  if (value == null || value === '') return '';
  const needsQuotes = /[\s#"'\\]/.test(value) || value.includes('\n');
  if (!needsQuotes) return value;
  return `"${value.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"`;
}

function writeEnvFile(filePath, entries, headerLines = []) {
  const lines = [
    ...headerLines,
    ...Object.entries(entries)
      .filter(([, v]) => v != null && String(v).length > 0)
      .map(([k, v]) => `${k}=${formatEnvValue(v)}`),
    '',
  ];
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

const rootLocal = parseEnvFile(path.join(root, '.env.local'));
const frontendLocal = parseEnvFile(path.join(root, 'frontend', '.env.local'));
const merged = { ...parseEnvFile(path.join(root, '.env')), ...rootLocal };

const instagramAppId = merged.INSTAGRAM_APP_ID || merged.META_APP_ID || '';
const instagramAppSecret = merged.INSTAGRAM_APP_SECRET || merged.META_APP_SECRET || '';

const backendEntries = {
  NODE_ENV: 'production',
  APP_URL: 'https://novapromo.vercel.app',
  FRONTEND_URL: 'https://novapromo.vercel.app',
  BACKEND_URL: 'https://novapromo-backend.vercel.app',
  META_REDIRECT_URI: 'https://novapromo-backend.vercel.app/api/oauth/instagram/callback',
  META_GRAPH_API_VERSION: merged.META_GRAPH_API_VERSION || 'v21.0',
  INSTAGRAM_APP_ID: instagramAppId,
  INSTAGRAM_APP_SECRET: instagramAppSecret,
  META_APP_ID: merged.META_APP_ID || instagramAppId,
  META_APP_SECRET: merged.META_APP_SECRET || instagramAppSecret,
  SESSION_SECRET: merged.SESSION_SECRET,
  ENCRYPTION_KEY: merged.ENCRYPTION_KEY,
  TIKTOK_ENABLED: merged.TIKTOK_ENABLED || 'false',
  DATA_STORE: 'firebase',
  FIREBASE_PROJECT_ID: merged.FIREBASE_PROJECT_ID || 'novaecosystem-b8a4b',
  FIREBASE_CLIENT_EMAIL: merged.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: merged.FIREBASE_PRIVATE_KEY,
  FIREBASE_STORAGE_BUCKET: merged.FIREBASE_STORAGE_BUCKET || 'novaecosystem-b8a4b.firebasestorage.app',
};

const frontendEntries = {
  VITE_FIREBASE_API_KEY: frontendLocal.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: frontendLocal.VITE_FIREBASE_AUTH_DOMAIN || 'novaecosystem-b8a4b.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: frontendLocal.VITE_FIREBASE_PROJECT_ID || 'novaecosystem-b8a4b',
  VITE_FIREBASE_STORAGE_BUCKET: frontendLocal.VITE_FIREBASE_STORAGE_BUCKET || 'novaecosystem-b8a4b.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: frontendLocal.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: frontendLocal.VITE_FIREBASE_APP_ID,
  VITE_DEMO_MODE: 'false',
  VITE_TIKTOK_ENABLED: 'false',
};

const backendRequired = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_STORAGE_BUCKET',
  'DATA_STORE',
  'INSTAGRAM_APP_ID',
  'INSTAGRAM_APP_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
];

const frontendRequired = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const backendMissing = backendRequired.filter((k) => !backendEntries[k]?.trim());
const frontendMissing = frontendRequired.filter((k) => !frontendEntries[k]?.trim());

if (backendMissing.length || frontendMissing.length) {
  console.error('Missing required variables:');
  if (backendMissing.length) console.error('  backend:', backendMissing.join(', '));
  if (frontendMissing.length) console.error('  frontend:', frontendMissing.join(', '));
  process.exit(1);
}

if (backendEntries.DATA_STORE !== 'firebase') {
  console.error('DATA_STORE must be firebase');
  process.exit(1);
}

if (backendEntries.FIREBASE_PROJECT_ID !== 'novaecosystem-b8a4b') {
  console.warn('Warning: FIREBASE_PROJECT_ID is not novaecosystem-b8a4b');
}

const backendPath = path.join(root, '.env.vercel.backend');
const frontendPath = path.join(root, 'frontend', '.env.vercel');

writeEnvFile(backendPath, backendEntries, [
  '# NovaPromo backend — import in Vercel project novapromo-backend',
  '# Settings → Environment Variables → Import .env → Production + Preview',
]);
writeEnvFile(frontendPath, frontendEntries, [
  '# NovaPromo frontend — import in Vercel project novapromo',
  '# Settings → Environment Variables → Import .env → Production + Preview',
]);

console.log('Created:', path.relative(root, backendPath));
console.log('Created:', path.relative(root, frontendPath));
console.log('Backend keys:', Object.keys(backendEntries).length);
console.log('Frontend keys:', Object.keys(frontendEntries).length);
console.log('Vercel import ready: KEY=VALUE format, quoted multiline FIREBASE_PRIVATE_KEY');
