import { Link } from 'react-router-dom';
import { useBilling } from '../../context/BillingContext.jsx';

export default function PremiumLock({ reason, code, compact = false }) {
  const { billing } = useBilling();
  const message = reason || billing?.aiLockReason || 'Funzione disponibile con Premium';

  return (
    <div className={`premium-lock${compact ? ' premium-lock--compact' : ''}`}>
      <div className="premium-lock__icon" aria-hidden>✦</div>
      <div className="premium-lock__body">
        <p className="premium-lock__title">
          {code === 'AI_CREDITS_EXHAUSTED' ? 'Limite AI raggiunto' : 'AI Studio Premium'}
        </p>
        <p className="premium-lock__text">{message}</p>
        {!compact && (
          <p className="premium-lock__meta">
            Piano attuale: <strong>{billing?.planLabel || 'Free'}</strong>
            {' · '}
            {billing?.aiCreditsUsed ?? 0}/{billing?.aiCreditsLimit ?? 3} crediti usati
          </p>
        )}
        <Link to="/premium" className="premium-lock__cta">
          Vedi piani Premium
        </Link>
      </div>
    </div>
  );
}
