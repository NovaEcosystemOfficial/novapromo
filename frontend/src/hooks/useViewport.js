import { useEffect, useState } from 'react';
import { isStandaloneDisplayMode } from '../lib/pwa.js';

const QUERIES = {
  mobile: '(max-width: 768px)',
  tablet: '(max-width: 1024px)',
  desktop: '(min-width: 1025px)',
};

function readViewport() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isDesktop: true, isStandalone: false };
  }

  const isMobile = window.matchMedia(QUERIES.mobile).matches;
  const isTablet = window.matchMedia(QUERIES.tablet).matches && !isMobile;
  const isDesktop = window.matchMedia(QUERIES.desktop).matches;
  const isStandalone = isStandaloneDisplayMode();

  return { isMobile, isTablet, isDesktop, isStandalone };
}

export function useViewport() {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    const media = [
      window.matchMedia(QUERIES.mobile),
      window.matchMedia(QUERIES.tablet),
      window.matchMedia(QUERIES.desktop),
      window.matchMedia('(display-mode: standalone)'),
    ];

    const update = () => setViewport(readViewport());

    media.forEach((mq) => mq.addEventListener('change', update));
    window.addEventListener('orientationchange', update);

    return () => {
      media.forEach((mq) => mq.removeEventListener('change', update));
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return viewport;
}
