import { useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { isDemoMode } from '../lib/features.js';

/** How often the open app asks the backend to publish due scheduled posts */
const TICK_MS = 30_000;

/**
 * While the user keeps NovaPromo open, poll the backend to publish due jobs.
 * Complements Vercel Cron (which does not keep node-cron alive on serverless).
 */
export default function SchedulePublisherTick() {
  const inFlight = useRef(false);

  useEffect(() => {
    if (isDemoMode()) return undefined;

    const tick = async () => {
      if (inFlight.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      inFlight.current = true;
      try {
        const result = await api.publishDuePosts();
        if (result?.published > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('novapromo:posts-published', { detail: result }));
        }
      } catch {
        // Silent — offline / unauthenticated ticks are expected
      } finally {
        inFlight.current = false;
      }
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return null;
}
