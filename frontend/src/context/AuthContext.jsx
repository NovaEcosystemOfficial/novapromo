import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, hasClientConfig } from '../lib/firebase.js';
import { api } from '../api/client.js';
import { isTikTokEnabled, isDemoMode } from '../lib/features.js';
import { getDemoAuthPayload } from '../lib/demo.js';
import { isCloudDesktopShell } from '../lib/runtime.js';
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tiktok, setTiktok] = useState(null);
  const [instagram, setInstagram] = useState(null);
  const [appMode, setAppMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const localSessionRef = useRef(false);

  const setters = { setUser, setTiktok, setInstagram, setAppMode, setError };

  const syncFirebaseSession = useCallback(async (idToken) => {
    const data = await api.syncFirebaseSession(idToken);
    setUser(data.user);
    setTiktok(data.tiktok || null);
    setInstagram(data.instagram || null);
    setAppMode('firebase');
    setError(null);
    return data;
  }, []);

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
        if (data.mode === 'local') {
          localSessionRef.current = true;
          markLocalAuth();
        }
        return;
      }

      if (!localSessionRef.current && !hasLocalAuthMarker()) {
        setUser(null);
        setTiktok(null);
        setInstagram(null);
        setAppMode(null);
      }
    } catch (err) {
      console.warn('[Auth] getMe failed:', err.message);
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

    if (isDemoMode()) {
      applyDemoSession(setters);
      setLoading(false);
      return undefined;
    }

    if (hasClientConfig && auth) {
      const unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (cancelled) return;
        try {
          if (fbUser) {
            const token = await fbUser.getIdToken();
            const data = await api.syncFirebaseSession(token);
            if (!cancelled) {
              setUser(data.user);
              setInstagram(data.instagram || null);
              setTiktok(null);
              setAppMode('firebase');
            }
          } else if (!localSessionRef.current && !hasLocalAuthMarker()) {
            setUser(null);
            setInstagram(null);
            setTiktok(null);
            setAppMode(null);
          }
        } catch (err) {
          console.warn('[Auth] Firebase sync failed:', err.message);
        } finally {
          if (!cancelled) setLoading(false);
        }
      });
      return () => {
        cancelled = true;
        unsub();
      };
    }

    (async () => {
      try {
        // Thin client cloud: niente sessione locale — login Firebase come sul web
        if (isCloudDesktopShell()) {
          return; // finally → setLoading(false)
        }
        if (!isTikTokEnabled()) {
          if (hasLocalAuthMarker()) {
            localSessionRef.current = true;
            setUser(LOCAL_USER);
            setAppMode('local');
          } else {
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
        } else {
          try {
            const data = await api.getMe();
            if (!cancelled && data.authenticated) {
              setUser(data.user);
              setTiktok(data.tiktok || null);
              setInstagram(data.instagram || null);
              setAppMode(data.mode || 'tiktok');
            }
          } catch (err) {
            console.warn('[Auth] getMe skipped:', err.message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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
        syncFirebaseSession,
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
