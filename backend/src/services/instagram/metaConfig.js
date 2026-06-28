import { config } from '../../config.js';

export const META_ERROR_CODES = {
  META_APP_ID_MISSING: 'META_APP_ID_MISSING',
  META_APP_SECRET_MISSING: 'META_APP_SECRET_MISSING',
  META_REDIRECT_URI_MISSING: 'META_REDIRECT_URI_MISSING',
  META_CREDENTIALS_MISSING: 'META_CREDENTIALS_MISSING',
  NO_FACEBOOK_PAGES: 'NO_FACEBOOK_PAGES',
  NO_INSTAGRAM_ON_PAGE: 'NO_INSTAGRAM_ON_PAGE',
  INSTAGRAM_NOT_BUSINESS_CREATOR: 'INSTAGRAM_NOT_BUSINESS_CREATOR',
};
const ALLOWED_IG_ACCOUNT_TYPES = new Set(['BUSINESS', 'MEDIA_CREATOR']);

export function isMetaRedirectUriConfigured() {
  return Boolean(config.meta.redirectUri?.trim());
}

export function getMetaCredentialsStatus() {
  const appIdPresent = Boolean(config.meta.appId?.trim());
  const appSecretPresent = Boolean(config.meta.appSecret?.trim());
  const redirectUriConfigured = isMetaRedirectUriConfigured();
  const credentialsPresent = appIdPresent && appSecretPresent && redirectUriConfigured;

  const errors = [];
  if (!appIdPresent) {
    errors.push({
      code: META_ERROR_CODES.META_APP_ID_MISSING,
      message: 'META_APP_ID mancante — aggiungilo in .env.local',
    });
  }
  if (!appSecretPresent) {
    errors.push({
      code: META_ERROR_CODES.META_APP_SECRET_MISSING,
      message: 'META_APP_SECRET mancante — aggiungilo in .env.local (solo backend)',
    });
  }
  if (!redirectUriConfigured) {
    errors.push({
      code: META_ERROR_CODES.META_REDIRECT_URI_MISSING,
      message: 'META_REDIRECT_URI non configurato — es. http://127.0.0.1:3001/api/oauth/instagram/callback',
    });
  }

  return {
    appIdPresent,
    appSecretPresent,
    redirectUriConfigured,
    credentialsPresent,
    errors,
    credentialsError: errors[0]?.message || null,
    redirectUri: config.meta.redirectUri,
  };
}

export function assertMetaRealOAuthReady() {
  const status = getMetaCredentialsStatus();
  if (!status.credentialsPresent) {
    const err = new Error(
      status.errors.map((e) => e.message).join(' · ') || 'Credenziali Meta mancanti'
    );
    err.code = status.errors.length === 1
      ? status.errors[0].code
      : META_ERROR_CODES.META_CREDENTIALS_MISSING;
    err.status = 400;
    err.details = status.errors;
    throw err;
  }

  const uri = config.meta.redirectUri || '';
  const isLocal = uri.includes('localhost') || uri.includes('127.0.0.1');
  if ((config.isProduction || config.isVercel) && !config.isDesktop && (isLocal || !uri.startsWith('https://'))) {
    const err = new Error(
      `In produzione META_REDIRECT_URI deve essere HTTPS e non localhost. Usa: ${config.appUrl}/api/oauth/instagram/callback`
    );
    err.code = META_ERROR_CODES.META_REDIRECT_URI_MISSING;
    err.status = 400;
    throw err;
  }

  return status;
}

export function isAllowedInstagramAccountType(accountType) {
  return ALLOWED_IG_ACCOUNT_TYPES.has(accountType);
}

export function buildInstagramNotBusinessError(accountType) {
  const err = new Error(
    accountType
      ? `Account Instagram non Business/Creator (tipo: ${accountType}). Collega un profilo professionale a una Pagina Facebook.`
      : 'Account Instagram non Business/Creator. Collega un profilo professionale a una Pagina Facebook.'
  );
  err.code = META_ERROR_CODES.INSTAGRAM_NOT_BUSINESS_CREATOR;
  return err;
}
