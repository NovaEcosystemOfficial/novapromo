import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDesktopApp } from '../lib/runtime.js';
import { showDesktopNotification } from '../lib/electron.js';
import { api } from '../api/client.js';

/**
 * Desktop-only: handle novapromo:// OAuth callbacks + scheduler publish notifications.
 */
export default function DesktopBridge() {
  const navigate = useNavigate();
  const lastEventId = useRef(null);

  useEffect(() => {
    if (!isDesktopApp()) return undefined;

    const { onOAuthCallback } = window.electronAPI;
    const unsubscribe = onOAuthCallback((payload) => {
      const { type, ...params } = payload;
      if (type === 'login') {
        const qs = new URLSearchParams(params).toString();
        navigate(`/auth/callback?${qs}`);
        return;
      }
      if (type === 'accounts') {
        const qs = new URLSearchParams(params).toString();
        navigate(`/accounts?${qs}`);
      }
    });

    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (!isDesktopApp()) return undefined;

    const interval = setInterval(async () => {
      try {
        const { event } = await api.getDesktopEvents();
        if (!event || event.id === lastEventId.current) return;
        lastEventId.current = event.id;

        if (event.status === 'success') {
          showDesktopNotification('NovaPromo — Pubblicato', event.message);
        } else if (event.status === 'error') {
          showDesktopNotification('NovaPromo — Errore', event.message);
        }
      } catch {
        /* backend not ready */
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
