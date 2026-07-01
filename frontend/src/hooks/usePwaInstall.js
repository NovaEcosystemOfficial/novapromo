import { useCallback, useEffect, useState } from 'react';
import { isPwaInstalled, isPwaSupportedPlatform, markPwaInstalled } from '../lib/pwa.js';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isPwaInstalled());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('novapromo_pwa_install_dismissed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isPwaSupportedPlatform()) return undefined;

    const onInstalled = () => {
      markPwaInstalled();
      setInstalled(true);
      setDeferredPrompt(null);
    };

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onDisplayMode = () => {
      if (isPwaInstalled()) {
        setInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', onDisplayMode);

    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', onDisplayMode);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return { outcome: 'unavailable' };
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      markPwaInstalled();
      setInstalled(true);
    }
    setDeferredPrompt(null);
    return choice;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem('novapromo_pwa_install_dismissed', '1');
    } catch {
      // ignore
    }
  }, []);

  const canInstall = Boolean(deferredPrompt) && !installed && !dismissed;

  return {
    canInstall,
    installed,
    install,
    dismiss,
    isIosSafari:
      typeof navigator !== 'undefined'
      && /iphone|ipad|ipod/i.test(navigator.userAgent)
      && !deferredPrompt
      && !installed,
  };
}
