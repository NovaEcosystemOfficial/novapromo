/**
 * Writes Firebase env vars to .env.local (gitignored). Does not print secrets.
 * Usage: node scripts/setup-firebase-env.mjs [path-to-service-account.json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saPath =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || '', 'Downloads', 'novaecosystem-b8a4b-firebase-adminsdk-fbsvc-1a989c2cd7.json');

if (!fs.existsSync(saPath)) {
  console.error('Service account file not found:', saPath);
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const projectId = creds.project_id;
const storageBucket = `${projectId}.firebasestorage.app`;

let webConfig = {
  apiKey: '',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket,
  messagingSenderId: '',
  appId: '',
};

try {
  const auth = new GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase.readonly'],
  });
  const client = await auth.getClient();
  const appsRes = await client.request({
    url: `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
  });
  const apps = appsRes.data.apps || [];
  const novaPromo =
    apps.find((a) => /novapromo/i.test(a.displayName || '')) || apps[0];
  if (novaPromo) {
    const appId = novaPromo.name.split('/').pop();
    const cfgRes = await client.request({
      url: `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${appId}/config`,
    });
    const c = cfgRes.data;
    webConfig = {
      apiKey: c.apiKey || '',
      authDomain: c.authDomain || webConfig.authDomain,
      projectId: c.projectId || projectId,
      storageBucket: c.storageBucket || storageBucket,
      messagingSenderId: c.messagingSenderId || '',
      appId: c.appId || '',
    };
    console.log('Web app:', novaPromo.displayName || appId);
  }
} catch (err) {
  console.warn('Web SDK config fetch skipped:', err.message);
}

function upsertEnvFile(filePath, entries) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    content = re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`);
}

const privateKeyOneLine = JSON.stringify(creds.private_key);

upsertEnvFile(path.join(root, '.env.local'), {
  FIREBASE_PROJECT_ID: projectId,
  FIREBASE_CLIENT_EMAIL: creds.client_email,
  FIREBASE_PRIVATE_KEY: privateKeyOneLine,
  FIREBASE_STORAGE_BUCKET: storageBucket,
  DATA_STORE: 'firebase',
});

upsertEnvFile(path.join(root, 'frontend', '.env.local'), {
  VITE_FIREBASE_API_KEY: webConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: webConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: webConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: webConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: webConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: webConfig.appId,
});

console.log('Updated .env.local and frontend/.env.local');
console.log('Project:', projectId);
console.log('Frontend config complete:', Boolean(webConfig.apiKey && webConfig.appId));
