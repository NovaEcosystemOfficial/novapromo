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

  return [
    'Impostazioni app → Di base → Aggiungi piattaforma → Sito web → URL: ' + config.frontendUrl,
    `Domini app: ${frontendHost}${backendHost !== frontendHost ? `, ${backendHost}` : ''}`,
    'Menu sinistro → Facebook Login for Business → Impostazioni (non solo Di base)',
    `URI OAuth validi — aggiungi ENTRAMBI (copia-incolla):`,
    `  • ${frontendRedirect}`,
    backendHost !== frontendHost ? `  • https://${backendHost}/api/oauth/facebook/callback` : null,
    `NovaPromo userà: ${redirectUri || frontendRedirect}`,
    'Attiva Accesso OAuth client + Accesso OAuth Web; URL del sito = ' + config.frontendUrl,
    'Privacy policy e Termini devono essere HTTPS pubblici',
    'Devi essere admin della Pagina e concedere pages_manage_posts',
  ].filter(Boolean);
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
