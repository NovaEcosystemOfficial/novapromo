import crypto from 'crypto';

/** RFC 7636 PKCE — TikTok richiede code_challenge sull'authorize URL */
const VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function generateCodeVerifier() {
  const bytes = crypto.randomBytes(64);
  let verifier = '';
  for (let i = 0; i < 64; i += 1) {
    verifier += VERIFIER_CHARS[bytes[i] % VERIFIER_CHARS.length];
  }
  return verifier;
}

export function generateCodeChallenge(codeVerifier) {
  // TikTok richiede SHA256 in esadecimale, NON base64url (RFC 7636 standard)
  // @see https://developers.tiktok.com/doc/login-kit-desktop
  return crypto.createHash('sha256').update(codeVerifier).digest('hex');
}

export function createPkcePair() {
  const codeVerifier = generateCodeVerifier();
  return {
    codeVerifier,
    codeChallenge: generateCodeChallenge(codeVerifier),
  };
}
