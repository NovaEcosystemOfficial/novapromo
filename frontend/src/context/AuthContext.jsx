import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, hasClientConfig } from '../lib/firebase.js';
import { api } from '../api/client.js';
import { isTikTokEnabled, isDemoMode } from '../lib/features.js';
import { getDemoAuthPayload } from '../lib/demo.js';
import {
  LOCAL_USER,
  markLocalAuth,
  hasLocalAuthMarker,
  clearLocalAuthMarker,
} from '../lib/localAuth.js';

const AuthContext = createContext(null);

function applyLocalSession(data, setters) {
  setters.setUser(data.user || LOCAL_USER);
  setters.setTiktok(data.tiktok || null);
  setters.setInstagram(data.instagram || null);
  setters.setAppMode(data.mode || 'local');
  setters.setError(null);
}

function applyDemoSession(setters) {
  const data = getDemoAuthPayload();
  setters.setUser(data.user);
  setters.setTiktok(data.tiktok || null);
  setters.setInstagram(data.instagram || null);
  setters.setAppMode('demo');
  setters.setError(null);
  return data;
}

function restoreLocalSessionMarker(setters, localSessionRef) {
  if (!hasLocalAuthMarker()) return false;
  localSessionRef.current = true;
  setters.setUser(LOCAL_USER);
  setters.setAppMode('local');
  setters.setError(null);
  return true;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tiktok, setTiktok] = useState(null);
  const [instagram, setInstagram] = useState(null);
  const [appMode, setAppMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const localSessionRef = useRef(false);

  const setters = { setUser, setTiktok, setInstagram, setAppMode, setError };

  const refreshUser = useCallback(async () => {
    if (isDemoMode()) {
      applyDemoSession(setters);
      return;
    }

    try {
      const data = await api.getMe();
      if (data.authenticated) {
        setUser(data.user);
        setTiktok(data.tiktok || null);
        setInstagram(data.instagram || null);
        setAppMode(data.mode || 'local');
        setError(null);
        localSessionRef.current = data.mode === 'local' || localSessionRef.current;
        if (data.mode === 'local') markLocalAuth();
        return;
      }

      if (!localSessionRef.current && !hasLocalAuthMarker()) {
        setUser(null);
        setTiktok(null);
        setInstagram(null);
        setAppMode(null);
      }
      setError(null);
    } catch (err) {
      console.warn('[Auth] getMe failed:', err.message);
      if (!localSessionRef.current && !hasLocalAuthMarker()) {
        setUser(null);
        setTiktok(null);
        setInstagram(null);
        setAppMode(null);
      }
    }
  }, []);

  const enterLocalApp = useCallback(async () => {
    if (isDemoMode()) {
      return applyDemoSession(setters);
    }

    const data = await api.enterLocalApp();
    localSessionRef.current = true;
    markLocalAuth();
    applyLocalSession(data, setters);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (isDemoMode()) {
          if (!cancelled) applyDemoSession(setters);
          return;
        }

        if (!isTikTokEnabled()) {
          if (!cancelled) restoreLocalSessionMarker(setters, localSessionRef);

          try {
            const data = await api.enterLocalApp();
            if (!cancelled && data?.authenticated) {
              localSessionRef.current = true;
              markLocalAuth();
              applyLocalSession(data, setters);
            }
          } catch (err) {
            console.warn('[Auth] enterLocalApp failed:', err.message);
          }
        }

        if (!cancelled) {
          try {
            const data = await api.getMe();
            if (!cancelled && data.authenticated) {
              setUser(data.user);
              setTiktok(data.tiktok || null);
              setInstagram(data.instagram || null);
              setAppMode(data.mode || 'local');
              if (data.mode === 'local') {
                localSessionRef.current = true;
                markLocalAuth();
              }
            }
          } catch (err) {
            console.warn('[Auth] getMe refresh skipped:', err.message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();

    if (hasClientConfig && auth) {
      const unsub = onAuthStateChanged(auth, () => {});
      return () => {
        cancelled = true;
        unsub();
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithCustomToken = async (customToken) => {
    if (hasClientConfig && auth && customToken) {
      await signInWithCustomToken(auth, customToken);
    }
    await refreshUser();
  };

  const logout = async () => {
    localSessionRef.current = false;
    clearLocalAuthMarker();

    if (isDemoMode()) {
      setUser(null);
      setTiktok(null);
      setInstagram(null);
      setAppMode(null);
      return;
    }

    await api.logout();
    if (hasClientConfig && auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setTiktok(null);
    setInstagram(null);
    setAppMode(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tiktok,
        instagram,
        appMode,
        loading,
        error,
        setError,
        refreshUser,
        enterLocalApp,
        loginWithCustomToken,
        logout,
        isDemoMode: isDemoMode(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
