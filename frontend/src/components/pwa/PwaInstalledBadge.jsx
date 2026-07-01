import { usePwaInstall } from '../../hooks/usePwaInstall.js';

export default function PwaInstalledBadge() {
  const { installed } = usePwaInstall();

  if (!installed) return null;

  return (
    <div className="pwa-installed-badge" role="status">
      <span className="pwa-installed-badge__dot" aria-hidden />
      App installata
    </div>
  );
}
