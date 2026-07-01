import fs from 'fs';

function keys(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => l.split('=')[0]);
}

const b = keys('.env.vercel.backend');
const f = keys('frontend/.env.vercel');
const reqB = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_STORAGE_BUCKET',
  'DATA_STORE',
  'INSTAGRAM_APP_ID',
  'INSTAGRAM_APP_SECRET',
];
const reqF = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];
const backendText = fs.readFileSync('.env.vercel.backend', 'utf8');
console.log('backend missing:', reqB.filter((k) => !b.includes(k)));
console.log('frontend missing:', reqF.filter((k) => !f.includes(k)));
console.log('DATA_STORE:', backendText.match(/^DATA_STORE=(.*)$/m)?.[1]);
console.log('PROJECT:', backendText.match(/^FIREBASE_PROJECT_ID=(.*)$/m)?.[1]);
console.log('private key quoted:', backendText.includes('FIREBASE_PRIVATE_KEY="-----BEGIN'));
