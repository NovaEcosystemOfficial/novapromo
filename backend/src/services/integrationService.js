import { config, hasTikTokCredentials } from '../config.js';
import { getAccountByPlatform } from './accountService.js';
import { getMetaCredentialsStatus } from './instagram/metaConfig.js';
import { getFacebookCredentialsStatus } from './facebook/metaFacebookConfig.js';

const lastChecks = { instagram: null, facebook: null, tiktok: null };

export function recordApiCheck(platform) {
  lastChecks[platform] = new Date().toISOString();
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Single source of truth for Instagram connection state (token + account row in DB).
 */
export function evaluateInstagramConnection(account) {
  if (!account) {
    return {
      connected: false,
      connectionStatus: 'disconnected',
      accountId: null,
      accountUsername: null,
      instagramAccountId: null,
      tokenExpiresAt: null,
      tokenPresent: false,
      profile: null,
    };
  }

  const meta = account.metadata || {};
  const instagramAccountId = meta.instagramAccountId || account.externalUserId || null;
  const hasToken = Boolean(account.accessToken);
  const hasUsername = Boolean(account.username?.trim());
  const hasBusinessId = Boolean(instagramAccountId);
  const tokenExpired = isTokenExpired(account.tokenExpiresAt);
  const connected = hasToken && hasUsername && hasBusinessId && !tokenExpired;

  let connectionStatus = 'disconnected';
  if (connected) {
    connectionStatus = 'connected';
  } else if (hasToken && hasUsername && hasBusinessId && tokenExpired) {
    connectionStatus = 'token_expired';
  }

  const profile = {
    username: account.username,
    instagramAccountId,
    pageId: meta.pageId || null,
    pageName: meta.pageName || null,
    accountType: meta.accountType || null,
    facebookUserId: meta.facebookUserId || null,
    facebookUserName: meta.facebookUserName || null,
    connectionMode: meta.connectionMode || 'INSTAGRAM_LOGIN',
    connectionStatus,
  };

  return {
    connected,
    connectionStatus,
    accountId: account.id,
    accountUsername: account.username,
    instagramAccountId,
    tokenExpiresAt: account.tokenExpiresAt || null,
    tokenPresent: hasToken,
    profile,
    connectedAt: account.connectedAt || null,
    updatedAt: account.updatedAt || null,
  };
}

function buildMetaNextStep({ connected, metaStatus }) {
  if (!metaStatus.credentialsPresent) {
    return metaStatus.credentialsError || 'Configura INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET su Vercel (sezione Instagram Login in Meta Developers)';
  }
  if (!connected) return 'Collega Instagram Business/Creator via OAuth Meta';
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

export async function getInstagramIntegrationStatus() {
  recordApiCheck('instagram');
  const account = await getAccountByPlatform('instagram');
  const metaStatus = getMetaCredentialsStatus();
  const connection = evaluateInstagramConnection(account);

  return {
    platform: 'instagram',
    name: 'Instagram (Meta)',
    mode: 'REAL',
    ...metaStatus,
    ...connection,
    canStartOAuth: metaStatus.credentialsPresent,
    lastApiCheck: lastChecks.instagram,
    nextStep: buildMetaNextStep({ connected: connection.connected, metaStatus }),
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

export async function getFacebookIntegrationStatus() {
  recordApiCheck('facebook');
  const account = await getAccountByPlatform('facebook');
  const fbStatus = getFacebookCredentialsStatus();
  const connection = evaluateFacebookConnection(account);

  return {
    platform: 'facebook',
    name: 'Facebook Page',
    mode: 'REAL',
    ...fbStatus,
    ...connection,
    canStartOAuth: fbStatus.credentialsPresent,
    lastApiCheck: lastChecks.facebook,
    nextStep: connection.connected
      ? 'Pagina Facebook pronta per la pubblicazione'
      : fbStatus.credentialsPresent
        ? 'Collega una Pagina Facebook via Meta Login'
        : fbStatus.credentialsError,
    requiredScopes: [
      'pages_show_list',
      'pages_manage_posts',
      'pages_read_engagement',
    ],
  };
}

function evaluateFacebookConnection(account) {
  if (!account) {
    return {
      connected: false,
      connectionStatus: 'disconnected',
      accountId: null,
      accountUsername: null,
      facebookPageId: null,
      pageName: null,
      tokenExpiresAt: null,
      tokenPresent: false,
      profile: null,
    };
  }

  const meta = account.metadata || {};
  const pageId = meta.facebookPageId || account.externalUserId || null;
  const hasToken = Boolean(account.accessToken);
  const status = meta.status || (hasToken ? 'connected' : 'disconnected');
  const tokenExpired = isTokenExpired(account.tokenExpiresAt);
  const connected = hasToken && Boolean(pageId) && status === 'connected' && !tokenExpired;

  let connectionStatus = 'disconnected';
  if (connected) connectionStatus = 'connected';
  else if (hasToken && pageId && tokenExpired) connectionStatus = 'token_expired';

  return {
    connected,
    connectionStatus,
    accountId: account.id,
    accountUsername: account.username || meta.pageName,
    facebookPageId: pageId,
    pageName: meta.pageName || account.displayName,
    tokenExpiresAt: account.tokenExpiresAt || null,
    tokenPresent: hasToken,
    connectedAt: meta.connectedAt || account.connectedAt || null,
    profile: {
      facebookPageId: pageId,
      pageName: meta.pageName || account.displayName,
      status: meta.status || connectionStatus,
      connectionMode: meta.connectionMode || 'FACEBOOK_PAGE',
      connectionStatus,
    },
  };
}

export async function getTikTokIntegrationStatus() {
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

  const account = await getAccountByPlatform('tiktok');
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

export async function getAllIntegrationsStatus() {
  return {
    instagram: await getInstagramIntegrationStatus(),
    facebook: await getFacebookIntegrationStatus(),
    tiktok: await getTikTokIntegrationStatus(),
  };
}

export async function assertCanStartOAuth(platform) {
  const status =
    platform === 'instagram'
      ? await getInstagramIntegrationStatus()
      : platform === 'facebook'
        ? await getFacebookIntegrationStatus()
        : await getTikTokIntegrationStatus();

  if (platform === 'instagram' && !status.canStartOAuth) {
    const err = new Error(status.credentialsError || 'Credenziali Meta mancanti');
    err.code = status.errors?.[0]?.code || 'MISSING_CREDENTIALS';
    err.status = 400;
    err.details = status.errors;
    throw err;
  }

  if (platform === 'facebook' && !status.canStartOAuth) {
    const err = new Error(status.credentialsError || 'Credenziali Meta (Facebook) mancanti');
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
