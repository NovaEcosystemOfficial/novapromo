import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runtime = process.env.NOVAPROMO_RUNTIME || 'web';
const isDesktop = runtime === 'desktop';
const isVercel = Boolean(process.env.VERCEL);
const userDataPath = process.env.NOVAPROMO_USER_DATA || '';
const root = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

if (isDesktop && userDataPath) {
  dotenv.config({ path: path.join(userDataPath, '.env.local'), override: true });
}

const nodeEnv = isVercel ? 'production' : (process.env.NODE_ENV || (isDesktop ? 'development' : 'production'));
const isProduction = nodeEnv === 'production';
const tiktokEnabled = process.env.TIKTOK_ENABLED === 'true';

/** Canonical NovaPromo web URL (no NovaWeb). */
export const DEFAULT_WEB_APP_URL = 'https://novapromo.vercel.app';

function stripTrailingSlash(url) {
  return url.replace(/\/$/, '');
}

function resolveWebAppUrl() {
  if (process.env.APP_URL?.trim()) {
    return stripTrailingSlash(process.env.APP_URL.trim());
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return `https://${stripTrailingSlash(productionHost)}`;
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${stripTrailingSlash(process.env.VERCEL_URL.trim())}`;
  }

  return DEFAULT_WEB_APP_URL;
}

function defaultFacebookRedirectUri(frontendUrl, backendUrl) {
  if (process.env.FACEBOOK_REDIRECT_URI?.trim()) {
    return stripTrailingSlash(process.env.FACEBOOK_REDIRECT_URI.trim());
  }

  try {
    const front = new URL(frontendUrl);
    const back = new URL(backendUrl);
    // Facebook Login is strict: redirect should match the public Site URL domain.
    // Frontend proxies /api/* to the backend (see frontend/vercel.json).
    if (front.protocol === 'https:' && front.hostname !== back.hostname) {
      return `${stripTrailingSlash(frontendUrl)}/api/oauth/facebook/callback`;
    }
  } catch {
    // fall through to backend URL
  }

  return `${stripTrailingSlash(backendUrl)}/api/oauth/facebook/callback`;
}

function resolveAppUrls() {
  if (isDesktop) {
    const viteHost = process.env.DESKTOP_HOST || 'localhost';
    const oauthHost = process.env.DESKTOP_OAUTH_HOST || '127.0.0.1';
    const backendPort = parseInt(process.env.PORT || '3001', 10);
    const frontendPort = parseInt(process.env.NOVAPROMO_FRONTEND_PORT || '5173', 10);
    const backendUrl = stripTrailingSlash(process.env.BACKEND_URL || `http://${oauthHost}:${backendPort}`);
    const frontendUrl = stripTrailingSlash(process.env.FRONTEND_URL || `http://${viteHost}:${frontendPort}`);
    const appUrl = stripTrailingSlash(process.env.APP_URL || backendUrl);

    return {
      appUrl,
      frontendUrl,
      backendUrl,
      metaRedirectUri: stripTrailingSlash(
        process.env.META_REDIRECT_URI || `${backendUrl}/api/oauth/instagram/callback`
      ),
      facebookRedirectUri: defaultFacebookRedirectUri(frontendUrl, backendUrl),
      tiktokLoginRedirectUri: stripTrailingSlash(
        process.env.TIKTOK_LOGIN_REDIRECT_URI || `${appUrl}/auth/callback`
      ),
      tiktokApiRedirectUri: stripTrailingSlash(
        process.env.TIKTOK_API_REDIRECT_URI || `${backendUrl}/api/oauth/tiktok/callback`
      ),
    };
  }

  const frontendUrl = stripTrailingSlash(
    process.env.FRONTEND_URL?.trim() || process.env.APP_URL?.trim() || resolveWebAppUrl()
  );
  const backendUrl = stripTrailingSlash(
    process.env.BACKEND_URL?.trim() ||
      (isVercel && process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${stripTrailingSlash(process.env.VERCEL_PROJECT_PRODUCTION_URL.trim())}`
        : frontendUrl)
  );
  const appUrl = stripTrailingSlash(process.env.APP_URL?.trim() || frontendUrl);

  return {
    appUrl,
    frontendUrl,
    backendUrl,
    metaRedirectUri: stripTrailingSlash(
      process.env.META_REDIRECT_URI || `${backendUrl}/api/oauth/instagram/callback`
    ),
    facebookRedirectUri: defaultFacebookRedirectUri(frontendUrl, backendUrl),
    tiktokLoginRedirectUri: stripTrailingSlash(
      process.env.TIKTOK_LOGIN_REDIRECT_URI || `${appUrl}/auth/callback`
    ),
    tiktokApiRedirectUri: stripTrailingSlash(
      process.env.TIKTOK_API_REDIRECT_URI || `${appUrl}/api/oauth/tiktok/callback`
    ),
  };
}

const urls = resolveAppUrls();

function resolveDataPath(relativeSegment, envOverride, vercelFallback) {
  if (isVercel && vercelFallback) return vercelFallback;
  if (envOverride) return envOverride;
  if (isDesktop && userDataPath) {
    return path.join(userDataPath, relativeSegment);
  }
  return path.resolve(__dirname, '..', relativeSegment);
}

const dbPath = resolveDataPath(
  'data/novapromo.db',
  process.env.DB_PATH,
  '/tmp/novapromo/data/novapromo.db'
);
const uploadDir = resolveDataPath(
  'uploads',
  process.env.UPLOAD_DIR,
  '/tmp/novapromo/uploads'
);

if (isVercel) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
} else if (isDesktop) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const APP_URL = urls.appUrl;

export const TIKTOK_PORTAL_REDIRECT_URIS = tiktokEnabled
  ? [urls.tiktokLoginRedirectUri, urls.tiktokApiRedirectUri]
  : [];

export const config = {
  runtime,
  isDesktop,
  isVercel,
  userDataPath,
  appUrl: urls.appUrl,
  tiktokEnabled,
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  isProduction,
  frontendUrl: urls.frontendUrl,
  backendUrl: urls.backendUrl,
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  sessionSecret: process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY || 'dev-session-secret-change-me',
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
  dbPath,
  uploadDir,
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  schedulerCron: process.env.SCHEDULER_CRON || '* * * * *',
  /** Vercel Cron auth — required in production serverless */
  cronSecret: (process.env.CRON_SECRET || '').trim(),
  /** Detailed scheduler phase logs (job created/detected/executed/Meta) */
  schedulerDebug: process.env.SCHEDULER_DEBUG === 'true'
    || process.env.LOG_LEVEL === 'debug'
    || !isProduction,

  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    instagramAppId: process.env.INSTAGRAM_APP_ID || '',
    instagramAppSecret: process.env.INSTAGRAM_APP_SECRET || '',
    redirectUri: urls.metaRedirectUri,
    facebookRedirectUri: urls.facebookRedirectUri,
    facebookConfigId: (process.env.META_FACEBOOK_CONFIG_ID || '').trim(),
    graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
  },

  tiktok: {
    clientKey: (process.env.TIKTOK_CLIENT_KEY || '').trim(),
    clientSecret: (process.env.TIKTOK_CLIENT_SECRET || '').trim(),
    loginRedirectUri: urls.tiktokLoginRedirectUri,
    apiRedirectUri: urls.tiktokApiRedirectUri,
    loginScopes: ['user.info.basic', 'user.info.profile'],
    contentScopes: ['user.info.basic', 'video.upload', 'video.publish'],
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    imageModel: (process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1').trim() || 'gpt-image-1',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT || 'medium',
  },

  stripe: {
    secretKey: (process.env.STRIPE_SECRET_KEY || '').trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || '').trim(),
    priceMonthly: (process.env.STRIPE_PRICE_MONTHLY || '').trim(),
    priceYearly: (process.env.STRIPE_PRICE_YEARLY || '').trim(),
    /** In produzione con Stripe configurato, disabilita mock se true */
    disableMockWhenStripeConfigured: process.env.STRIPE_DISABLE_MOCK === 'true',
    allowMockCheckout: process.env.STRIPE_ALLOW_MOCK === 'true' || !isProduction,
  },
};

export function hasFirebaseStorage() {
  return hasFirebaseAdminCredentials() && Boolean(config.firebase.storageBucket?.trim());
}

export function isEncryptionConfigured() {
  return config.encryptionKey.length >= 32;
}

export function hasMetaCredentials() {
  return Boolean(config.meta.appId && config.meta.appSecret);
}

export function hasTikTokCredentials() {
  return Boolean(config.tiktok.clientKey && config.tiktok.clientSecret);
}

export function hasFirebaseAdminCredentials() {
  return Boolean(
    config.firebase.projectId &&
    config.firebase.clientEmail &&
    config.firebase.privateKey
  );
}

export function getTikTokConfigStatus() {
  if (!config.tiktokEnabled) {
    return {
      ready: false,
      paused: true,
      missing: [],
      environment: config.isDesktop ? 'desktop' : 'web',
      appUrl: APP_URL,
      credentialsMessage: 'Integrazione TikTok in pausa',
      requiredPortalRedirectUris: [],
      activeRedirectUris: null,
      pkceRequired: false,
    };
  }

  const missing = [];
  if (!config.tiktok.clientKey) missing.push('TIKTOK_CLIENT_KEY');
  if (!config.tiktok.clientSecret) missing.push('TIKTOK_CLIENT_SECRET');

  const envPath = isDesktop && userDataPath
    ? path.join(userDataPath, '.env.local')
    : path.join(root, '.env.local');

  return {
    ready: missing.length === 0,
    paused: false,
    missing,
    environment: config.isDesktop ? 'desktop' : 'production',
    appUrl: APP_URL,
    loginRedirectUri: config.tiktok.loginRedirectUri,
    apiRedirectUri: config.tiktok.apiRedirectUri,
    runtime: config.runtime,
    configPath: envPath,
    credentialsLoaded: missing.length === 0,
    requiredPortalRedirectUris: [...TIKTOK_PORTAL_REDIRECT_URIS],
    activeRedirectUris: {
      login: config.tiktok.loginRedirectUri,
      contentApi: config.tiktok.apiRedirectUri,
    },
    credentialsMessage:
      missing.length > 0
        ? `Credenziali TikTok mancanti: configura ${missing.join(' e ')}`
        : null,
    pkceRequired: true,
  };
}

export function getAppFeatures() {
  return {
    tiktokEnabled: config.tiktokEnabled,
    instagramEnabled: true,
    facebookEnabled: true,
    runtime: config.runtime,
    isDesktop: config.isDesktop,
    isVercel: config.isVercel,
    appUrl: config.appUrl,
    backendUrl: config.backendUrl,
    metaRedirectUri: config.meta.redirectUri,
    electronPaused: true,
    aiConfigured: Boolean(config.openai.apiKey?.trim()),
    aiModel: config.openai.model,
    premiumEnabled: true,
  };
}
