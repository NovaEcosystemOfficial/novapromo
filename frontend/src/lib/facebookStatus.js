/** Facebook Page connection helpers — mirror backend evaluateFacebookConnection. */

export function isFacebookConnected(integration) {
  return integration?.connected === true;
}

export function getFacebookConnectionLabel(integration) {
  if (isFacebookConnected(integration)) return 'Collegato';
  if (integration?.credentialsPresent === false && integration?.credentialsError) {
    return 'Configurabile';
  }
  if (integration?.connectionStatus === 'token_expired') return 'Token scaduto';
  return integration?.credentialsPresent ? 'Non collegato' : 'Configurabile';
}
