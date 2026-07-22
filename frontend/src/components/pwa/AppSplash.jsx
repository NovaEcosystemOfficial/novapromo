import { useEffect, useState } from 'react';
import { isIosDevice, isStandaloneDisplayMode } from '../../lib/pwa.js';
import { useViewport } from '../../hooks/useViewport.js';
import '../../styles/splash.css';

const MIN_VISIBLE_MS = 1100;
const FADE_MS = 450;

function dismissHtmlBoot() {
  document.getElementById('novapromo-boot')?.classList.add('is-done');
}

/**
 * Splash stile app iOS — si vede su mobile / PWA / iPhone.
 * Prende il posto dello splash HTML appena React è pronto.
 */
export default function AppSplash() {
  const { isMobile } = useViewport();
  const preferSplash = isMobile || isStandaloneDisplayMode() || isIosDevice();
  const [phase, setPhase] = useState(preferSplash ? 'show' : 'gone');

  useEffect(() => {
    // Desktop browser largo: niente splash, solo chiudi il boot HTML
    if (!preferSplash) {
      dismissHtmlBoot();
      setPhase('gone');
      return undefined;
    }

    dismissHtmlBoot();
    setPhase('show');

    const hideTimer = window.setTimeout(() => {
      setPhase('hide');
    }, MIN_VISIBLE_MS);

    const goneTimer = window.setTimeout(() => {
      setPhase('gone');
    }, MIN_VISIBLE_MS + FADE_MS);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(goneTimer);
    };
  }, [preferSplash]);

  if (phase === 'gone') return null;

  return (
    <div
      className={`app-splash${phase === 'hide' ? ' app-splash--hide' : ''}`}
      role="presentation"
      aria-hidden="true"
    >
      <div className="app-splash__glow" />
      <img className="app-splash__mark" src="/icons/icon-192.png" width="96" height="96" alt="" />
      <p className="app-splash__title">NovaPromo</p>
      <p className="app-splash__sub">AutoPublisher</p>
    </div>
  );
}
