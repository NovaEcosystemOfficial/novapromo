import { Link } from 'react-router-dom';
import { useBilling } from '../../context/BillingContext.jsx';

export default function PremiumLock({
  reason,
  code,
  compact = false,
  feature = 'ai',
}) {
  const { billing } = useBilling();
  const isCreative = feature === 'creative' || code === 'CREATIVE_STUDIO_PREMIUM_ONLY';
  const message = reason
    || (isCreative ? billing?.creativeStudioLockReason : billing?.aiLockReason)
    || 'Funzione disponibile con NovaPromo PRO';

  const welcomeRemaining = billing?.creativeStudioWelcomeRemaining
    ?? billing?.welcomeProCredits
    ?? 0;

  const title = code === 'AI_CREDITS_EXHAUSTED'
    ? 'Limite AI raggiunto'
    : isCreative
      ? 'Creative Studio PRO'
      : 'AI Studio Premium';

  return (
    <div className={`premium-lock${compact ? ' premium-lock--compact' : ''}`}>
      <div className="premium-lock__icon" aria-hidden>✦</div>
      <div className="premium-lock__body">
        <p className="premium-lock__title">{title}</p>
        <p className="premium-lock__text">{message}</p>
        {!compact && (
          <p className="premium-lock__meta">
            Piano attuale: <strong>{billing?.planLabel || 'Free'}</strong>
            {billing?.plan === 'free' && welcomeRemaining > 0 && (
              <>
                {' · '}
                <strong>{welcomeRemaining}</strong> crediti benvenuto PRO rimanenti
              </>
            )}
            {!billing?.creditsUnlimited && (
              <>
                {' · '}
                {billing?.aiCreditsUsed ?? 0}/{billing?.aiCreditsLimit ?? 30} crediti AI usati
              </>
            )}
          </p>
        )}
        <Link to="/premium" className="premium-lock__cta">
          Attiva NovaPromo PRO
        </Link>
      </div>
    </div>
  );
}
