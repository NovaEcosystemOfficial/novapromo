import { useCallback, useEffect, useState } from 'react';
import { isPwaSupportedPlatform } from '../lib/pwa.js';

export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    if (!isPwaSupportedPlatform()) return undefined;
    if (import.meta.env.DEV) return undefined;

    let cancelled = false;

    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return;

        const applyUpdate = registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            setOfflineReady(true);
          },
        });

        setUpdateSW(() => applyUpdate);
      })
      .catch(() => {
        // PWA disabled (es. build Electron)
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshApp = useCallback(() => {
    if (typeof updateSW === 'function') {
      updateSW(true);
    } else {
      window.location.reload();
    }
  }, [updateSW]);

  const dismissOfflineNotice = useCallback(() => {
    setOfflineReady(false);
  }, []);

  return {
    needRefresh,
    offlineReady,
    refreshApp,
    dismissOfflineNotice,
  };
}
