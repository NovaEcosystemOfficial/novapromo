import { config, hasTikTokCredentials } from '../config.js';
import { getAccountByPlatform } from './accountService.js';
import { getMetaCredentialsStatus } from './instagram/metaConfig.js';

const lastChecks = { instagram: null, tiktok: null };

export function recordApiCheck(platform) {
  lastChecks[platform] = new Date().toISOString();
}

function buildInstagramProfileSummary(account) {
  if (!account) return null;
  const meta = account.metadata || {};
  return {
    username: account.username,
    instagramAccountId: meta.instagramAccountId || account.externalUserId,
    pageId: meta.pageId || null,
    pageName: meta.pageName || null,
    accountType: meta.accountType || null,
    facebookUserId: meta.facebookUserId || null,
    facebookUserName: meta.facebookUserName || null,
    connectionStatus: 'connected',
  };
}

function buildMetaNextStep({ account, metaStatus }) {
  if (!metaStatus.credentialsPresent) {
    return metaStatus.credentialsError || 'Configura INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET su Vercel (sezione Instagram Login in Meta Developers)';
  }
  if (!account) return 'Collega Instagram Business/Creator via OAuth Meta';
  return 'Integrazione Instagram pronta';
}

function buildTikTokNextStep({ account, credentialsPresent, paused }) {
  if (paused) return 'Integrazione TikTok in pausa';
  if (!credentialsPresent) {
    return 'Imposta TIKTOK_ENABLED=true e credenziali TikTok';
  }
  if (!account) {
    return `Registra redirect URI in TikTok Developers: ${config.tiktok.apiRedirectUri} — poi collega account`;
  }
  return 'Integrazione TikTok Content API pronta';
}

export function getInstagramIntegrationStatus() {
  recordApiCheck('instagram');
  const account = getAccountByPlatform('instagram');
  const metaStatus = getMetaCredentialsStatus();
  const profile = buildInstagramProfileSummary(account);

  return {
    platform: 'instagram',
    name: 'Instagram (Meta)',
    mode: 'REAL',
    ...metaStatus,
    canStartOAuth: metaStatus.credentialsPresent,
    tokenPresent: Boolean(account),
    accountUsername: account?.username || null,
    tokenExpiresAt: account?.tokenExpiresAt || null,
    connectionStatus: account ? 'connected' : 'disconnected',
    profile,
    lastApiCheck: lastChecks.instagram,
    nextStep: buildMetaNextStep({ account, metaStatus }),
    requiredScopes: [
      'instagram_business_basic',
      'instagram_business_content_publish',
    ],
    facebookPageScopesNotRequired: true,
    oauthParams: {
      force_reauth: true,
      enable_fb_login: false,
    },
    testerSetup: [
      'Meta Developers → App Nova_Promo → Roles → Instagram Testers → aggiungi @novaecosystem',
      'Instagram (account @novaecosystem) → Impostazioni → App e siti web → Inviti → Accetta Nova_Promo',
      'Riprova il collegamento in finestra privata loggandoti come @novaecosystem',
    ],
  };
}

export function getTikTokIntegrationStatus() {
  recordApiCheck('tiktok');

  if (!config.tiktokEnabled) {
    return {
      platform: 'tiktok',
      name: 'TikTok',
      mode: 'PAUSED',
      paused: true,
      credentialsPresent: false,
      credentialsError: null,
      canStartOAuth: false,
      tokenPresent: false,
      accountUsername: null,
      tokenExpiresAt: null,
      connectionStatus: 'paused',
      lastApiCheck: lastChecks.tiktok,
      nextStep: 'Integrazione TikTok in pausa',
      redirectUri: config.tiktok.apiRedirectUri,
      loginRedirectUri: config.tiktok.loginRedirectUri,
    };
  }

  const account = getAccountByPlatform('tiktok');
  const credentialsPresent = hasTikTokCredentials();

  return {
    platform: 'tiktok',
    name: 'TikTok',
    mode: 'REAL',
    paused: false,
    credentialsPresent,
    credentialsError: !credentialsPresent ? 'Credenziali TikTok mancanti' : null,
    canStartOAuth: credentialsPresent,
    tokenPresent: Boolean(account),
    accountUsername: account?.username || null,
    tokenExpiresAt: account?.tokenExpiresAt || null,
    connectionStatus: account ? 'connected' : 'disconnected',
    lastApiCheck: lastChecks.tiktok,
    nextStep: buildTikTokNextStep({ account, credentialsPresent, paused: false }),
    redirectUri: config.tiktok.apiRedirectUri,
    loginRedirectUri: config.tiktok.loginRedirectUri,
  };
}

export function getAllIntegrationsStatus() {
  return {
    instagram: getInstagramIntegrationStatus(),
    tiktok: getTikTokIntegrationStatus(),
  };
}

export function assertCanStartOAuth(platform) {
  const status = platform === 'instagram'
    ? getInstagramIntegrationStatus()
    : getTikTokIntegrationStatus();

  if (platform === 'instagram' && !status.canStartOAuth) {
    const err = new Error(status.credentialsError || 'Credenziali Meta mancanti');
    err.code = status.errors?.[0]?.code || 'MISSING_CREDENTIALS';
    err.status = 400;
    err.details = status.errors;
    throw err;
  }

  if (!status.canStartOAuth) {
    const err = new Error(status.credentialsError || 'Integrazione non configurata');
    err.code = 'MISSING_CREDENTIALS';
    err.status = 400;
    throw err;
  }

  return status;
}
