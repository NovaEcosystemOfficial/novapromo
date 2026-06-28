export const LOCAL_USER = {
  uid: 'local:desktop',
  displayName: 'NovaPromo',
  username: 'novapromo',
  avatarUrl: null,
};

const LOCAL_AUTH_KEY = 'novapromo_local_auth';

export function markLocalAuth() {
  try {
    sessionStorage.setItem(LOCAL_AUTH_KEY, '1');
  } catch {
    // ignore
  }
}

export function hasLocalAuthMarker() {
  try {
    return sessionStorage.getItem(LOCAL_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearLocalAuthMarker() {
  try {
    sessionStorage.removeItem(LOCAL_AUTH_KEY);
  } catch {
    // ignore
  }
}
