/** Facebook Page connection helpers — mirror backend evaluateFacebookConnection. */

export function isFacebookConnected(integration) {
  return integration?.connected === true;
}

export function isFacebookPublishReady(integration) {
  return integration?.canPublish === true || integration?.publishingStatus === 'ready';
}

export function isFacebookPublishPending(integration) {
  return isFacebookConnected(integration) && !isFacebookPublishReady(integration);
}

export function getFacebookConnectionLabel(integration) {
  if (isFacebookConnected(integration)) return 'Collegato';
  if (integration?.credentialsPresent === false && integration?.credentialsError) {
    return 'Configurabile';
  }
  if (integration?.connectionStatus === 'token_expired') return 'Token scaduto';
  return integration?.credentialsPresent ? 'Non collegato' : 'Configurabile';
}

export function getFacebookPublishingLabel(integration) {
  if (!isFacebookConnected(integration)) return null;
  if (isFacebookPublishReady(integration)) return 'Pubblicazione attiva';
  return integration?.publishingStatusLabel || 'In attesa permesso Meta';
}

export const FACEBOOK_PUBLISH_PENDING_UI_MESSAGE =
  'La Pagina Facebook è collegata, ma Meta non ha ancora concesso pages_manage_posts. Per pubblicare serve Advanced Access tramite App Review in Meta Developers. Instagram resta attivo.';
