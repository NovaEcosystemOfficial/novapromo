import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, hasClientConfig } from '../lib/firebase.js';
import { api } from '../api/client.js';
import { isTikTokEnabled, isDemoMode } from '../lib/features.js';
import { getDemoAuthPayload } from '../lib/demo.js';

const AuthContext = createContext(null);

function applyLocalSession(data, setters) {
  setters.setUser(data.user);
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
        setAppMode(data.mode || 'tiktok');
      } else {
        setUser(null);
        setTiktok(null);
        setInstagram(null);
        setAppMode(null);
      }
      setError(null);
    } catch (err) {
      console.warn('[Auth] getMe failed:', err.message);
      setUser(null);
      setTiktok(null);
      setInstagram(null);
      setAppMode(null);
    }
  }, []);

  const enterLocalApp = useCallback(async () => {
    if (isDemoMode()) {
      return applyDemoSession(setters);
    }

    const data = await api.enterLocalApp();
    setUser(data.user);
    setTiktok(data.tiktok || null);
    setInstagram(data.instagram || null);
    setAppMode(data.mode || 'local');
    setError(null);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      let localReady = false;

      try {
        if (isDemoMode()) {
          if (!cancelled) applyDemoSession(setters);
          return;
        }

        if (!isTikTokEnabled()) {
          try {
            const data = await api.enterLocalApp();
            if (!cancelled && data?.authenticated) {
              applyLocalSession(data, setters);
              localReady = true;
            }
          } catch (err) {
            console.warn('[Auth] enterLocalApp failed:', err.message);
          }
        }

        if (!cancelled) {
          if (localReady) {
            try {
              const data = await api.getMe();
              if (data.authenticated) {
                setUser(data.user);
                setTiktok(data.tiktok || null);
                setInstagram(data.instagram || null);
                setAppMode(data.mode || 'local');
              }
            } catch (err) {
              console.warn('[Auth] getMe refresh skipped:', err.message);
            }
          } else {
            await refreshUser();
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
  }, [refreshUser]);

  const loginWithCustomToken = async (customToken) => {
    if (hasClientConfig && auth && customToken) {
      await signInWithCustomToken(auth, customToken);
    }
    await refreshUser();
  };

  const logout = async () => {
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
