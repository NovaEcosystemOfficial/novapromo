import { config } from '../../config.js';

export const META_ERROR_CODES = {
  META_APP_ID_MISSING: 'META_APP_ID_MISSING',
  META_APP_SECRET_MISSING: 'META_APP_SECRET_MISSING',
  META_REDIRECT_URI_MISSING: 'META_REDIRECT_URI_MISSING',
  META_CREDENTIALS_MISSING: 'META_CREDENTIALS_MISSING',
  INSTAGRAM_APP_ID_MISSING: 'INSTAGRAM_APP_ID_MISSING',
  INSTAGRAM_APP_SECRET_MISSING: 'INSTAGRAM_APP_SECRET_MISSING',
  INSTAGRAM_APP_ID_INVALID: 'INSTAGRAM_APP_ID_INVALID',
  NO_FACEBOOK_PAGES: 'NO_FACEBOOK_PAGES',
  NO_INSTAGRAM_ON_PAGE: 'NO_INSTAGRAM_ON_PAGE',
  INSTAGRAM_NOT_BUSINESS_CREATOR: 'INSTAGRAM_NOT_BUSINESS_CREATOR',
  INSTAGRAM_SCOPES_MISSING: 'INSTAGRAM_SCOPES_MISSING',
};
const ALLOWED_IG_ACCOUNT_TYPES = new Set(['BUSINESS', 'MEDIA_CREATOR']);

export function isMetaRedirectUriConfigured() {
  return Boolean(config.meta.redirectUri?.trim());
}

export function getMetaCredentialsStatus() {
  const appIdPresent = Boolean(config.meta.appId?.trim());
  const appSecretPresent = Boolean(config.meta.appSecret?.trim());
  const instagramAppIdPresent = Boolean(config.meta.instagramAppId?.trim());
  const instagramAppSecretPresent = Boolean(config.meta.instagramAppSecret?.trim());
  const redirectUriConfigured = isMetaRedirectUriConfigured();
  const usingFacebookAppIdAsInstagram =
    instagramAppIdPresent &&
    appIdPresent &&
    config.meta.instagramAppId.trim() === config.meta.appId.trim();

  const credentialsPresent =
    instagramAppIdPresent &&
    instagramAppSecretPresent &&
    redirectUriConfigured &&
    !usingFacebookAppIdAsInstagram;

  const errors = [];
  if (!instagramAppIdPresent) {
    errors.push({
      code: META_ERROR_CODES.INSTAGRAM_APP_ID_MISSING,
      message:
        'INSTAGRAM_APP_ID mancante — copialo da Meta Dashboard > Instagram > API setup with Instagram login > Business login settings (non usare il Facebook App ID in cima alla dashboard).',
    });
  } else if (usingFacebookAppIdAsInstagram) {
    errors.push({
      code: META_ERROR_CODES.INSTAGRAM_APP_ID_INVALID,
      message:
        'INSTAGRAM_APP_ID non valido: stai usando il Facebook App ID. Usa l’Instagram App ID dalla sezione Instagram > API setup with Instagram login.',
    });
  }
  if (!instagramAppSecretPresent) {
    errors.push({
      code: META_ERROR_CODES.INSTAGRAM_APP_SECRET_MISSING,
      message:
        'INSTAGRAM_APP_SECRET mancante — copialo da Meta Dashboard > Instagram > API setup with Instagram login > Business login settings.',
    });
  }
  if (!redirectUriConfigured) {
    errors.push({
      code: META_ERROR_CODES.META_REDIRECT_URI_MISSING,
      message: 'META_REDIRECT_URI non configurato — es. https://novapromo-backend.vercel.app/api/oauth/instagram/callback',
    });
  }

  return {
    appIdPresent,
    appSecretPresent,
    instagramAppIdPresent,
    instagramAppSecretPresent,
    redirectUriConfigured,
    usingFacebookAppIdAsInstagram,
    credentialsPresent,
    errors,
    credentialsError: errors[0]?.message || null,
    redirectUri: config.meta.redirectUri,
    instagramAppIdPreview: instagramAppIdPresent
      ? `${config.meta.instagramAppId.slice(0, 4)}…${config.meta.instagramAppId.slice(-4)}`
      : null,
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
  if (!accountType) {
    // Instagram Business Login only allows professional accounts; field may be omitted.
    return true;
  }
  return ALLOWED_IG_ACCOUNT_TYPES.has(accountType);
}

export function buildInstagramScopesMissingError(missingScopes) {
  const list = missingScopes.join(', ');
  const err = new Error(
    `Permessi Instagram mancanti: ${list}. In Meta Developers abilita questi permessi per l’app e riautorizza da Account.`
  );
  err.code = META_ERROR_CODES.INSTAGRAM_SCOPES_MISSING;
  err.missingScopes = missingScopes;
  return err;
}

export function buildInstagramNotBusinessError(accountType) {
  const err = new Error(
    accountType
      ? `Account Instagram non Business/Creator (tipo: ${accountType}). Usa un profilo professionale (Business o Creator).`
      : 'Account Instagram non Business/Creator. Usa un profilo professionale (Business o Creator).'
  );
  err.code = META_ERROR_CODES.INSTAGRAM_NOT_BUSINESS_CREATOR;
  return err;
}
