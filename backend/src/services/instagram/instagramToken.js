import { logger } from '../../utils/logger.js';

export const INSTAGRAM_TOKEN_MISSING_MESSAGE =
  'Instagram collegato ma token non disponibile: ricollega l\'account.';

export function inspectInstagramAccessToken(accessToken) {
  const raw = accessToken == null ? '' : String(accessToken).trim();
  return {
    tokenPresent: raw.length > 0,
    tokenLength: raw.length,
    tokenPrefix: raw.length > 0 ? raw.slice(0, 6) : null,
    looksLikeJson: raw.startsWith('{') || raw.startsWith('['),
    looksLikeAppSecret: raw.length > 0 && raw.length < 20 && !raw.includes('.'),
  };
}

export function logInstagramGraphRequest({ action, endpoint, instagramAccountId, accessToken }) {
  const inspection = inspectInstagramAccessToken(accessToken);
  logger.info(`Instagram Graph: ${action}`, {
    endpoint,
    instagramAccountId: instagramAccountId || null,
    tokenPresent: inspection.tokenPresent,
    tokenLength: inspection.tokenLength,
    tokenPrefix: inspection.tokenPrefix,
  });
}

/**
 * Resolve the user access token for Instagram Business Login publishing.
 * Never use app secret or Facebook Page tokens for INSTAGRAM_LOGIN mode.
 */
export function resolveInstagramPublishToken(account) {
  const metadata = account?.metadata || {};
  const connectionMode = metadata.connectionMode || 'INSTAGRAM_LOGIN';
  const instagramAccountId = metadata.instagramAccountId || account?.externalUserId || null;

  let accessToken = null;
  if (connectionMode === 'INSTAGRAM_LOGIN') {
    accessToken = account?.accessToken;
  } else {
    accessToken = metadata.pageAccessToken || account?.accessToken;
  }

  const inspection = inspectInstagramAccessToken(accessToken);
  if (!inspection.tokenPresent || inspection.looksLikeJson) {
    const err = new Error(INSTAGRAM_TOKEN_MISSING_MESSAGE);
    err.code = 'INSTAGRAM_TOKEN_MISSING';
    throw err;
  }

  return {
    accessToken: String(accessToken).trim(),
    instagramAccountId,
    connectionMode,
    inspection,
  };
}

export function assertInstagramPublishToken(account) {
  return resolveInstagramPublishToken(account);
}
