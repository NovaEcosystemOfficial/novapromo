import { getCookieOptions } from '../utils/cookieOptions.js';

export const LOCAL_SESSION_COOKIE = 'novapromo_local';
const LOCAL_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const LOCAL_USER = {
  uid: 'local:desktop',
  displayName: 'NovaPromo',
  username: 'novapromo',
  avatarUrl: null,
};

export function setLocalSession(res) {
  res.cookie(LOCAL_SESSION_COOKIE, '1', getCookieOptions(LOCAL_MAX_AGE_MS));
}

export function clearLocalSession(res) {
  res.clearCookie(LOCAL_SESSION_COOKIE, { path: '/' });
}

export function hasLocalSession(req) {
  return req.cookies?.[LOCAL_SESSION_COOKIE] === '1';
}
