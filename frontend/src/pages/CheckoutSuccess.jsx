import { Link, useSearchParams } from 'react-router-dom';
import { useBilling } from '../context/BillingContext.jsx';
import '../styles/premium.css';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { billing } = useBilling();
  const isMock = searchParams.get('mode') === 'mock' || billing?.testMode;

  return (
    <div className="checkout-page">
      <div className="checkout-card ndl-panel checkout-card--success">
        <p className="checkout-badge checkout-badge--ok">Attivazione riuscita</p>
        <h1>Benvenuto in NovaPromo PRO</h1>
        <p className="checkout-lead">
          Il tuo piano è attivo. Creative Studio PRO, immagini AI e tutte le funzioni PRO
          sono ora disponibili.
        </p>

        {isMock && (
          <p className="checkout-test-note">
            Attivazione in modalità test — nessun pagamento reale elaborato.
          </p>
        )}

        {billing?.premiumUntil && (
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
