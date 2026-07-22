import { isPwaSupportedPlatform } from '../../lib/pwa.js';
import AppSplash from './AppSplash.jsx';
import PwaInstallBanner from './PwaInstallBanner.jsx';
import PwaUpdatePrompt from './PwaUpdatePrompt.jsx';

export default function PwaManager() {
  return (
    <>
      <AppSplash />
      {isPwaSupportedPlatform() && (
        <>
          <PwaInstallBanner />
          <PwaUpdatePrompt />
        </>
      )}
    </>
  );
}
