import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBilling } from '../context/BillingContext.jsx';
import '../styles/premium.css';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { billing, refreshBilling } = useBilling();
  const isMock = searchParams.get('mode') === 'mock';
  const sessionId = searchParams.get('session_id');
  const [phase, setPhase] = useState(isMock ? 'ready' : 'pending');

  useEffect(() => {
    if (isMock) {
      refreshBilling();
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const tick = async () => {
      attempts += 1;
      await refreshBilling();
      if (cancelled) return;
      // billing state updates async — next effect pass will re-check
    };

    tick();
    const id = setInterval(() => {
      if (attempts >= maxAttempts) {
        clearInterval(id);
        setPhase((p) => (p === 'ready' ? p : 'timeout'));
        return;
      }
      tick();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isMock, refreshBilling, sessionId]);

  useEffect(() => {
    if (isMock) {
      setPhase('ready');
      return;
    }
    if (billing?.isPremium && billing?.plan === 'premium') {
      setPhase('ready');
    }
  }, [billing, isMock]);

  const showPending = phase === 'pending';
  const showTimeout = phase === 'timeout' && !billing?.isPremium;

  return (
    <div className="checkout-page">
      <div className="checkout-card ndl-panel checkout-card--success">
        {showPending && (
          <>
            <p className="checkout-badge checkout-badge--test">Conferma in corso</p>
            <h1>Stiamo attivando NovaPromo PRO</h1>
            <p className="checkout-lead">
              Il pagamento è stato ricevuto. Attendiamo la conferma webhook di Stripe
              prima di sbloccare le funzioni PRO.
            </p>
          </>
        )}

        {showTimeout && (
          <>
            <p className="checkout-badge checkout-badge--test">In elaborazione</p>
            <h1>Attivazione quasi completa</h1>
            <p className="checkout-lead">
              Il webhook potrebbe richiedere qualche secondo in più. Controlla Account
              tra poco — non serve ripetere il pagamento.
            </p>
          </>
        )}

        {phase === 'ready' && (
          <>
            <p className="checkout-badge checkout-badge--ok">Attivazione riuscita</p>
            <h1>Benvenuto in NovaPromo PRO</h1>
            <p className="checkout-lead">
              Il tuo piano è attivo. Creative Studio PRO, immagini AI e tutte le funzioni PRO
              sono ora disponibili.
            </p>
          </>
        )}

        {(isMock || billing?.stripeTestMode || billing?.testMode) && (
          <p className="checkout-test-note">
            {isMock
              ? 'Attivazione mock — nessun pagamento Stripe elaborato.'
              : 'Stripe Test Mode — nessun addebito reale.'}
          </p>
        )}

        {billing?.premiumUntil && billing?.isPremium && (
          <p className="checkout-meta">
            PRO attivo fino al{' '}
            {new Date(billing.premiumUntil).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}

        <div className="checkout-actions">
          <Link to="/generator" className="ndl-btn ndl-btn--primary">
            Apri Creative Studio PRO
          </Link>
          <Link to="/accounts" className="ndl-btn ndl-btn--ghost">
            Vedi il tuo account
          </Link>
        </div>
      </div>
    </div>
  );
}
