import { config } from '../../config.js';

export const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com';
export const FACEBOOK_OAUTH_DIALOG_URL = 'https://www.facebook.com';

export function getFacebookGraphApiBase() {
  return `${FACEBOOK_GRAPH_URL}/${config.meta.graphApiVersion}`;
}

export function getFacebookCredentialsStatus() {
  const appIdPresent = Boolean(config.meta.appId?.trim());
  const appSecretPresent = Boolean(config.meta.appSecret?.trim());
  const redirectUriConfigured = Boolean(config.meta.facebookRedirectUri?.trim());

  const errors = [];
  if (!appIdPresent) {
    errors.push({
      code: 'META_APP_ID_MISSING',
      message: 'META_APP_ID mancante — necessario per Facebook Page Login (App Meta principale).',
    });
  }
  if (!appSecretPresent) {
    errors.push({
      code: 'META_APP_SECRET_MISSING',
      message: 'META_APP_SECRET mancante — necessario per Facebook Page Login.',
    });
  }
  if (!redirectUriConfigured) {
    errors.push({
      code: 'FACEBOOK_REDIRECT_URI_MISSING',
      message: 'FACEBOOK_REDIRECT_URI non configurato.',
    });
  } else if (
    (config.isProduction || config.isVercel) &&
    !config.isDesktop &&
    !config.meta.facebookRedirectUri.startsWith('https://')
  ) {
    errors.push({
      code: 'FACEBOOK_REDIRECT_URI_INSECURE',
      message:
        'FACEBOOK_REDIRECT_URI deve usare HTTPS in produzione (es. https://novapromo-backend.vercel.app/api/oauth/facebook/callback).',
    });
  }

  const credentialsPresent =
    appIdPresent &&
    appSecretPresent &&
    redirectUriConfigured &&
    !errors.some((e) => e.code === 'FACEBOOK_REDIRECT_URI_INSECURE');

  return {
    appIdPresent,
    appSecretPresent,
    redirectUriConfigured,
    credentialsPresent,
    errors,
    credentialsError: errors[0]?.message || null,
    redirectUri: config.meta.facebookRedirectUri,
    facebookConfigId: config.meta.facebookConfigId || null,
    facebookConfigIdConfigured: Boolean(config.meta.facebookConfigId?.trim()),
    appIdPreview: appIdPresent
      ? `${config.meta.appId.slice(0, 4)}…${config.meta.appId.slice(-4)}`
      : null,
  };
}

export function getFacebookSetupChecklist() {
  const redirectUri = config.meta.facebookRedirectUri || '';
  let frontendHost = 'novapromo.vercel.app';
  let backendHost = 'novapromo-backend.vercel.app';
  try {
    frontendHost = new URL(config.frontendUrl).hostname;
    backendHost = new URL(config.backendUrl).hostname;
  } catch {
    // keep defaults
  }

  const frontendRedirect = `${config.frontendUrl}/api/oauth/facebook/callback`;
  const configId = config.meta.facebookConfigId?.trim();

  return [
    'App Nova_Promo usa Facebook Login for Business — serve una Configuration + config_id',
    'Menu → Facebook Login for Business → Configurazioni → Crea configurazione',
    'Tipo: User access token · Asset: Pagine Facebook',
    'Permessi: pages_show_list, pages_read_engagement, pages_manage_posts',
    `Redirect nella configurazione: ${redirectUri || frontendRedirect}`,
    configId
      ? `META_FACEBOOK_CONFIG_ID su Vercel: ${configId} (configurato)`
      : 'Copia il Configuration ID in Vercel come META_FACEBOOK_CONFIG_ID e redeploy backend',
    'Impostazioni OAuth client → URI validi (già ok se hai novapromo.vercel.app/.../callback)',
    'Accesso OAuth client + OAuth web attivi; Applica HTTPS = Sì',
  ];
}

export function assertFacebookOAuthReady() {
  const status = getFacebookCredentialsStatus();
  if (!status.credentialsPresent) {
    const err = new Error(
      status.errors.map((e) => e.message).join(' · ') || 'Credenziali Meta (Facebook) mancanti'
    );
    err.code = status.errors[0]?.code || 'FACEBOOK_CREDENTIALS_MISSING';
    err.status = 400;
    err.details = status.errors;
    throw err;
  }
  return status;
}
