import { getMissingFacebookPublishScopes } from '../instagram/metaScopes.js';

export const FACEBOOK_PUBLISH_PENDING_MESSAGE =
  'Pubblicazione Facebook in attesa permesso Meta (pages_manage_posts). Richiedi Advanced Access tramite App Review su Meta Developers.';

export function evaluateFacebookPublishReadiness(grantedScopes = []) {
  const scopes = Array.isArray(grantedScopes) ? grantedScopes : [];
  const missingPublishScopes = getMissingFacebookPublishScopes(scopes);
  const canPublish = missingPublishScopes.length === 0;

  return {
    grantedScopes: scopes,
    missingPublishScopes,
    canPublish,
    publishingStatus: canPublish ? 'ready' : 'pending_meta_permission',
    publishingStatusLabel: canPublish ? 'Pubblicazione attiva' : 'In attesa permesso Meta',
  };
}
