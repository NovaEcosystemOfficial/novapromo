import crypto from 'crypto';
import { config, isEncryptionConfigured } from '../config.js';
import { logger } from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  if (!isEncryptionConfigured()) {
    logger.warn('ENCRYPTION_KEY not configured — using dev-only key. Set a 32+ char key in production.');
    return crypto.scryptSync('novapromo-dev-key', 'salt', 32);
  }
  return crypto.scryptSync(config.encryptionKey, 'novapromo-salt', 32);
}

export function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(encryptedBase64) {
  if (!encryptedBase64) return null;
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function maskToken(token) {
  if (!token || token.length < 8) return '****';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
