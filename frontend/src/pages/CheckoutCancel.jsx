import { Link } from 'react-router-dom';
import '../styles/premium.css';

export default function CheckoutCancel() {
  return (
    <div className="checkout-page">
      <div className="checkout-card ndl-panel">
        <p className="checkout-badge checkout-badge--muted">Pagamento annullato</p>
        <h1>Nessuna modifica al piano</h1>
        <p className="checkout-lead">
          Il checkout è stato interrotto. Il tuo piano attuale resta invariato.
        </p>
        <div className="checkout-actions">
          <Link to="/premium" className="ndl-btn ndl-btn--primary">
            Torna a NovaPromo PRO
          </Link>
          <Link to="/dashboard" className="ndl-btn ndl-btn--ghost">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
