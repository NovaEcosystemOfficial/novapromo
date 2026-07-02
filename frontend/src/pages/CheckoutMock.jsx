import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useBilling } from '../context/BillingContext.jsx';
import '../styles/premium.css';

export default function CheckoutMock() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') === 'yearly' ? 'yearly' : 'monthly';
  const navigate = useNavigate();
  const { refreshBilling } = useBilling();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    setError('');
    setLoading(true);
    try {
      await api.mockActivatePremium(plan);
      await refreshBilling();
      navigate('/checkout/success?mode=mock');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-card ndl-panel">
        <p className="checkout-badge checkout-badge--test">Pagamento simulato</p>
        <h1>Checkout test / dev</h1>
        <p className="checkout-lead">
          Nessun addebito reale. Questa schermata attiva NovaPromo PRO in modalità test
          per verificare il flusso completo prima di collegare Stripe.
        </p>

        <dl className="checkout-summary">
          <div>
            <dt>Piano</dt>
            <dd>{plan === 'yearly' ? 'Annuale — 99 €/anno' : 'Mensile — 9,99 €/mese'}</dd>
          </div>
          <div>
            <dt>Durata test</dt>
            <dd>{plan === 'yearly' ? '365 giorni' : '30 giorni'}</dd>
          </div>
          <div>
            <dt>Crediti AI</dt>
            <dd>300 inclusi</dd>
          </div>
        </dl>

        <button
          type="button"
          className="ndl-btn ndl-btn--primary checkout-cta"
          onClick={handleActivate}
          disabled={loading}
        >
          {loading ? 'Attivazione…' : 'Attiva PRO in modalità test'}
        </button>

        {error && <p className="checkout-error">{error}</p>}

        <Link to="/premium" className="checkout-cancel-link">
          Torna ai piani
        </Link>
      </div>
    </div>
  );
}
