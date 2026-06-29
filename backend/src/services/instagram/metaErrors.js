import { config } from '../../config.js';
import { META_ERROR_CODES } from './metaConfig.js';
import { PUBLIC_MEDIA_ERROR } from '../media/publicMediaService.js';

const FRIENDLY_BY_CODE = {
  [META_ERROR_CODES.INSTAGRAM_APP_ID_MISSING]:
    'Configurazione incompleta: manca INSTAGRAM_APP_ID (Instagram App ID, non il Facebook App ID).',
  [META_ERROR_CODES.INSTAGRAM_APP_SECRET_MISSING]:
    'Configurazione incompleta: manca INSTAGRAM_APP_SECRET dalla sezione Instagram Login.',
  [META_ERROR_CODES.INSTAGRAM_APP_ID_INVALID]:
    'INSTAGRAM_APP_ID errato: non usare il Facebook App ID. Copia l’Instagram App ID da Meta Dashboard > Instagram > API setup with Instagram login.',
  [META_ERROR_CODES.NO_FACEBOOK_PAGES]:
    'Nessuna Pagina Facebook trovata. Crea una Pagina Facebook o concedi l’accesso alle Pagine durante il login Meta.',
  [META_ERROR_CODES.NO_INSTAGRAM_ON_PAGE]:
    'Nessun account Instagram collegato alla tua Pagina Facebook. Collegalo da Meta Business Suite e riprova.',
  [META_ERROR_CODES.INSTAGRAM_NOT_BUSINESS_CREATOR]:
    'L’account Instagram collegato non è Business o Creator. Convertilo in un profilo professionale e riprova.',
  [META_ERROR_CODES.INSTAGRAM_SCOPES_MISSING]:
    null,
};

export { INSTAGRAM_TOKEN_MISSING_MESSAGE } from './instagramToken.js';

export function toUserFriendlyMetaError(error) {
  if (!error) return 'Collegamento Instagram non riuscito. Riprova.';

  if (error.code === 'INSTAGRAM_TOKEN_MISSING') {
    return 'Instagram collegato ma token non disponibile: ricollega l\'account.';
  }

  if (error.code === 'INSTAGRAM_MEDIA_TYPE') {
    return error.message;
  }

  if (error.message === PUBLIC_MEDIA_ERROR) {
    return PUBLIC_MEDIA_ERROR;
  }

  if (error.code === META_ERROR_CODES.INSTAGRAM_SCOPES_MISSING) {
    const missing = error.missingScopes?.length
      ? error.missingScopes.join(', ')
      : 'instagram_business_basic, instagram_business_content_publish';
    return `Permessi Instagram mancanti: ${missing}. In Meta Developers → Instagram → API setup with Instagram login abilita questi permessi, poi riautorizza da Account.`;
  }

  if (error.code && FRIENDLY_BY_CODE[error.code]) {
    return FRIENDLY_BY_CODE[error.code];
  }

  const message = String(error.message || error).trim();
  const lower = message.toLowerCase();

  if (lower.includes('redirect_uri') || lower.includes('redirect uri')) {
    return `Il Redirect URI non corrisponde a Meta Developers. Deve essere esattamente: ${config.meta.redirectUri}`;
  }
  if (lower.includes('code has expired') || lower.includes('codice') && lower.includes('scadut')) {
    return 'Il codice di autorizzazione è scaduto. Torna su Account e avvia di nuovo il collegamento.';
  }
  if (lower.includes('invalid client secret') || lower.includes('client secret')) {
    return 'APP Secret non valido. Controlla INSTAGRAM_APP_SECRET in Vercel e riavvia il backend.';
  }
  if (lower.includes('invalid client') || lower.includes('client_id')) {
    return 'APP ID non valido. Controlla INSTAGRAM_APP_ID e riavvia il backend.';
  }
  if (lower.includes('invalid platform app')) {
    return 'Instagram App ID errato. Su Vercel imposta INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET dalla sezione Instagram > API setup with Instagram login (non il Facebook App ID in cima alla dashboard Meta).';
  }
  if (lower.includes('state oauth') || lower.includes('csrf')) {
    return 'Sessione OAuth scaduta o non valida. Chiudi il browser e riprova il collegamento da Account.';
  }
  if (lower.includes('authorization code') && lower.includes('missing')) {
    return 'Autorizzazione Meta incompleta. Riprova il login da Account.';
  }
  if (lower.includes('access denied') || lower.includes('annull')) {
    return 'Autorizzazione annullata su Meta. Puoi riprovare quando vuoi.';
  }
  if (lower.includes('only photo or video can be accepted as media type')) {
    return PUBLIC_MEDIA_ERROR;
  }
  if (lower.includes('cannot parse access token') || lower.includes('invalid graph access token')) {
    return 'Token Instagram non valido per la pubblicazione. Vai su Account e ricollega Instagram.';
  }
  if (lower.includes('permission') || lower.includes('permess')) {
    return 'Permessi Instagram insufficienti. Riautorizza e concedi instagram_business_basic e instagram_business_content_publish. Una Pagina Facebook non è richiesta con Instagram Business Login.';
  }
  if (lower.includes('unsupported get request') || lower.includes('graph')) {
    return 'Risposta non valida dalle API Meta. Verifica che l’app abbia Instagram Business Login attivo e che @novaecosystem sia Instagram Tester.';
  }

  if (message.length > 0 && message.length < 220 && !message.includes('Error:')) {
    return message;
  }

  return 'Collegamento Instagram non riuscito. Verifica credenziali Meta, Redirect URI e profilo Instagram Business/Creator.';
}

export function mapOAuthDenial(error, errorDescription) {
  if (error === 'access_denied') {
    return 'Hai annullato l’autorizzazione Meta. Puoi riprovare quando vuoi.';
  }
  return toUserFriendlyMetaError({ message: errorDescription || error });
}
