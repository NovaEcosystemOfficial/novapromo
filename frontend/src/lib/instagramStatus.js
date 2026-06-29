/** Instagram connection helpers — mirror backend evaluateInstagramConnection. */

export function isInstagramConnected(integration) {
  return integration?.connected === true;
}

export function getInstagramConnectionLabel(integration) {
  if (isInstagramConnected(integration)) return 'Collegato';
  if (integration?.connectionStatus === 'token_expired') return 'Token scaduto';
  return 'Non collegato';
}
