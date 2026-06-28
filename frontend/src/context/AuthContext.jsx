import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, hasClientConfig } from '../lib/firebase.js';
import { api } from '../api/client.js';
import { isTikTokEnabled } from '../lib/features.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tiktok, setTiktok] = useState(null);
  const [instagram, setInstagram] = useState(null);
  const [appMode, setAppMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
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
    const data = await api.enterLocalApp();
    setUser(data.user);
    setTiktok(data.tiktok || null);
    setInstagram(data.instagram || null);
    setAppMode('local');
    setError(null);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (!isTikTokEnabled()) {
          try {
            await api.enterLocalApp();
          } catch (err) {
            console.warn('[Auth] enterLocalApp failed:', err.message);
          }
        }
        if (!cancelled) await refreshUser();
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
