import { useEffect } from 'react';
import { useContentModal } from '../context/ContentModalContext.jsx';
import { useCreativeStudio } from '../context/CreativeStudioContext.jsx';
import { useBilling } from '../context/BillingContext.jsx';
import PremiumLock from '../components/ai/PremiumLock.jsx';

export default function Generator() {
  const { openModal } = useContentModal();
  const { openCreativeStudio } = useCreativeStudio();
  const { billing } = useBilling();

  useEffect(() => {
    openModal();
  }, [openModal]);

  return (
    <div className="empty-state generator-launch">
      <p>Il generatore si apre nella modale.</p>
      <div className="generator-launch__actions">
        <button type="button" className="btn btn-primary" onClick={() => openModal()}>
          + Nuovo contenuto
        </button>
        <button
          type="button"
          className="btn btn-ai"
          onClick={() => openCreativeStudio()}
          disabled={!billing?.creativeStudioAvailable}
          title={billing?.creativeStudioLockReason || 'Creative Studio PRO'}
        >
          ✦ Creative Studio PRO
        </button>
      </div>
      {!billing?.creativeStudioAvailable && billing && (
        <div style={{ marginTop: '1rem', maxWidth: 420 }}>
          <PremiumLock
            reason={billing.creativeStudioLockReason || 'Disponibile nel piano Premium'}
            code={billing.creativeStudioLockCode || 'CREATIVE_STUDIO_PREMIUM_ONLY'}
            compact
          />
        </div>
      )}
    </div>
  );
}
