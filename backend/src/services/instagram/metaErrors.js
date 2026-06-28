import { config } from '../../config.js';
import { META_ERROR_CODES } from './metaConfig.js';

const FRIENDLY_BY_CODE = {
  [META_ERROR_CODES.META_APP_ID_MISSING]: 'Configurazione incompleta: manca META_APP_ID in .env.local.',
  [META_ERROR_CODES.META_APP_SECRET_MISSING]: 'Configurazione incompleta: manca META_APP_SECRET in .env.local.',
  [META_ERROR_CODES.META_REDIRECT_URI_MISSING]: 'Configurazione incompleta: manca META_REDIRECT_URI in .env.local.',
  [META_ERROR_CODES.NO_FACEBOOK_PAGES]:
    'Nessuna Pagina Facebook trovata. Crea una Pagina Facebook o concedi l’accesso alle Pagine durante il login Meta.',
  [META_ERROR_CODES.NO_INSTAGRAM_ON_PAGE]:
    'Nessun account Instagram collegato alla tua Pagina Facebook. Collegalo da Meta Business Suite e riprova.',
  [META_ERROR_CODES.INSTAGRAM_NOT_BUSINESS_CREATOR]:
    'L’account Instagram collegato non è Business o Creator. Convertilo in un profilo professionale e riprova.',
};

export function toUserFriendlyMetaError(error) {
  if (!error) return 'Collegamento Instagram non riuscito. Riprova.';

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
    return 'APP Secret non valido. Controlla META_APP_SECRET in .env.local e riavvia NovaPromo.';
  }
  if (lower.includes('invalid client') || lower.includes('client_id')) {
    return 'APP ID non valido. Controlla META_APP_ID in .env.local e riavvia NovaPromo.';
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
  if (lower.includes('permission') || lower.includes('permess')) {
    return 'Permessi Meta insufficienti. Assicurati di autorizzare Pagine Facebook e Instagram durante il login.';
  }
  if (lower.includes('unsupported get request') || lower.includes('graph')) {
    return 'Risposta non valida dalle API Meta. Verifica che l’app Nova_Promo abbia Instagram Platform attivo.';
  }

  if (message.length > 0 && message.length < 220 && !message.includes('Error:')) {
    return message;
  }

  return 'Collegamento Instagram non riuscito. Verifica credenziali Meta, Redirect URI e profilo Instagram Business collegato a una Pagina.';
}

export function mapOAuthDenial(error, errorDescription) {
  if (error === 'access_denied') {
    return 'Hai annullato l’autorizzazione Meta. Puoi riprovare quando vuoi.';
  }
  return toUserFriendlyMetaError({ message: errorDescription || error });
}
