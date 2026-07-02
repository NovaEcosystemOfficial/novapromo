import { isPwaSupportedPlatform } from '../../lib/pwa.js';
import PwaInstallBanner from './PwaInstallBanner.jsx';
import PwaUpdatePrompt from './PwaUpdatePrompt.jsx';

export default function PwaManager() {
  if (!isPwaSupportedPlatform()) {
    return null;
  }

  return (
    <>
      <PwaInstallBanner />
      <PwaUpdatePrompt />
    </>
  );
}
